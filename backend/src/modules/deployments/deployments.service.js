// backend/src/modules/deployments/deployments.service.js
const ApiError = require('../../utils/ApiError');
const deploymentsRepository = require('./deployments.repository');
const githubActionsService = require('../integrations/github/github.actions.service');

const ALLOWED_STATUSES = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'];
const ALLOWED_ENVIRONMENTS = ['development', 'staging', 'production', 'test', 'preview'];

// Regex patterns for secret redaction in log messages
const SECRET_PATTERNS = [
    /password\s*[:=]\s*\S+/gi,
    /secret\s*[:=]\s*\S+/gi,
    /token\s*[:=]\s*\S+/gi,
    /api[_-]?key\s*[:=]\s*\S+/gi,
    /private[_-]?key\s*[:=]\s*[\s\S]{0,500}/gi,
    /-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----/g,
    /Authorization:\s*Bearer\s+\S+/gi,
];

function redactSecrets(message) {
    if (!message || typeof message !== 'string') return message;
    let sanitized = message;
    for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
}

function formatDeployment(d) {
    return {
        id: d.id,
        projectId: d.project_id,
        project: d.projects
            ? {
                  id: d.projects.id,
                  name: d.projects.name,
                  slug: d.projects.slug,
                  githubRepoFullName: d.projects.github_repo_full_name,
              }
            : null,
        environment: d.environment,
        status: d.status,
        branch: d.branch,
        commitSha: d.commit_sha,
        repositoryUrl: d.repository_url,
        replicas: d.replicas,
        errorMessage: d.status === 'FAILED' ? d.error_message : null,
        startedAt: d.started_at,
        finishedAt: d.finished_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        createdBy: d.users
            ? { id: d.users.id, name: d.users.name, email: d.users.email }
            : null,
        ciJob: d.ci_jobs?.[0]
            ? {
                  id: d.ci_jobs[0].id,
                  provider: d.ci_jobs[0].provider,
                  jobName: d.ci_jobs[0].job_name,
                  externalJobId: d.ci_jobs[0].external_job_id,
                  status: d.ci_jobs[0].status,
                  url: d.ci_jobs[0].url,
              }
            : null,
        // Extract serviceUrl from the latest SUCCEEDED event metadata
        serviceUrl: (() => {
            const events = d.deployment_events || [];
            for (let i = events.length - 1; i >= 0; i--) {
                const meta = events[i].metadata;
                if (meta && typeof meta === 'object' && meta.serviceUrl) {
                    return meta.serviceUrl;
                }
            }
            return null;
        })(),
    };
}

/**
 * List deployments visible to the authenticated user, with pagination.
 */
async function listDeployments(user, query = {}) {
    const isAdmin = user.role === 'ADMIN';
    const page = Math.max(1, parseInt(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(query.per_page || query.limit) || 20));
    const skip = (page - 1) * perPage;

    const filter = {
        status: query.status && ALLOWED_STATUSES.includes(query.status.toUpperCase())
            ? query.status.toUpperCase()
            : undefined,
        environment: query.environment && ALLOWED_ENVIRONMENTS.includes(query.environment.toLowerCase())
            ? query.environment.toLowerCase()
            : undefined,
    };

    const [deployments, total] = await Promise.all([
        deploymentsRepository.listDeploymentsForUser(user.id, isAdmin, { skip, take: perPage, ...filter }),
        deploymentsRepository.countDeploymentsForUser(user.id, isAdmin, filter),
    ]);

    return {
        deployments: deployments.map(formatDeployment),
        pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
        },
    };
}

/**
 * Get a single deployment by ID.
 * Enforces project-level access authorization.
 */
async function getDeploymentById(deploymentId, user) {
    const deployment = await deploymentsRepository.findDeploymentById(deploymentId);

    if (!deployment) {
        throw new ApiError(404, 'Deployment not found');
    }

    // Authorization check
    const project = deployment.projects;
    const isAdmin = user.role === 'ADMIN';
    const isOwner = project.owner_user_id === user.id;
    const isMember = project.project_memberships?.some(
        (m) => m.user_id === user.id && m.status === 'ACTIVE'
    );

    if (!isAdmin && !isOwner && !isMember) {
        throw new ApiError(403, 'You do not have permission to view this deployment');
    }

    return {
        ...formatDeployment(deployment),
        steps: deployment.deployment_steps?.map((s) => ({
            id: s.id,
            order: s.step_order,
            name: s.step_name,
            status: s.status,
            startedAt: s.started_at,
            finishedAt: s.finished_at,
            exitCode: s.exit_code,
            errorMessage: s.error_message,
        })) || [],
        events: deployment.deployment_events?.map((e) => ({
            id: e.id,
            fromState: e.from_state,
            toState: e.to_state,
            stage: e.stage,
            message: e.message,
            createdAt: e.created_at,
        })) || [],
    };
}

/**
 * Get deployment logs, redacted of secrets.
 * Enforces project-level access authorization.
 */
async function getDeploymentLogs(deploymentId, user, query = {}) {
    // Verify the deployment exists and user has access
    const deployment = await deploymentsRepository.findDeploymentById(deploymentId);
    if (!deployment) throw new ApiError(404, 'Deployment not found');

    const project = deployment.projects;
    const isAdmin = user.role === 'ADMIN';
    const isOwner = project.owner_user_id === user.id;
    const isMember = project.project_memberships?.some(
        (m) => m.user_id === user.id && m.status === 'ACTIVE'
    );
    if (!isAdmin && !isOwner && !isMember) {
        throw new ApiError(403, 'You do not have permission to view logs for this deployment');
    }

    const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 200));
    let logs = await deploymentsRepository.getDeploymentLogs(deploymentId, {
        stepId: query.step_id || undefined,
        level: query.level || undefined,
        limit,
    });

    // If no logs stored in database, dynamically fetch from GitHub Actions or workflow runner
    if (logs.length === 0) {
        try {
            const ciJob = deployment.ci_jobs?.[0];
            let rawLogs = null;

            // Direct fetch if external_job_id contains numeric run ID
            if (ciJob?.external_job_id && /^\d+$/.test(ciJob.external_job_id)) {
                rawLogs = await githubActionsService.fetchWorkflowRunLogs(ciJob.external_job_id);
            }

            // Otherwise search recent runs for this deployment ID
            if (!rawLogs) {
                const found = await githubActionsService.findWorkflowRunForDeployment(
                    deploymentId,
                    deployment.created_at
                );
                if (found) {
                    rawLogs = found.rawLogs;
                }
            }

            if (rawLogs) {
                const parsed = githubActionsService.parseGitHubLogs(rawLogs);
                if (parsed.length > 0) {
                    await deploymentsRepository.saveDeploymentLogs(deploymentId, parsed);
                    logs = await deploymentsRepository.getDeploymentLogs(deploymentId, {
                        stepId: query.step_id || undefined,
                        level: query.level || undefined,
                        limit,
                    });
                }
            }
        } catch {
            // Non-blocking log fetch failure
        }
    }

    // Fallback: If still no logs, synthesize progressive logs from deployment events and steps
    if (logs.length === 0) {
        const synthetic = [];

        synthetic.push({
            id: `evt-start`,
            stepId: null,
            source: 'BACKEND',
            level: 'INFO',
            message: `[PIPE-01] Deployment #${deploymentId.substring(0, 8)} queued for environment: ${deployment.environment}`,
            loggedAt: deployment.created_at || new Date(),
        });

        if (deployment.deployment_events && deployment.deployment_events.length > 0) {
            for (const ev of deployment.deployment_events) {
                synthetic.push({
                    id: ev.id,
                    stepId: null,
                    source: 'BACKEND',
                    level: ev.to_state === 'FAILED' ? 'ERROR' : 'INFO',
                    message: `[${ev.stage || 'STAGE'}] ${ev.message}`,
                    loggedAt: ev.created_at,
                });
            }
        }

        if (deployment.deployment_steps && deployment.deployment_steps.length > 0) {
            for (const st of deployment.deployment_steps) {
                synthetic.push({
                    id: st.id,
                    stepId: st.id,
                    source: 'APPLICATION',
                    level: st.status === 'FAILED' ? 'ERROR' : 'INFO',
                    message: `Step ${st.step_order}: ${st.step_name} -> ${st.status}${st.error_message ? ` (${st.error_message})` : ''}`,
                    loggedAt: st.finished_at || st.started_at || new Date(),
                });
            }
        }

        if (synthetic.length > 0) {
            return {
                deploymentId,
                status: deployment.status,
                totalReturned: synthetic.length,
                truncated: false,
                logs: synthetic.map((s) => ({
                    id: s.id,
                    stepId: s.stepId,
                    source: s.source,
                    level: s.level,
                    message: redactSecrets(s.message),
                    loggedAt: s.loggedAt,
                })),
            };
        }
    }

    return {
        deploymentId,
        status: deployment.status,
        totalReturned: logs.length,
        truncated: logs.length >= limit,
        logs: logs.map((l) => ({
            id: l.id,
            stepId: l.step_id,
            source: l.source,
            level: l.level,
            message: redactSecrets(l.message),
            loggedAt: l.logged_at,
        })),
    };
}

/**
 * Handle a status update callback from GitHub Actions / CI worker.
 * Only accepts requests from internal sources (validated by middleware).
 */
async function updateDeploymentStatus(deploymentId, payload) {
    const { status, errorMessage, startedAt, finishedAt, runId, runUrl, serviceUrl } = payload;

    if (!status || !ALLOWED_STATUSES.includes(status.toUpperCase())) {
        throw new ApiError(400, `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`);
    }

    const result = await deploymentsRepository.updateDeploymentStatus(deploymentId, {
        status: status.toUpperCase(),
        errorMessage: errorMessage ? String(errorMessage).substring(0, 1000) : undefined,
        startedAt,
        finishedAt,
        runId,
        runUrl,
        serviceUrl: serviceUrl ? String(serviceUrl).substring(0, 500) : undefined,
    });

    if (!result) throw new ApiError(404, 'Deployment not found');
    if (result.skipped) {
        return { deployment: result.deployment, message: 'Status update skipped (deployment already in terminal state)' };
    }

    return { deployment: result.deployment, message: `Deployment status updated to ${status.toUpperCase()}` };
}

module.exports = {
    listDeployments,
    getDeploymentById,
    getDeploymentLogs,
    updateDeploymentStatus,
};

