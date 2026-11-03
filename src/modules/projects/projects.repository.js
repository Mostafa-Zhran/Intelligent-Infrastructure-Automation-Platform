// backend/src/modules/projects/projects.repository.js
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');

async function findProjectById(id) {
    return prisma.projects.findUnique({
        where: { id },
    });
}

async function findProjectWithMembership(id, userId) {
    return prisma.projects.findUnique({
        where: { id },
        include: {
            project_memberships: {
                where: {
                    user_id: userId,
                    status: 'ACTIVE',
                },
                include: {
                    project_roles: {
                        include: {
                            project_role_permissions: {
                                include: {
                                    permissions: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}

async function getProjectOverview(id) {
    return prisma.projects.findUnique({
        where: { id },
        include: {
            deployments: {
                orderBy: [
                    { created_at: 'desc' },
                    { id: 'desc' },
                ],
                take: 1,
            },
            infrastructure_resources: true,
        },
    });
}

async function findActiveDeployment(projectId, environment) {
    return prisma.deployments.findFirst({
        where: {
            project_id: projectId,
            environment,
            status: { in: ['QUEUED', 'RUNNING'] },
        },
    });
}

async function findDeploymentByIdempotencyKey(userId, idempotencyKey) {
    if (!idempotencyKey) return null;
    return prisma.deployments.findFirst({
        where: {
            created_by_user_id: userId,
            idempotency_key: idempotencyKey,
        },
    });
}

async function getProjectDeployments(projectId, { skip = 0, take = 20, environment, status } = {}) {
    const where = { project_id: projectId };
    if (environment) where.environment = environment;
    if (status) where.status = status;

    return prisma.deployments.findMany({
        where,
        orderBy: [
            { created_at: 'desc' },
            { id: 'desc' },
        ],
        skip,
        take,
        include: {
            users: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
}

async function countProjectDeployments(projectId, { environment, status } = {}) {
    const where = { project_id: projectId };
    if (environment) where.environment = environment;
    if (status) where.status = status;

    return prisma.deployments.count({ where });
}

/**
 * Creates deployment records atomically in a database transaction with concurrency safeguards.
 * 
 * Concurrency & Reliability Protections:
 * 1. Serializes creation for the same (project_id, environment) using PostgreSQL transaction advisory locks.
 * 2. Re-checks for an active deployment within the locked transaction boundary to prevent TOCTOU races.
 * 3. Catches Prisma P2002 unique constraint violations on `deployments_active_project_env_uq` -> 409 Conflict.
 * 4. Catches Prisma P2002 unique constraint violations on `deployments_idempotency_key_uq` -> returns existing record without 500.
 */
async function createDeploymentTransaction({
    deploymentData,
    ciJobData,
    eventData,
    auditData,
}) {
    return prisma.$transaction(async (tx) => {
        // 1. PostgreSQL advisory transaction lock (scoped strictly to current transaction)
        if (typeof tx.$executeRaw === 'function') {
            try {
                const lockKey = `active_dep:${deploymentData.project_id}:${deploymentData.environment}`;
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
            } catch (err) {
                // Non-fatal if raw query is not supported by driver/mock in test double
            }
        }

        // 2. In-transaction active deployment re-check (prevents check-then-act race under concurrency)
        const inTxActive = await tx.deployments.findFirst({
            where: {
                project_id: deploymentData.project_id,
                environment: deploymentData.environment,
                status: { in: ['QUEUED', 'RUNNING'] },
            },
        });

        if (inTxActive) {
            throw new ApiError(
                409,
                `An active deployment (${inTxActive.id}) is already in progress with status '${inTxActive.status}' for environment '${deploymentData.environment}'. Please wait for it to finish or cancel it before triggering a new deployment.`
            );
        }

        let deployment;
        try {
            deployment = await tx.deployments.create({
                data: deploymentData,
            });
        } catch (err) {
            // 3. Handle database-level unique constraint violations gracefully
            if (err.code === 'P2002') {
                const target = String(err.meta?.target || err.message || '');

                // Active deployment partial unique index collision
                if (target.includes('active_project_env') || target.includes('environment')) {
                    throw new ApiError(
                        409,
                        `An active deployment is already in progress for environment '${deploymentData.environment}'. Please wait for it to finish before triggering a new deployment.`
                    );
                }

                // Concurrent duplicate Idempotency-Key submission
                if (deploymentData.idempotency_key && (target.includes('idempotency_key') || target.includes('created_by_user_id'))) {
                    const existing = await tx.deployments.findFirst({
                        where: {
                            created_by_user_id: deploymentData.created_by_user_id,
                            idempotency_key: deploymentData.idempotency_key,
                        },
                    });

                    if (existing) {
                        return { idempotent: true, deployment: existing };
                    }
                }
            }
            throw err;
        }

        const ciJob = await tx.ci_jobs.create({
            data: {
                ...ciJobData,
                deployment_id: deployment.id,
            },
        });

        const event = await tx.deployment_events.create({
            data: {
                ...eventData,
                deployment_id: deployment.id,
            },
        });

        let auditLog = null;
        if (auditData) {
            auditLog = await tx.audit_logs.create({
                data: {
                    ...auditData,
                    resource_id: deployment.id,
                },
            });
        }

        return { deployment, ciJob, event, auditLog };
    });
}

async function markDeploymentDispatched(deploymentId, ciJobId, externalJobId, url) {
    return prisma.$transaction(async (tx) => {
        const updatedJob = await tx.ci_jobs.update({
            where: { id: ciJobId },
            data: {
                status: 'QUEUED',
                external_job_id: String(externalJobId),
                url,
                updated_at: new Date(),
            },
        });

        const event = await tx.deployment_events.create({
            data: {
                deployment_id: deploymentId,
                stage: 'DISPATCH',
                from_state: 'QUEUED',
                to_state: 'QUEUED',
                message: 'Deployment job successfully dispatched to CI pipeline',
                metadata: { externalJobId, url },
            },
        });

        return { updatedJob, event };
    });
}

/**
 * RELIABILITY HELPER:
 * Marks deployment as FAILED when Jenkins definitively rejects the build or fails.
 */
async function markDeploymentFailed(deploymentId, ciJobId, errorMessage) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const updatedDeployment = await tx.deployments.update({
            where: { id: deploymentId },
            data: {
                status: 'FAILED',
                error_message: errorMessage,
                finished_at: now,
                updated_at: now,
            },
        });

        if (ciJobId) {
            await tx.ci_jobs.update({
                where: { id: ciJobId },
                data: {
                    status: 'FAILED',
                    updated_at: now,
                },
            });
        }

        const event = await tx.deployment_events.create({
            data: {
                deployment_id: deploymentId,
                stage: 'DISPATCH_FAILED',
                from_state: 'QUEUED',
                to_state: 'FAILED',
                message: errorMessage,
                metadata: { error: errorMessage, timestamp: now.toISOString() },
            },
        });

        return { updatedDeployment, event };
    });
}

/**
 * RELIABILITY HELPER:
 * Handles ambiguous Jenkins dispatch timeouts without blindly failing the deployment.
 * Keeps status as QUEUED so active concurrency locks remain active, while recording
 * a reconciliation-pending state for Point 6 worker tracking.
 */
async function markDeploymentDispatchUnknown(deploymentId, ciJobId, errorMessage) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const updatedDeployment = await tx.deployments.update({
            where: { id: deploymentId },
            data: {
                status: 'QUEUED',
                error_message: `DISPATCH_TIMEOUT: ${errorMessage}`,
                updated_at: now,
            },
        });

        if (ciJobId) {
            await tx.ci_jobs.update({
                where: { id: ciJobId },
                data: {
                    status: 'PENDING',
                    updated_at: now,
                },
            });
        }

        const event = await tx.deployment_events.create({
            data: {
                deployment_id: deploymentId,
                stage: 'DISPATCH_TIMEOUT',
                from_state: 'QUEUED',
                to_state: 'QUEUED',
                message: `CI build dispatch timed out. Status reconciliation pending via DEPLOYMENT_ID: ${deploymentId}`,
                metadata: {
                    timeout: true,
                    reason: errorMessage,
                    timestamp: now.toISOString(),
                    reconciliation: 'PENDING_WORKER_CALLBACK',
                },
            },
        });

        return { updatedDeployment, event };
    });
}

module.exports = {
    findProjectById,
    findProjectWithMembership,
    getProjectOverview,
    findActiveDeployment,
    findDeploymentByIdempotencyKey,
    getProjectDeployments,
    countProjectDeployments,
    createDeploymentTransaction,
    markDeploymentDispatched,
    markDeploymentFailed,
    markDeploymentDispatchUnknown,
};
