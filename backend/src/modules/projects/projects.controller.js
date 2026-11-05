// backend/src/modules/projects/projects.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const projectsService = require('./projects.service');

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

module.exports = {
    listProjects,
    createProject,
    getProjectOverview,
    getDeploymentHistory,
    submitDeploymentRequest,
};
