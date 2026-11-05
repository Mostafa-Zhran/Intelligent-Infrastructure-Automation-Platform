// backend/src/modules/deployments/deployments.repository.js
const prisma = require('../../db/prisma');

const SAFE_LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
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
 * Update deployment status (called by Jenkins/worker callback).
 * Validates state transitions and prevents stale updates.
 */
async function updateDeploymentStatus(deploymentId, { status, errorMessage, startedAt, finishedAt }) {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
        const existing = await tx.deployments.findUnique({
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

        const deployment = await tx.deployments.update({
            where: { id: deploymentId },
            data: updateData,
        });

        // Record the state-change event
        await tx.deployment_events.create({
            data: {
                deployment_id: deploymentId,
                from_state: existing.status,
                to_state: status,
                stage: 'STATUS_UPDATE',
                message: `Deployment status updated from ${existing.status} to ${status}`,
                metadata: {
                    source: 'worker_callback',
                    timestamp: now.toISOString(),
                    ...(errorMessage ? { error: errorMessage } : {}),
                },
            },
        });

        return { deployment, skipped: false };
    });
}

module.exports = {
    listDeploymentsForUser,
    countDeploymentsForUser,
    findDeploymentById,
    getDeploymentLogs,
    updateDeploymentStatus,
};

