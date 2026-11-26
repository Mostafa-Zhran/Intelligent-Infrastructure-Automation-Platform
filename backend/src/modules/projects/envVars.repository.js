// backend/src/modules/projects/envVars.repository.js
// CRUD for project_env_vars table.
const prisma = require('../../db/prisma');

/**
 * Upsert (create or replace) a single env var for a project.
 * The encrypted fields are provided by the service layer.
 */
async function upsertEnvVar(projectId, { key, ciphertext, iv, tag, isSecret }) {
    return prisma.project_env_vars.upsert({
        where: { project_id_key: { project_id: projectId, key } },
        create: {
            project_id: projectId,
            key,
            ciphertext,
            iv,
            tag,
            is_secret: isSecret ?? true,
        },
        update: {
            ciphertext,
            iv,
            tag,
            is_secret: isSecret ?? true,
            updated_at: new Date(),
        },
    });
}

/**
 * Returns all env vars for a project (without decrypted values).
 */
async function findAllByProject(projectId) {
    return prisma.project_env_vars.findMany({
        where: { project_id: projectId },
        orderBy: { key: 'asc' },
        select: {
            id: true,
            key: true,
            is_secret: true,
            created_at: true,
            updated_at: true,
            // ciphertext / iv / tag are intentionally excluded from list
        },
    });
}

/**
 * Returns all env vars with their encrypted payloads (for deployment execution).
 */
async function findAllWithSecrets(projectId) {
    return prisma.project_env_vars.findMany({
        where: { project_id: projectId },
        orderBy: { key: 'asc' },
    });
}

/**
 * Deletes a single env var by key.
 */
async function deleteEnvVar(projectId, key) {
    return prisma.project_env_vars.deleteMany({
        where: { project_id: projectId, key },
    });
}

/**
 * Bulk-delete all env vars for a project (used when deleting project).
 */
async function deleteAllForProject(projectId) {
    return prisma.project_env_vars.deleteMany({
        where: { project_id: projectId },
    });
}

module.exports = {
    upsertEnvVar,
    findAllByProject,
    findAllWithSecrets,
    deleteEnvVar,
    deleteAllForProject,
};
