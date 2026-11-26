// backend/src/modules/deployments/runtime.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const projectsService = require('../projects/projects.service');
const runtimeService = require('./runtime.service');

/**
 * GET /api/projects/:projectId/runtime/logs?tail=200
 */
const getContainerLogs = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const tail = Math.min(Math.max(Number(req.query.tail) || 200, 1), 1000);
    const role = req.user.role || req.user.platform_role;

    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'view');

    const result = await runtimeService.getContainerLogs(projectId, { tail });
    res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/projects/:projectId/runtime/restart
 */
const restartContainer = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'deploy');

    const result = await runtimeService.restartContainer(projectId);
    res.status(200).json({ success: true, data: result });
});

/**
 * GET /api/projects/:projectId/runtime/status
 */
const getContainerStatus = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const role = req.user.role || req.user.platform_role;
    await projectsService.verifyProjectAccess(projectId, req.user.id, role, 'view');

    const result = await runtimeService.getContainerStatus(projectId);
    res.status(200).json({ success: true, data: result });
});

module.exports = { getContainerLogs, restartContainer, getContainerStatus };
