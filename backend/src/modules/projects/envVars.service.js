// backend/src/modules/projects/envVars.service.js
// Business logic for encrypted project environment variables.
const ApiError = require('../../utils/ApiError');
const { encryptSecret, decryptSecret } = require('../../utils/crypto.service');
const envVarsRepository = require('./envVars.repository');

// ─── ENV key validation ───────────────────────────────────────────────────────

const ENV_KEY_REGEX = /^[A-Z_][A-Z0-9_]{0,127}$/;

function validateKey(key) {
    if (!ENV_KEY_REGEX.test(key)) {
        throw new ApiError(
            400,
            `Invalid env var key "${key}". Must match ^[A-Z_][A-Z0-9_]{0,127}$`
        );
    }
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Save (upsert) an environment variable for a project.
 * Value is encrypted before storage using AES-256-GCM.
 */
async function saveEnvVar(projectId, { key, value, isSecret = true }) {
    validateKey(key);
    if (typeof value !== 'string' || value.length === 0) {
        throw new ApiError(400, 'Env var value must be a non-empty string');
    }
    if (value.length > 32768) {
        throw new ApiError(400, 'Env var value must be ≤ 32 768 characters');
    }

    const { ciphertext, iv, tag } = encryptSecret(value);
    await envVarsRepository.upsertEnvVar(projectId, { key, ciphertext, iv, tag, isSecret });

    return { key, isSecret, saved: true };
}

/**
 * Bulk-save multiple env vars in one call.
 * Returns an array of results, one per key.
 */
async function saveEnvVarsBulk(projectId, vars) {
    if (!Array.isArray(vars) || vars.length === 0) {
        throw new ApiError(400, 'vars must be a non-empty array');
    }
    if (vars.length > 100) {
        throw new ApiError(400, 'Maximum 100 env vars per bulk save');
    }

    const results = [];
    for (const { key, value, isSecret } of vars) {
        try {
            validateKey(key);
        } catch (err) {
            results.push({ key, saved: false, error: err.message });
            continue;
        }
        const { ciphertext, iv, tag } = encryptSecret(String(value ?? ''));
        await envVarsRepository.upsertEnvVar(projectId, {
            key,
            ciphertext,
            iv,
            tag,
            isSecret: isSecret ?? true,
        });
        results.push({ key, isSecret: isSecret ?? true, saved: true });
    }
    return results;
}

/**
 * Returns sanitized list of env vars (keys + metadata, no values).
 */
async function listEnvVars(projectId) {
    return envVarsRepository.findAllByProject(projectId);
}

/**
 * Deletes a single env var by key.
 */
async function deleteEnvVar(projectId, key) {
    validateKey(key);
    const result = await envVarsRepository.deleteEnvVar(projectId, key);
    if (result.count === 0) {
        throw new ApiError(404, `Env var "${key}" not found for this project`);
    }
    return { key, deleted: true };
}

/**
 * Returns decrypted env vars as a plain key→value map.
 * Used by deployment orchestrators at runtime — NEVER returned to API callers.
 */
async function getDecryptedEnvMap(projectId) {
    const rows = await envVarsRepository.findAllWithSecrets(projectId);
    const map = {};
    for (const row of rows) {
        try {
            map[row.key] = decryptSecret(row);
        } catch (err) {
            console.error(`[EnvVars] Failed to decrypt "${row.key}" for project ${projectId}: ${err.message}`);
        }
    }
    return map;
}

module.exports = {
    saveEnvVar,
    saveEnvVarsBulk,
    listEnvVars,
    deleteEnvVar,
    getDecryptedEnvMap,
};
