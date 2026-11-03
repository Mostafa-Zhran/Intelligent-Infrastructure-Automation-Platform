// src/middleware/globalError.js 
const ApiError = require('../utils/ApiError');

const isOperational = (err) => {
    return err instanceof ApiError && err.operational === true;
};

const handleJWTExpiredError = () =>
    new ApiError(401, 'Your token has expired. Please log in again.');

const handleJWTError = () =>
    new ApiError(401, 'Invalid token. Please log in again.');

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
        error: {
            name: err.name,
        },
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    if (isOperational(err)) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    console.error('Unexpected error:', err);

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
};

function globalError(err, req, res, next) {
    let error = err;

    if (error.name === 'TokenExpiredError') {
        error = handleJWTExpiredError();
    } else if (error.name === 'JsonWebTokenError') {
        error = handleJWTError();
    }

    if (!(error instanceof ApiError)) {
        error = new ApiError(
            500,
            process.env.NODE_ENV === 'development'
                ? error.message
                : 'Internal server error'
        );

        error.operational = false;
    }

    error.statusCode = error.statusCode || 500;

    if (process.env.NODE_ENV === 'development') {
        return sendErrorDev(error, res);
    }

    return sendErrorProd(error, res);
}

module.exports = globalError;
