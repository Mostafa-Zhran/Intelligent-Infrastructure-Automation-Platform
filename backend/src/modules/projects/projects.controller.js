// backend/src/modules/projects/projects.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const projectsService = require('./projects.service');
const ec2TargetService = require('./ec2Target.service');
const awsClusterService = require('./awsCluster.service');

const listProjects = asyncHandler(async (req, res) => {
    const projects = await projectsService.listProjects(req.user);

    res.status(200).json({
        success: true,
        data: {
            projects,
        },
    });
});

const createProject = asyncHandler(async (req, res) => {
    const project = await projectsService.createProject(req.user, req.body);

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: {
            project,
        },
    });
});

const getProjectOverview = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await projectsService.getProjectOverview(projectId, req.user);

    res.status(200).json({
        success: true,
        data: {
            project,
        },
    });
});

const getDeploymentHistory = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const result = await projectsService.getDeploymentHistory(
        projectId,
        req.user,
        req.query
    );

    res.status(200).json({
        success: true,
        data: result,
    });
});

const submitDeploymentRequest = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    // Check for Idempotency-Key header if not in body
    const bodyData = { ...req.body };
    const headerIdempotencyKey = req.headers['idempotency-key'];
    if (headerIdempotencyKey && !bodyData.idempotencyKey) {
        bodyData.idempotencyKey = String(headerIdempotencyKey).trim();
    }

    const result = await projectsService.submitDeploymentRequest(
        projectId,
        req.user,
        bodyData,
        req.correlationId
    );

    const statusCode = result.idempotent ? 200 : 201;

    res.status(statusCode).json({
        success: true,
        message: result.idempotent
            ? 'Existing deployment request returned (idempotent)'
            : 'Deployment request submitted successfully',
        data: result,
    });
});

const analyzeRepository = asyncHandler(async (req, res) => {
    const result = await projectsService.analyzeRepository(req.user, req.body);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ─── SETUP-05: Setup Pipeline Controller Handlers ─────────────────────────────

/**
 * POST /api/projects/:projectId/setup
 * Starts the infrastructure setup pipeline for a project.
 */
const startSetup = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { force = false } = req.body || {};

    const result = await projectsService.startProjectSetup(
        projectId,
        req.user,
        { force: Boolean(force) },
        req.correlationId
    );

    res.status(202).json({
        success: true,
        message: 'Infrastructure setup pipeline queued successfully',
        data: result,
    });
});

/**
 * GET /api/projects/:projectId/setup-status
 * Returns the current setup status and pipeline details for polling.
 */
const getSetupStatus = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const result = await projectsService.getSetupStatus(projectId, req.user);

    res.status(200).json({
        success: true,
        data: result,
    });
});

// ─── SAAS-02: EC2 Target Configuration Handlers ───────────────────────────────

const saveEc2Config = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const target = await ec2TargetService.saveEc2Config(
        projectId,
        req.user,
        req.body
    );

    res.status(200).json({
        success: true,
        message: 'EC2 target configuration encrypted and saved successfully',
        data: { target },
    });
});

const getEc2Config = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const target = await ec2TargetService.getEc2Config(projectId, req.user);

    res.status(200).json({
        success: true,
        data: { target },
    });
});

/**
 * POST /api/projects/:projectId/ec2-verify
 * SAAS-03 — Pre-flight SSH handshake and Docker availability diagnostic probe.
 */
const verifyEc2Config = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const diagnostics = await ec2TargetService.verifyEc2Connection(
        projectId,
        req.user
    );

    res.status(200).json({
        success: true,
        data: diagnostics,
    });
});

// ─── BYOC Cluster Mode: AWS EKS Target Configuration Handlers ────────────────

const saveClusterConfig = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const target = await awsClusterService.saveClusterConfig(
        projectId,
        req.user,
        req.body
    );

    res.status(200).json({
        success: true,
        message: 'AWS BYOC cluster target saved and encrypted.',
        data: { target },
    });
});

const getClusterConfig = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const target = await awsClusterService.getClusterConfig(projectId, req.user);

    res.status(200).json({
        success: true,
        data: { target },
    });
});

const verifyClusterConfig = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const diagnostics = await awsClusterService.verifyClusterCredentials(
        projectId,
        req.user
    );

    res.status(200).json({
        success: true,
        data: diagnostics,
    });
});

const deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const result = await projectsService.deleteProject(projectId, req.user);

    res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
        data: result,
    });
});

const deleteEc2Config = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const result = await ec2TargetService.deleteEc2Config(projectId, req.user);

    res.status(200).json({
        success: true,
        message: 'EC2 deployment target removed.',
        data: result,
    });
});

const deleteClusterConfig = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const result = await awsClusterService.deleteClusterConfig(projectId, req.user);

    res.status(200).json({
        success: true,
        message: 'AWS BYOC cluster target removed.',
        data: result,
    });
});

/**
 * POST /:projectId/cluster-destroy
 * Runs `terraform destroy` to delete all AWS infrastructure for this project,
 * then removes the cluster config from the database.
 * Long-running (up to 20 min) — client should use a generous timeout.
 */
const destroyClusterInfrastructure = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const deleteConfig = req.body?.deleteConfig !== false; // default true
    const result = await awsClusterService.destroyClusterInfrastructure(projectId, req.user, { deleteConfig });

    res.status(200).json({
        success: true,
        message: `AWS infrastructure for cluster '${result.clusterName}' destroyed successfully.`,
        data: result,
    });
});

module.exports = {
    listProjects,
    createProject,
    getProjectOverview,
    getDeploymentHistory,
    submitDeploymentRequest,
    analyzeRepository,
    // SETUP-05
    startSetup,
    getSetupStatus,
    // SAAS-02 & SAAS-03
    saveEc2Config,
    getEc2Config,
    verifyEc2Config,
    // BYOC Cluster Mode
    saveClusterConfig,
    getClusterConfig,
    verifyClusterConfig,
    deleteEc2Config,
    deleteClusterConfig,
    destroyClusterInfrastructure,
    deleteProject,
};
