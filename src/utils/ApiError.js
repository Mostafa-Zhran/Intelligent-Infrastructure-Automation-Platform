// src/utils/ApiError.js 
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);

        this.statusCode = statusCode;
        this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
        this.operational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ApiError;
