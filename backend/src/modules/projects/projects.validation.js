// backend/src/modules/projects/projects.validation.js
const Joi = require('joi');
const ApiError = require('../../utils/ApiError');

const projectIdParamSchema = Joi.object({
    projectId: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid project ID format. Must be a valid UUID.',
        'any.required': 'Project ID is required.',
    }),
}).unknown(false);

/**
 * Deployment history query parameters.
 * Canonical pagination parameter: per_page
 * Backward-compatible alias: limit
 */
const deploymentHistoryQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    limit: Joi.number().integer().min(1).max(100),
    environment: Joi.string()
        .trim()
        .valid('development', 'staging', 'production', 'test', 'preview'),
    status: Joi.string()
        .trim()
        .valid('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'),
}).unknown(false);

const submitDeploymentSchema = Joi.object({
    branch: Joi.string().trim().max(255),
    commitSha: Joi.string().trim().length(40).hex().messages({
        'string.length': 'commitSha must be a 40-character hexadecimal string.',
        'string.hex': 'commitSha must be a valid hexadecimal string.',
    }),
    environment: Joi.string()
        .trim()
        .valid('development', 'staging', 'production', 'test', 'preview'),
    dockerfilePath: Joi.string().trim().max(255).default('Dockerfile'),
    replicas: Joi.number().integer().min(1).max(50).default(1),
    idempotencyKey: Joi.string().trim().max(255),
}).unknown(false);

const createProjectSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
        'string.empty': 'Project name is required.',
        'any.required': 'Project name is required.',
        'string.min': 'Project name must be at least 2 characters long.',
    }),
    description: Joi.string().trim().max(500).allow('', null),
    repositoryUrl: Joi.string().trim().uri().allow('', null),
    repositoryBranch: Joi.string().trim().max(255).default('main'),
    defaultEnvironment: Joi.string()
        .trim()
        .valid('development', 'staging', 'production', 'test', 'preview')
        .default('development'),
    githubRepoId: Joi.alternatives().try(Joi.string(), Joi.number()).allow(null),
    githubRepoOwner: Joi.string().trim().max(100).allow('', null),
    githubRepoFullName: Joi.string().trim().max(300).allow('', null),
    buildCommand: Joi.string().trim().max(255).allow('', null),
    outputDirectory: Joi.string().trim().max(255).allow('', null),
    envVars: Joi.array().items(
        Joi.object({
            key: Joi.string().trim().required(),
            value: Joi.string().trim().allow(''),
        })
    ).optional(),
}).unknown(true);

/**
 * Middleware validating the HTTP Idempotency-Key header before it reaches the controller/service.
 */
function validateIdempotencyHeader(req, res, next) {
    const rawKey = req.headers['idempotency-key'];
    if (rawKey !== undefined) {
        if (
            typeof rawKey !== 'string' ||
            !rawKey.trim() ||
            !/^[a-zA-Z0-9_-]{1,255}$/.test(rawKey.trim())
        ) {
            return next(
                new ApiError(
                    400,
                    'Invalid Idempotency-Key header. Must be an alphanumeric string up to 255 characters.'
                )
            );
        }
        req.headers['idempotency-key'] = rawKey.trim();
    }
    next();
}

module.exports = {
    projectIdParamSchema,
    deploymentHistoryQuerySchema,
    submitDeploymentSchema,
    createProjectSchema,
    validateIdempotencyHeader,
};
