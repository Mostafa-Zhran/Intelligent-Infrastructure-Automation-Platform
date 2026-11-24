// backend/src/modules/deployments/deployments.repository.js
const prisma = require('../../db/prisma');

const SAFE_LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
const SAFE_SOURCES = ['TERRAFORM', 'ANSIBLE', 'JENKINS', 'DOCKER', 'KUBERNETES', 'APPLICATION', 'BACKEND', 'OTHER'];
const MAX_LOG_LINES = 500;

/**
 * List all deployments visible to a user.
 * - Platform ADMIN sees all deployments.
 * - Regular users see deployments for projects they own or are active members of.
 */
async function listDeploymentsForUser(userId, isAdmin, { skip = 0, take = 20, status, environment } = {}) {
    const where = {};

    if (!isAdmin) {
        where.projects = {
            OR: [
                { owner_user_id: userId },
                {
                    project_memberships: {
                        some: { user_id: userId, status: 'ACTIVE' },
                    },
                },
            ],
        };
    }

    if (status) where.status = status;
    if (environment) where.environment = environment;

    return prisma.deployments.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip,
        take,
        include: {
            projects: {
                select: { id: true, name: true, slug: true, github_repo_full_name: true },
            },
            users: {
                select: { id: true, name: true, email: true },
            },
            ci_jobs: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                    id: true,
                    provider: true,
                    job_name: true,
                    external_job_id: true,
                    status: true,
                    url: true,
                },
            },
            deployment_events: {
                where: { stage: 'STATUS_UPDATE' },
                orderBy: { created_at: 'desc' },
                take: 2,
                select: {
                    metadata: true,
                },
            },
        },
    });
}

async function countDeploymentsForUser(userId, isAdmin, { status, environment } = {}) {
    const where = {};
    if (!isAdmin) {
        where.projects = {
            OR: [
                { owner_user_id: userId },
                {
                    project_memberships: {
                        some: { user_id: userId, status: 'ACTIVE' },
                    },
                },
            ],
        };
    }
    if (status) where.status = status;
    if (environment) where.environment = environment;

    return prisma.deployments.count({ where });
}

/**
 * Find a single deployment by ID, including project info.
 */
async function findDeploymentById(deploymentId) {
    return prisma.deployments.findUnique({
        where: { id: deploymentId },
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    owner_user_id: true,
                    github_repo_full_name: true,
                    repository_url: true,
                    project_memberships: {
                        select: {
                            user_id: true,
                            status: true,
                        },
                    },
                },
            },
            users: {
                select: { id: true, name: true, email: true },
            },
            ci_jobs: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                    id: true,
                    provider: true,
                    job_name: true,
                    external_job_id: true,
                    status: true,
                    url: true,
                    created_at: true,
                    updated_at: true,
                },
            },
            deployment_steps: {
                orderBy: { step_order: 'asc' },
                select: {
                    id: true,
                    step_order: true,
                    step_name: true,
                    status: true,
                    started_at: true,
                    finished_at: true,
                    exit_code: true,
                    error_message: true,
                },
            },
            deployment_events: {
                orderBy: { created_at: 'asc' },
                take: 50,
                select: {
                    id: true,
                    from_state: true,
                    to_state: true,
                    stage: true,
                    message: true,
                    metadata: true,
                    created_at: true,
                },
            },
        },
    });
}

/**
 * Fetch sanitized logs for a deployment.
 * Redacts secrets from log messages.
 */
async function getDeploymentLogs(deploymentId, { stepId, level, limit = 200 } = {}) {
    const take = Math.min(limit, MAX_LOG_LINES);
    const where = { deployment_id: deploymentId };
    if (stepId) where.step_id = stepId;
    if (level && SAFE_LOG_LEVELS.includes(level.toUpperCase())) {
        where.level = level.toUpperCase();
    }

    return prisma.deployment_logs.findMany({
        where,
        orderBy: { logged_at: 'asc' },
        take,
        select: {
            id: true,
            step_id: true,
            source: true,
            level: true,
            message: true,
            logged_at: true,
        },
    });
}

/**
 * Persist parsed execution logs into the database in chunks.
 */
async function saveDeploymentLogs(deploymentId, logLines = []) {
    if (!logLines || logLines.length === 0) return [];

    const batchSize = 100;
    for (let i = 0; i < logLines.length; i += batchSize) {
        const chunk = logLines.slice(i, i + batchSize).map((l) => ({
            deployment_id: deploymentId,
            step_id: l.step_id || null,
            source: SAFE_SOURCES.includes(String(l.source).toUpperCase()) ? String(l.source).toUpperCase() : 'OTHER',
            level: SAFE_LOG_LEVELS.includes(String(l.level).toUpperCase()) ? String(l.level).toUpperCase() : 'INFO',
            message: l.message,
            logged_at: l.logged_at ? new Date(l.logged_at) : new Date(),
        }));

        try {
            await prisma.deployment_logs.createMany({
                data: chunk,
                skipDuplicates: true,
            });
        } catch {
            // Non-blocking if duplicates or batch fails
        }
    }

    return getDeploymentLogs(deploymentId);
}

/**
 * Update deployment status (called by GitHub Actions / CI worker callback).
 * Validates state transitions and prevents stale updates.
 */
async function updateDeploymentStatus(deploymentId, { status, errorMessage, startedAt, finishedAt, runId, runUrl, serviceUrl }) {
    const now = new Date();

    const existing = await prisma.deployments.findUnique({
        where: { id: deploymentId },
        select: { id: true, status: true },
    });

    if (!existing) return null;

    // Prevent overwriting a terminal state
    const terminalStates = ['SUCCEEDED', 'FAILED', 'CANCELLED'];
    if (terminalStates.includes(existing.status) && existing.status !== status) {
        return { deployment: existing, skipped: true };
    }

    const updateData = {
        status,
        updated_at: now,
    };
    if (errorMessage !== undefined) updateData.error_message = errorMessage;
    if (startedAt) updateData.started_at = new Date(startedAt);
    if (finishedAt) updateData.finished_at = new Date(finishedAt);

    const deployment = await prisma.deployments.update({
        where: { id: deploymentId },
        data: updateData,
    });

    // Update CI Job external_job_id and url if runId or runUrl provided
    if (runId || runUrl) {
        try {
            await prisma.ci_jobs.updateMany({
                where: { deployment_id: deploymentId },
                data: {
                    status: status === 'RUNNING' ? 'RUNNING' : status === 'SUCCEEDED' ? 'SUCCESS' : 'FAILURE',
                    ...(runId ? { external_job_id: String(runId) } : {}),
                    ...(runUrl ? { url: String(runUrl) } : {}),
                    updated_at: now,
                },
            });
        } catch {
            // Non-blocking
        }
    }

    // Record the state-change event
    try {
        await prisma.deployment_events.create({
            data: {
                deployment_id: deploymentId,
                from_state: existing.status,
                to_state: status,
                stage: 'STATUS_UPDATE',
                message: `Deployment status updated from ${existing.status} to ${status}`,
                metadata: {
                    source: 'worker_callback',
                    timestamp: now.toISOString(),
                    ...(runId ? { runId: String(runId) } : {}),
                    ...(serviceUrl ? { serviceUrl: String(serviceUrl) } : {}),
                    ...(errorMessage ? { error: errorMessage } : {}),
                },
            },
        });
    } catch {
        // Non-blocking event logging
    }

    return { deployment, skipped: false };
}

module.exports = {
    listDeploymentsForUser,
    countDeploymentsForUser,
    findDeploymentById,
    getDeploymentLogs,
    saveDeploymentLogs,
    updateDeploymentStatus,
};

