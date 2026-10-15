// src/middleware/validateRequest.js 
const ApiError = require('../utils/ApiError');

function validateRequest(schema, property = 'body') {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false,
            convert: true,
        });

        if (error) {
            const message = error.details
                .map((detail) => detail.message)
                .join(', ');

            return next(new ApiError(400, message));
        }

        req[property] = value;

        next();
    };
}

module.exports = validateRequest;
