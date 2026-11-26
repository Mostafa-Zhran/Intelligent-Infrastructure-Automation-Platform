// backend/src/modules/projects/envVars.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const projectsService = require('./projects.service');
const envVarsService = require('./envVars.service');

/**
 * GET /api/projects/:projectId/env-vars
 * Returns sanitized list of env var keys (no values).
 */
const listEnvVars = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'view');

    const vars = await envVarsService.listEnvVars(projectId);
    res.status(200).json({ success: true, data: { vars } });
});

/**
 * POST /api/projects/:projectId/env-vars
 * Save a single env var (upsert).
 * Body: { key, value, isSecret? }
 */
const saveEnvVar = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'deploy');

    const { key, value, isSecret } = req.body;
    const result = await envVarsService.saveEnvVar(projectId, { key, value, isSecret });
    res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/projects/:projectId/env-vars/bulk
 * Save multiple env vars at once.
 * Body: { vars: [{ key, value, isSecret? }, ...] }
 */
const saveEnvVarsBulk = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'deploy');

    const { vars } = req.body;
    const results = await envVarsService.saveEnvVarsBulk(projectId, vars);
    res.status(200).json({ success: true, data: { results } });
});

/**
 * DELETE /api/projects/:projectId/env-vars/:key
 * Delete a single env var by key.
 */
const deleteEnvVar = asyncHandler(async (req, res) => {
    const { projectId, key } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'deploy');

    const result = await envVarsService.deleteEnvVar(projectId, key.toUpperCase());
    res.status(200).json({ success: true, data: result });
});

module.exports = { listEnvVars, saveEnvVar, saveEnvVarsBulk, deleteEnvVar };
