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

const analyzeRepositorySchema = Joi.object({
    owner: Joi.string().trim().max(100).required().messages({
        'any.required': 'Repository owner is required.',
        'string.empty': 'Repository owner cannot be empty.',
    }),
    repo: Joi.string().trim().max(100).required().messages({
        'any.required': 'Repository name is required.',
        'string.empty': 'Repository name cannot be empty.',
    }),
    branch: Joi.string().trim().max(255).default('main'),
    dockerfilePath: Joi.string().trim().max(255).default('Dockerfile')
        .pattern(/^(?!\/)(?!.*(?:\.\.|\\)).+$/)
        .messages({
            'string.pattern.base': 'dockerfilePath must be a safe relative path without directory traversal (..).',
        }),
}).unknown(false);

// ─── SAAS-02: EC2 Target Configuration Validation ─────────────────────────────

const ec2ConfigSchema = Joi.object({
    publicIp: Joi.string().trim().max(255)
        .pattern(/^[a-zA-Z0-9.\-:]+$/)
        .required()
        .messages({
            'any.required': 'EC2 Public IP or hostname is required.',
            'string.pattern.base': 'publicIp must be a valid IPv4/IPv6 address or hostname.',
        }),
    sshUser: Joi.string().trim().max(64)
        .pattern(/^[a-zA-Z0-9_\-]+$/)
        .default('ubuntu')
        .messages({
            'string.pattern.base': 'sshUser must contain only alphanumeric characters, underscores, or hyphens.',
        }),
    sshPort: Joi.number().integer().min(1).max(65535).default(22),
    sshPrivateKey: Joi.string().trim().min(20).max(20000).optional(),
    authType: Joi.string().valid('SSH_KEY', 'AWS_IAM_CREDENTIALS').default('SSH_KEY'),
    dockerfilePath: Joi.string().trim().max(255).default('Dockerfile')
        .pattern(/^(?!\/)(?!.*(?:\.\.|\\)).+$/)
        .messages({
            'string.pattern.base': 'dockerfilePath must be a safe relative path without directory traversal (..).',
        }),
    awsRegion: Joi.string().trim().max(50).default('us-east-1'),
    hostPort: Joi.number().integer().min(1).max(65535).default(80),
    containerPort: Joi.number().integer().min(1).max(65535).default(3000),
}).unknown(false);

// ─── BYOC Cluster Mode: AWS EKS Configuration Validation ─────────────────────
const awsClusterConfigSchema = Joi.object({
    authMode: Joi.string().valid('IAM_ROLE', 'ACCESS_KEYS').default('IAM_ROLE'),
    awsRegion: Joi.string().trim().max(50).default('us-east-1'),
    roleArn: Joi.string().trim().max(255).allow('', null).optional(),
    externalId: Joi.string().trim().max(128).allow('', null).optional(),
    accessKeyId: Joi.string().trim().max(64).allow('', null).optional(),
    secretAccessKey: Joi.string().trim().max(256).allow('', null).optional(),
    clusterName: Joi.string()
        .trim()
        .min(2)
        .max(63)
        .pattern(/^[a-zA-Z][a-zA-Z0-9-]*$/)
        .optional(),
    nodeInstanceType: Joi.string().trim().max(32).default('t3.medium'),
    desiredNodes: Joi.number().integer().min(1).max(20).default(2),
    kubernetesVersion: Joi.string().trim().max(16).default('1.30'),
}).unknown(false);

// ─── SETUP-05: Setup Pipeline Validation ─────────────────────────────────────

/**
 * Request body for POST /api/projects/:projectId/setup
 * force: allow re-triggering the setup pipeline even when last attempt FAILED or status is READY.
 */
const startSetupSchema = Joi.object({
    force: Joi.boolean().default(false),
}).unknown(false);

module.exports = {
    projectIdParamSchema,
    deploymentHistoryQuerySchema,
    submitDeploymentSchema,
    createProjectSchema,
    analyzeRepositorySchema,
    validateIdempotencyHeader,
    // SETUP-05
    startSetupSchema,
    // SAAS-02
    ec2ConfigSchema,
    // BYOC Cluster Mode
    awsClusterConfigSchema,
};
