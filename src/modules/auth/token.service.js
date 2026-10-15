const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function generateAccessToken(user) {
    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error('JWT_ACCESS_SECRET is not configured');
    }

    return jwt.sign(
        {
            sub: user.id,
            role: user.platform_role,
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

function hashRefreshToken(token) {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    hashRefreshToken,
};