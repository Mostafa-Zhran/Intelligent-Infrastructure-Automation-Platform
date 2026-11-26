// backend/src/modules/integrations/github/github.webhook.service.js
// Handles incoming GitHub webhook events and triggers auto-deployments.
const crypto = require('crypto');
const prisma = require('../../../db/prisma');

/**
 * Verifies GitHub HMAC-SHA256 webhook signature.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifySignature(rawBody, signature, secret) {
    if (!signature || !secret) return false;
    const expected = `sha256=${crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')}`;
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    } catch {
        return false;
    }
}

/**
 * Finds all projects linked to the given GitHub repository ID
 * that have READY setup status.
 */
async function findProjectsForRepo(repoId) {
    return prisma.projects.findMany({
        where: {
            github_repo_id: String(repoId),
            setup_status: 'READY',
        },
        select: {
            id: true,
            name: true,
            owner_user_id: true,
            repository_branch: true,
            default_environment: true,
        },
    });
}

/**
 * Processes a GitHub `push` event webhook payload.
 * Triggers deployment for each matching project if the pushed branch
 * matches the project's configured branch.
 *
 * Returns an array of { projectId, status, deploymentId? } results.
 */
async function handlePushEvent(payload) {
    const { repository, ref, after: commitSha, sender } = payload || {};

    if (!repository?.id || !ref || !commitSha) {
        console.warn('[Webhook] push event missing required fields');
        return [];
    }

    // Extract branch name from ref (refs/heads/main -> main)
    const pushedBranch = ref.replace(/^refs\/heads\//, '');

    console.info(
        `[Webhook] push -> repo=${repository.full_name} branch=${pushedBranch} sha=${commitSha.slice(0, 8)} by=${sender?.login}`
    );

    const projects = await findProjectsForRepo(repository.id);
    if (!projects.length) {
        console.info(`[Webhook] No READY projects found for repo ${repository.id}`);
        return [];
    }

    const results = [];

    for (const project of projects) {
        const targetBranch = project.repository_branch || 'main';
        if (pushedBranch !== targetBranch) {
            console.info(
                `[Webhook] Skipping project ${project.id}: pushed branch "${pushedBranch}" != project branch "${targetBranch}"`
            );
            results.push({ projectId: project.id, status: 'skipped', reason: 'branch_mismatch' });
            continue;
        }

        try {
            // Lazy require to avoid circular dependency
            const projectsService = require('../../projects/projects.service');

            const webhookActor = {
                id: project.owner_user_id,
                role: 'USER',
                platform_role: 'USER',
            };

            const result = await projectsService.submitDeploymentRequest(
                project.id,
                webhookActor,
                {
                    branch: pushedBranch,
                    commitSha: commitSha.slice(0, 40),
                    environment: project.default_environment || 'production',
                }
            );

            console.info(
                `[Webhook] Auto-deploy triggered for project ${project.id} -> deployment ${result.deploymentId}`
            );
            results.push({ projectId: project.id, status: 'triggered', deploymentId: result.deploymentId });
        } catch (err) {
            console.error(
                `[Webhook] Auto-deploy failed for project ${project.id}: ${err.message}`
            );
            results.push({ projectId: project.id, status: 'error', error: err.message });
        }
    }

    return results;
}

module.exports = { verifySignature, handlePushEvent };
