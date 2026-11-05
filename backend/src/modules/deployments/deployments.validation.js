// backend/src/modules/deployments/deployments.validation.js
const Joi = require('joi');

const listDeploymentsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    per_page: Joi.number().integer().min(1).max(100).default(20),
    limit: Joi.number().integer().min(1).max(100),
    status: Joi.string()
        .trim()
        .valid('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'),
    environment: Joi.string()
        .trim()
        .valid('development', 'staging', 'production', 'test', 'preview'),
}).unknown(false);

const deploymentIdParamSchema = Joi.object({
    deploymentId: Joi.string().uuid().required().messages({
        'string.guid': 'Invalid deployment ID format. Must be a valid UUID.',
        'any.required': 'Deployment ID is required.',
    }),
}).unknown(false);

const deploymentLogsQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(500).default(200),
    step_id: Joi.string().uuid(),
    level: Joi.string().trim().valid('INFO', 'WARN', 'ERROR', 'DEBUG'),
}).unknown(false);

const statusUpdateSchema = Joi.object({
    status: Joi.string()
        .trim()
        .uppercase()
        .valid('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED')
        .required()
        .messages({
            'any.required': 'status is required.',
            'any.only': 'status must be one of: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED.',
        }),
    errorMessage: Joi.string().trim().max(1000).allow(null, ''),
    startedAt: Joi.string().isoDate().allow(null),
    finishedAt: Joi.string().isoDate().allow(null),
}).unknown(false);

module.exports = {
    listDeploymentsQuerySchema,
    deploymentIdParamSchema,
    deploymentLogsQuerySchema,
    statusUpdateSchema,
};

