// backend/src/modules/integrations/github/github.actions.service.js
// Service for dispatching and tracking CI/CD pipelines via GitHub Actions
require('dotenv').config();

class GitHubActionsIntegrationError extends Error {
    constructor(message, originalError = null, statusCode = 502, isTimeout = false) {
        super(message);
        this.name = 'GitHubActionsIntegrationError';
        this.originalError = originalError;
        this.statusCode = statusCode;
        this.isTimeout = isTimeout;
    }
}

/**
 * Sanitizes and truncates external CI server error strings.
 * Ensures HTML error pages, stack traces, and internal server paths are never exposed.
 * Enforces a maximum length of 250 characters.
 */
function sanitizeErrorMessage(rawText, maxLength = 250) {
    if (!rawText || typeof rawText !== 'string') {
        return 'Unknown CI pipeline error';
    }

    let sanitized = rawText.replace(/<[^>]*>/g, ' ');
    sanitized = sanitized.replace(
        /(?:bearer|basic|token|password|secret|authorization)[:=\s]+[^\s,;&]+/gi,
        '[REDACTED]'
    );
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    if (!sanitized) {
        return 'CI service returned empty error response';
    }

    if (sanitized.length > maxLength) {
        return `${sanitized.substring(0, maxLength - 3)}...`;
    }

    return sanitized;
}

/**
 * Normalizes a workflow path or name.
 */
function formatJobUrlPath(jobName) {
    return (jobName || 'deploy.yml').replace(/^\/+/, '');
}

/**
 * Builds the agreed deployment job contract for GitHub Actions / CI worker.
 */
function buildDeploymentContract({
    project,
    deployment,
    branch,
    commitSha,
    environment,
    dockerfilePath,
    replicas,
    correlationId,
    user,
}) {
    const repoFullName = project.github_repo_full_name || '';
    const repoOwner =
        project.github_repo_owner || (repoFullName ? repoFullName.split('/')[0] : '');
    const repoUrl =
        project.repository_url ||
        (repoFullName ? `https://github.com/${repoFullName}.git` : '');

    return {
        contractVersion: '1.0.0',
        correlationId: correlationId || `corr-${deployment.id}-${Date.now()}`,
        projectId: project.id,
        deploymentId: deployment.id,
        repository: {
            id: project.github_repo_id || null,
            fullName: repoFullName,
            owner: repoOwner,
            url: repoUrl,
        },
        git: {
            branch,
            commitSha,
        },
        targetEnvironment: environment,
        build: {
            dockerfilePath: dockerfilePath || 'Dockerfile',
            replicas: replicas || 1,
        },
        target: {
            platform: 'Kubernetes',
            provider: 'AWS_EKS',
            namespace: `app-${environment}`,
            cluster: 'k8s-cluster',
        },
        callbackUrl: `${(process.env.BACKEND_INTERNAL_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'))}/api/deployments/${deployment.id}/status`,
        triggeredBy: {
            userId: user.id,
            userRole: user.role,
        },
        timestamp: new Date().toISOString(),
    };
}

/**
 * Triggers a GitHub Actions workflow via the GitHub REST API (workflow_dispatch).
 */
async function triggerDeploymentJob(contractPayload, userToken = null) {
    const integrationMode = process.env.CI_INTEGRATION_MODE || 'direct';

    // The repository hosting the deploy.yml workflow
    const workflowRepo =
        process.env.GITHUB_ACTIONS_REPO ||
        process.env.GITHUB_REPOSITORY ||
        'Mostafa-Zhran/Intelligent-Infrastructure-Automation-Platform';

    const [owner, repo] = workflowRepo.split('/');
    const workflowFile = process.env.GITHUB_WORKFLOW_FILE || 'deploy.yml';
    const workflowRef = process.env.GITHUB_WORKFLOW_REF || 'main';
    const actionsUrl = `https://github.com/${owner}/${repo}/actions`;

    if (integrationMode === 'mock') {
        return {
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: `gha-mock-${Date.now()}`,
            queueItemUrl: actionsUrl,
            status: 'QUEUED',
        };
    }

    const token = userToken || process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET;
    if (!token) {
        throw new GitHubActionsIntegrationError(
            'Missing GitHub authentication token for workflow dispatch',
            null,
            401
        );
    }

    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;
    const payload = {
        ref: workflowRef,
        inputs: {
            project_id: String(contractPayload.projectId),
            deployment_id: String(contractPayload.deploymentId),
            repo_url: String(contractPayload.repository.url || ''),
            repo_full_name: String(contractPayload.repository?.fullName || ''),
            branch: String(contractPayload.git.branch || 'main'),
            commit_sha: String(contractPayload.git.commitSha || ''),
            environment: String(contractPayload.targetEnvironment || 'development'),
            dockerfile_path: String(contractPayload.build.dockerfilePath || 'Dockerfile'),
            replicas: String(contractPayload.build.replicas || 1),
            correlation_id: String(contractPayload.correlationId || ''),
            callback_url: String(contractPayload.callbackUrl || ''),
        },
    };

    let response;
    const timeoutMs = Number(process.env.CI_TIMEOUT_MS || 10000);

    try {
        response = await fetch(dispatchUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            throw new GitHubActionsIntegrationError(
                `GitHub Actions dispatch timed out after ${timeoutMs}ms`,
                err,
                504,
                true
            );
        }
        throw new GitHubActionsIntegrationError(
            `Network error connecting to GitHub API: ${err.message}`,
            err,
            502,
            false
        );
    }

    if (response.status !== 204) {
        const errorText = await response.text();
        throw new GitHubActionsIntegrationError(
            `GitHub Actions dispatch failed (HTTP ${response.status}): ${sanitizeErrorMessage(errorText)}`,
            null,
            response.status >= 500 ? 502 : 400,
            false
        );
    }

    return {
        success: true,
        provider: 'GITHUB_ACTIONS',
        jobId: `gha-${contractPayload.deploymentId}`,
        queueItemUrl: actionsUrl,
        status: 'QUEUED',
    };
}

module.exports = {
    GitHubActionsIntegrationError,
    sanitizeErrorMessage,
    formatJobUrlPath,
    buildDeploymentContract,
    triggerDeploymentJob,
};
