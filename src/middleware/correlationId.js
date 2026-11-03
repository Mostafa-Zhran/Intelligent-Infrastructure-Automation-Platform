// src/middleware/correlationId.js
const crypto = require('crypto');

const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function correlationId(req, res, next) {
    const headerVal = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    let validId;

    if (
        typeof headerVal === 'string' &&
        headerVal.trim() &&
        SAFE_CORRELATION_ID_REGEX.test(headerVal.trim())
    ) {
        validId = headerVal.trim();
    } else {
        // Generate a new cryptographically random UUID when missing or invalid
        validId = crypto.randomUUID();
    }

    req.correlationId = validId;
    res.setHeader('X-Correlation-Id', validId);
    next();
}

module.exports = correlationId;
