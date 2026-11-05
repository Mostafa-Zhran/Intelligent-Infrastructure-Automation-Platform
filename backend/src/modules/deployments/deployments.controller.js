// backend/src/modules/deployments/deployments.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const deploymentsService = require('./deployments.service');

/**
 * GET /api/deployments
 * List all deployments visible to the authenticated user.
 */
const listDeployments = asyncHandler(async (req, res) => {
    const result = await deploymentsService.listDeployments(req.user, req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * GET /api/deployments/:deploymentId
 * Get full details of a single deployment.
 */
const getDeploymentById = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const deployment = await deploymentsService.getDeploymentById(deploymentId, req.user);

    res.status(200).json({
        success: true,
        data: { deployment },
    });
});

/**
 * GET /api/deployments/:deploymentId/logs
 * Get redacted logs for a deployment.
 */
const getDeploymentLogs = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const result = await deploymentsService.getDeploymentLogs(deploymentId, req.user, req.query);

    res.status(200).json({
        success: true,
        data: result,
    });
});

/**
 * POST /api/deployments/:deploymentId/status
 * Receive a status update callback from Jenkins/worker.
 * Protected by worker API key — NOT by user JWT.
 */
const updateDeploymentStatus = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const result = await deploymentsService.updateDeploymentStatus(deploymentId, req.body);

    res.status(200).json({
        success: true,
        message: result.message,
        data: {
            deploymentId,
            status: result.deployment.status,
            updatedAt: result.deployment.updated_at,
        },
    });
});

module.exports = {
    listDeployments,
    getDeploymentById,
    getDeploymentLogs,
    updateDeploymentStatus,
};

