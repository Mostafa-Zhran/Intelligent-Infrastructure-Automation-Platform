// backend/src/modules/projects/projects.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validateRequest = require('../../middleware/validateRequest');
const projectsController = require('./projects.controller');
const {
    createProjectSchema,
    projectIdParamSchema,
    deploymentHistoryQuerySchema,
    submitDeploymentSchema,
    validateIdempotencyHeader,
} = require('./projects.validation');

const router = express.Router();

// Require authentication for all project and deployment endpoints
router.use(authenticate);

router.get('/', projectsController.listProjects);

router.post('/',
    validateRequest(createProjectSchema),
    projectsController.createProject
);


/**
 * @openapi
 * /api/projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: DETAILS-01 — Project Overview
 *     description: >
 *       Retrieves the project overview including Git repository metadata, selected branch,
 *       target environment, setup status, latest deployment status/timestamps, and safe target
 *       infrastructure details (with credentials and secrets strictly omitted).
 *       Enforces project authorization (accessible only by project owner, platform admin, or active project members).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique UUID identifier of the project
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Project overview returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     project:
 *                       $ref: '#/components/schemas/ProjectOverview'
 *       400:
 *         description: Bad Request — Invalid project UUID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — Missing or invalid JWT access token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — Authenticated user is not an active member or owner of this project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found — Project does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    '/:projectId',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.getProjectOverview
);

/**
 * @openapi
 * /api/projects/{projectId}/deployments:
 *   get:
 *     tags: [Projects]
 *     summary: DETAILS-02 — Project Deployment History
 *     description: >
 *       Returns the deployment history belonging to the specified project.
 *       Deployments are sorted newest first (created_at DESC, id DESC).
 *       Includes deployment ID, environment, branch, commit SHA, execution status, timestamps, and safe failure summaries.
 *       Enforces project authorization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique UUID identifier of the project
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of deployment records per page (canonical parameter)
 *         example: 20
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Backward-compatible alias for per_page
 *         example: 10
 *       - in: query
 *         name: environment
 *         schema:
 *           type: string
 *           enum: [development, staging, production, test, preview]
 *         description: Optional filter by deployment target environment
 *         example: development
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED]
 *         description: Optional filter by deployment execution status
 *         example: SUCCEEDED
 *     responses:
 *       200:
 *         description: Deployment history returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deployments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DeploymentRecord'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         perPage:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 42
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: Bad Request — Invalid query or path parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — User not permitted to view this project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found — Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    '/:projectId/deployments',
    validateRequest(projectIdParamSchema, 'params'),
    validateRequest(deploymentHistoryQuerySchema, 'query'),
    projectsController.getDeploymentHistory
);

/**
 * @openapi
 * /api/projects/{projectId}/deployments:
 *   post:
 *     tags: [Projects]
 *     summary: DETAILS-03 — Submit Deployment Request
 *     description: >
 *       Submits an application deployment request to the CI/CD pipeline:
 *       1. Verifies project access and deployment permission (requires owner, admin, or deployer role).
 *       2. Validates project configuration and enforces that infrastructure setup is READY.
 *       3. Resolves the branch to the exact 40-character commit SHA via GitHub REST integration.
 *       4. Prevents duplicate active deployments under concurrency via database advisory locks and partial unique indexing.
 *       5. Snapshots execution configuration without raw secrets or credentials.
 *       6. Atomically creates deployment, CI job, snapshot event, and audit log records.
 *       7. Publishes the job to the Jenkins CI/CD pipeline and returns Queued status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique UUID identifier of the project
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *       - in: header
 *         name: Idempotency-Key
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 255
 *         description: Optional idempotency key (alphanumeric, max 255 chars) to prevent duplicate submissions on retries.
 *         example: 7856cb79-8031-477b-8f95-c6f376dd57a9
 *       - in: header
 *         name: X-Correlation-Id
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 64
 *         description: Optional distributed tracing correlation ID (alphanumeric, dashes, underscores, max 64 chars).
 *         example: corr-deploy-889911
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeploymentRequest'
 *     responses:
 *       201:
 *         description: Created — Deployment request queued and published to CI pipeline
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Deployment request submitted successfully
 *                 data:
 *                   $ref: '#/components/schemas/CreateDeploymentResponse'
 *       200:
 *         description: OK — Idempotent duplicate request safely returned existing deployment without triggering a new CI build
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Existing deployment request returned (idempotent)
 *                 data:
 *                   $ref: '#/components/schemas/CreateDeploymentResponse'
 *       400:
 *         description: Bad Request — Invalid request parameters, setup status not READY, or commit resolution failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — Missing or invalid authentication token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden — User lacks deployment trigger permission on this project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Not Found — Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Conflict — An active deployment (QUEUED or RUNNING) is already in progress for this environment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: Bad Gateway — Jenkins CI pipeline dispatch failed or returned an error (deployment marked as FAILED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       504:
 *         description: Gateway Timeout — CI pipeline response timed out; deployment retained in QUEUED status pending Point 6 worker reconciliation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
    '/:projectId/deployments',
    validateRequest(projectIdParamSchema, 'params'),
    validateIdempotencyHeader,
    validateRequest(submitDeploymentSchema, 'body'),
    projectsController.submitDeploymentRequest
);

module.exports = router;
