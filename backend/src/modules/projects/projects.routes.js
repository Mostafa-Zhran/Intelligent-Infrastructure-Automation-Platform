// backend/src/modules/projects/projects.routes.js
const express = require('express');
const authenticate = require('../../middleware/authenticate');
const validateRequest = require('../../middleware/validateRequest');
const projectsController = require('./projects.controller');
const envVarsController = require('./envVars.controller');
const runtimeController = require('../deployments/runtime.controller');
const {
    createProjectSchema,
    projectIdParamSchema,
    deploymentHistoryQuerySchema,
    submitDeploymentSchema,
    analyzeRepositorySchema,
    validateIdempotencyHeader,
    startSetupSchema,
    ec2ConfigSchema,
    awsClusterConfigSchema,
} = require('./projects.validation');

const router = express.Router();

// Require authentication for all project and deployment endpoints
router.use(authenticate);

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List all projects accessible to the authenticated user
 *     description: Returns projects owned by or shared with the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Projects list returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProjectOverview'
 *       401:
 *         description: Unauthorized
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project
 *     description: Creates a new infrastructure automation project with repository and deployment targets.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Project created successfully' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     project: { $ref: '#/components/schemas/ProjectOverview' }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.get('/', projectsController.listProjects);

router.post('/',
    validateRequest(createProjectSchema),
    projectsController.createProject
);
/**
 * @openapi
 * /api/projects/analyze-repository:
 *   post:
 *     tags: [Projects]
 *     summary: SETUP-02 — Analyze Repository for Supported MVP Pattern
 *     description: >
 *       Inspects the user's selected GitHub repository metadata and root manifests via GitHub REST API
 *       without executing code. Detects Dockerfile (mandatory for MVP build) and framework manifests
 *       (package.json, requirements.txt, pom.xml, etc.).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner
 *               - repo
 *             properties:
 *               owner:
 *                 type: string
 *                 example: acme-corp
 *               repo:
 *                 type: string
 *                 example: web-service
 *               branch:
 *                 type: string
 *                 example: main
 *                 default: main
 *               dockerfilePath:
 *                 type: string
 *                 example: Dockerfile
 *                 default: Dockerfile
 *     responses:
 *       200:
 *         description: Repository analyzed successfully
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
 *                     supported:
 *                       type: boolean
 *                       example: true
 *                     repository:
 *                       type: string
 *                       example: acme-corp/web-service
 *                     branch:
 *                       type: string
 *                       example: main
 *                     dockerfilePath:
 *                       type: string
 *                       example: Dockerfile
 *                     detectedFiles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Dockerfile", "package.json"]
 *                     manifests:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["package.json"]
 *                     framework:
 *                       type: string
 *                       example: Node.js
 *                     reason:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Bad Request — Validation or directory traversal error
 *       401:
 *         description: Unauthorized — Missing or invalid bearer token
 *       404:
 *         description: Not Found — Repository or branch not found
 *       409:
 *         description: Conflict — GitHub account not connected
 */
router.post('/analyze-repository',
    validateRequest(analyzeRepositorySchema),
    projectsController.analyzeRepository
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

router.delete(
    '/:projectId',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.deleteProject
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
 *       7. Publishes the job to the GitHub Actions CI/CD pipeline and returns Queued status.
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
 *         description: Bad Gateway — GitHub Actions CI pipeline dispatch failed or returned an error (deployment marked as FAILED)
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

// ─── SETUP-05: Setup Pipeline Routes ──────────────────────────────────────────

/**
 * @openapi
 * /api/projects/{projectId}/setup:
 *   post:
 *     tags: [Projects]
 *     summary: SETUP-05 — Start Infrastructure Setup Pipeline
 *     description: >
 *       Starts the infrastructure provisioning pipeline for the project.
 *       Validates project access and MVP configuration, prevents duplicate active setups,
 *       creates a setup deployment record (environment='setup'), updates project setup_status to
 *       IN_PROGRESS, and dispatches the job to GitHub Actions asynchronously.
 *       Returns a 202 Accepted response with the queued pipeline ID.
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 default: false
 *                 description: Set to true to allow re-running a failed or already-READY setup
 *     responses:
 *       202:
 *         description: Setup pipeline queued successfully
 *       400:
 *         description: Bad Request — Repository not configured
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — Insufficient permissions
 *       404:
 *         description: Not Found — Project not found
 *       409:
 *         description: Conflict — Active setup already in progress or setup already READY
 *       502:
 *         description: Bad Gateway — CI dispatch failed
 *       504:
 *         description: Gateway Timeout — CI dispatch timed out
 */
router.post(
    '/:projectId/setup',
    validateRequest(projectIdParamSchema, 'params'),
    validateRequest(startSetupSchema, 'body'),
    projectsController.startSetup
);

/**
 * @openapi
 * /api/projects/{projectId}/setup-status:
 *   get:
 *     tags: [Projects]
 *     summary: SETUP-05 — Poll Setup Pipeline Status
 *     description: >
 *       Returns the current setup_status of the project and details of the latest setup
 *       deployment pipeline including stages, timestamps, and a safe failure summary.
 *       Designed for Dashboard polling. Secrets are never included in the response.
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
 *         description: Setup status returned successfully
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
 *                     setupStatus:
 *                       type: string
 *                       enum: [PENDING, IN_PROGRESS, READY, FAILED]
 *                       example: IN_PROGRESS
 *                     pipeline:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED]
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                         finishedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         errorSummary:
 *                           type: string
 *                           nullable: true
 *                         stages:
 *                           type: array
 *                           items:
 *                             type: object
 *       400:
 *         description: Bad Request — Invalid project UUID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not Found — Project not found
 */
router.get(
    '/:projectId/setup-status',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.getSetupStatus
);

/**
 * @openapi
 * /api/projects/{projectId}/ec2-config:
 *   post:
 *     tags: [Projects]
 *     summary: SAAS-02 — Save Encrypted EC2 Deployment Target
 *     description: >
 *       Stores the user's AWS EC2 connection details (Public IP, SSH user, port routing)
 *       and encrypts the SSH private key at rest using AES-256-GCM. Private keys are
 *       never returned in API responses.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicIp]
 *             properties:
 *               publicIp: { type: string, example: "54.210.120.45" }
 *               sshUser: { type: string, default: "ubuntu" }
 *               sshPort: { type: integer, default: 22 }
 *               sshPrivateKey: { type: string, description: "PEM/OpenSSH private key" }
 *               dockerfilePath: { type: string, default: "Dockerfile" }
 *               hostPort: { type: integer, default: 80 }
 *               containerPort: { type: integer, default: 3000 }
 *     responses:
 *       200:
 *         description: EC2 target saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     tags: [Projects]
 *     summary: SAAS-02 — Get Sanitized EC2 Deployment Target
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sanitized EC2 target returned (keys strictly omitted)
 */
router.post(
    '/:projectId/ec2-config',
    validateRequest(projectIdParamSchema, 'params'),
    validateRequest(ec2ConfigSchema),
    projectsController.saveEc2Config
);

router.get(
    '/:projectId/ec2-config',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.getEc2Config
);

/**
 * @openapi
 * /api/projects/{projectId}/ec2-verify:
 *   post:
 *     tags: [Projects]
 *     summary: SAAS-03 — Pre-flight SSH Connectivity & Security Group Probe
 *     description: >
 *       Connects to the configured AWS EC2 host via SSH, verifies port 22 reachability,
 *       authenticates with the encrypted SSH key, and inspects OS & Docker availability.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: EC2 host reachable and diagnostics returned
 *       400:
 *         description: Connection timeout (Security Group port blocked) or authentication failure
 *       404:
 *         description: EC2 target not configured for this project
 */
router.post(
    '/:projectId/ec2-verify',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.verifyEc2Config
);

// ─── BYOC Cluster Mode: AWS EKS Target Routes ────────────────────────────────
router.post(
    '/:projectId/cluster-config',
    validateRequest(projectIdParamSchema, 'params'),
    validateRequest(awsClusterConfigSchema),
    projectsController.saveClusterConfig
);

router.get(
    '/:projectId/cluster-config',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.getClusterConfig
);

router.post(
    '/:projectId/cluster-verify',
    validateRequest(projectIdParamSchema, 'params'),
    projectsController.verifyClusterConfig
);

// ─── Environment Variables Manager ───────────────────────────────────────────
router.get(
    '/:projectId/env-vars',
    validateRequest(projectIdParamSchema, 'params'),
    envVarsController.listEnvVars
);

router.post(
    '/:projectId/env-vars',
    validateRequest(projectIdParamSchema, 'params'),
    envVarsController.saveEnvVar
);

router.post(
    '/:projectId/env-vars/bulk',
    validateRequest(projectIdParamSchema, 'params'),
    envVarsController.saveEnvVarsBulk
);

router.delete(
    '/:projectId/env-vars/:key',
    validateRequest(projectIdParamSchema, 'params'),
    envVarsController.deleteEnvVar
);

// ─── Runtime Container Controls (EC2 SSH) ────────────────────────────────────
router.get(
    '/:projectId/runtime/status',
    validateRequest(projectIdParamSchema, 'params'),
    runtimeController.getContainerStatus
);

router.get(
    '/:projectId/runtime/logs',
    validateRequest(projectIdParamSchema, 'params'),
    runtimeController.getContainerLogs
);

router.post(
    '/:projectId/runtime/restart',
    validateRequest(projectIdParamSchema, 'params'),
    runtimeController.restartContainer
);

module.exports = router;
