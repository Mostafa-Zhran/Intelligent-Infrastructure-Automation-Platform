// backend/src/middleware/authenticateWorker.js
// Validates requests from internal workers/Jenkins using a shared API key.
// The key must be sent in the `X-Worker-Api-Key` header.
const ApiError = require('../utils/ApiError');

const WORKER_API_KEY = process.env.WORKER_API_KEY;

function authenticateWorker(req, res, next) {
    if (!WORKER_API_KEY) {
        // No key configured — only allow in development
        if (process.env.NODE_ENV === 'production') {
            return next(new ApiError(503, 'Worker callback endpoint is not configured'));
        }
        return next();
    }

    const provided = req.headers['x-worker-api-key'];
    if (!provided || provided !== WORKER_API_KEY) {
        return next(new ApiError(401, 'Invalid or missing worker API key'));
    }

    next();
}

module.exports = authenticateWorker;

