// backend/src/modules/dashboard/dashboard.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validateRequest = require('../../middleware/validateRequest');
const dashboardController = require('./dashboard.controller');
const { recentDeploymentsQuerySchema } = require('./dashboard.validation');

const router = express.Router();

// Require user authentication for all dashboard routes
router.use(authenticate);

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: DASH-01 — Dashboard Summary
 *     description: >
 *       Returns overview metrics (total projects, running deployments, failed deployments),
 *       all visible projects with their latest deployment status, and the 5 most recent deployments.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary data returned
 *       401:
 *         description: Unauthorized
 */
router.get('/', dashboardController.getDashboardSummary);

/**
 * @openapi
 * /api/dashboard/recent-deployments:
 *   get:
 *     tags: [Dashboard]
 *     summary: DASH-02 — Recent Deployments
 *     description: >
 *       Returns the most recent deployments visible to the current user, sorted newest first.
 *       Includes safe failure summaries when a deployment fails.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent deployments list returned
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/recent-deployments',
    validateRequest(recentDeploymentsQuerySchema, 'query'),
    dashboardController.getRecentDeployments
);

module.exports = router;
