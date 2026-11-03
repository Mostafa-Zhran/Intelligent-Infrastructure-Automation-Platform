// src/middleware/authorize.js
const ApiError = require('../utils/ApiError');

const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new ApiError(403, 'You do not have permission to access this resource'));
    }
    next();
};

module.exports = authorize;