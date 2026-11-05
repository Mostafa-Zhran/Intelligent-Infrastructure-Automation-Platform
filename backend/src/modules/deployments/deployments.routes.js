// backend/src/modules/deployments/deployments.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const authenticateWorker = require('../../middleware/authenticateWorker');
const validateRequest = require('../../middleware/validateRequest');
const deploymentsController = require('./deployments.controller');
const {
    listDeploymentsQuerySchema,
    deploymentIdParamSchema,
    deploymentLogsQuerySchema,
    statusUpdateSchema,
} = require('./deployments.validation');

const router = express.Router();

/**
 * @openapi
 * /api/deployments:
 *   get:
 *     tags: [Deployments]
 *     summary: DEP-01 — List Deployments
 *     description: >
 *       Returns all deployments visible to the authenticated user.
 *       Platform admins see all deployments; regular users see only deployments
 *       belonging to projects they own or are active members of.
 *       Sorted newest first.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: per_page
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED]
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [development, staging, production, test, preview]
 *     responses:
 *       200:
 *         description: Deployment list returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/',
    authenticate,
    validateRequest(listDeploymentsQuerySchema, 'query'),
    deploymentsController.listDeployments
);

/**
 * @openapi
 * /api/deployments/{deploymentId}:
 *   get:
 *     tags: [Deployments]
 *     summary: DEP-02 — Deployment Details
 *     description: >
 *       Returns full details for a single deployment including pipeline steps,
 *       state events, and CI job info. Access is enforced through project membership.
 *       Credentials and secrets are never returned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Deployment details returned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deployment not found
 */
router.get(
    '/:deploymentId',
    authenticate,
    validateRequest(deploymentIdParamSchema, 'params'),
    deploymentsController.getDeploymentById
);

/**
 * @openapi
 * /api/deployments/{deploymentId}/logs:
 *   get:
 *     tags: [Deployments]
 *     summary: DEP-03 — Deployment Logs
 *     description: >
 *       Returns redacted log lines for a deployment. Tokens, passwords, private keys,
 *       and environment secrets are automatically redacted before the response is sent.
 *       Access is enforced through project membership.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 500, default: 200 }
 *       - in: query
 *         name: level
 *         schema: { type: string, enum: [INFO, WARN, ERROR, DEBUG] }
 *       - in: query
 *         name: step_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Logs returned (secrets redacted)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deployment not found
 */
router.get(
    '/:deploymentId/logs',
    authenticate,
    validateRequest(deploymentIdParamSchema, 'params'),
    validateRequest(deploymentLogsQuerySchema, 'query'),
    deploymentsController.getDeploymentLogs
);

/**
 * @openapi
 * /api/deployments/{deploymentId}/status:
 *   post:
 *     tags: [Deployments]
 *     summary: DEP-04 — Worker Status Callback
 *     description: >
 *       Accepts deployment status updates from the Jenkins/worker process.
 *       Authenticated by the X-Worker-Api-Key header, NOT by user JWT.
 *       Rejects invalid state transitions and prevents stale overwrite of terminal states.
 *     security:
 *       - workerApiKey: []
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: header
 *         name: X-Worker-Api-Key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED]
 *               errorMessage:
 *                 type: string
 *                 maxLength: 1000
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               finishedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status or payload
 *       401:
 *         description: Invalid or missing worker API key
 *       404:
 *         description: Deployment not found
 */
router.post(
    '/:deploymentId/status',
    authenticateWorker,
    validateRequest(deploymentIdParamSchema, 'params'),
    validateRequest(statusUpdateSchema, 'body'),
    deploymentsController.updateDeploymentStatus
);

module.exports = router;

