// backend/src/modules/deployments/deployments.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const deploymentsService = require('./deployments.service');
const deploymentsRepository = require('./deployments.repository');
const ec2Orchestrator = require('./ec2-deployment.orchestrator');

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
 * Receive a status update callback from GitHub Actions / CI worker.
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

/**
 * GET /api/deployments/:deploymentId/stream-logs
 * SAAS-06 — Server-Sent Events (SSE) live log stream for active deployments.
 */
const streamDeploymentLogs = asyncHandler(async (req, res) => {
    const { deploymentId } = req.params;
    const deployment = await deploymentsService.verifyDeploymentAccess(deploymentId, req.user);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Send persisted logs first
    const existingLogs = await deploymentsRepository.getDeploymentLogs(deploymentId, { limit: 500 });
    for (const log of existingLogs) {
        sendEvent('log', {
            id: log.id,
            source: log.source,
            level: log.level,
            message: deploymentsService.redactSecrets(log.message),
            loggedAt: log.logged_at,
        });
    }

    const terminalStates = ['SUCCEEDED', 'FAILED', 'CANCELLED'];
    if (terminalStates.includes(deployment.status)) {
        sendEvent('done', { status: deployment.status });
        res.end();
        return;
    }

    const emitter = ec2Orchestrator.getEmitter(deploymentId);
    if (!emitter) {
        sendEvent('done', { status: deployment.status });
        res.end();
        return;
    }

    const onLog = (entry) => sendEvent('log', entry);
    const onDone = (payload) => {
        sendEvent('done', payload);
        cleanup();
        res.end();
    };
    const cleanup = () => {
        emitter.off('log', onLog);
        emitter.off('done', onDone);
    };

    emitter.on('log', onLog);
    emitter.on('done', onDone);

    req.on('close', cleanup);
});

module.exports = {
    listDeployments,
    getDeploymentById,
    getDeploymentLogs,
    streamDeploymentLogs,
    updateDeploymentStatus,
};

