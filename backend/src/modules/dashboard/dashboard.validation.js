// backend/src/modules/dashboard/dashboard.validation.js
const Joi = require('joi');

const recentDeploymentsQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
}).unknown(false);

module.exports = {
    recentDeploymentsQuerySchema,
};
