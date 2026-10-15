const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
require('dotenv').config();

const authenticate = asyncHandler(async (req, res, next) => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) {
        throw new ApiError(401, 'Authentication required');
    }

    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    let decoded;

    try {
        decoded = jwt.verify(
            accessToken,
            process.env.JWT_ACCESS_SECRET
        );
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, 'Access token expired');
        }

        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, 'Invalid access token');
        }

        throw error;
    }

    req.user = {
        id: decoded.sub,
        role: decoded.role,
    };

    next();
});

module.exports = authenticate;