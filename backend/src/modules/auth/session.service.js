//src/modules/auth/session.service.js 
const crypto = require('crypto');
const prisma = require('../../db/prisma');
const { hashRefreshToken } = require('./token.service');

const REFRESH_TOKEN_TTL_DAYS = 7;

async function createSession(user, refreshToken, metadata = {}) {
    const tokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    return prisma.refresh_sessions.create({
        data: {
            user_id: user.id,
            token_hash: tokenHash,
            family_id: crypto.randomUUID(),
            expires_at: expiresAt,
            user_agent: metadata.userAgent || null,
            ip_address: metadata.ipAddress || null,
        },
        select: {
            id: true,
            user_id: true,
            family_id: true,
            expires_at: true,
        },
    });
}

async function revokeSession(sessionId, userId, reason = 'LOGOUT') {
    return prisma.refresh_sessions.updateMany({
        where: {
            id: sessionId,
            user_id: userId,
            revoked_at: null,
        },
        data: {
            revoked_at: new Date(),
            revoke_reason: reason,
        },
    });
}

async function revokeAllUserSessions(
    userId,
    reason = 'PASSWORD_CHANGED'
) {
    return prisma.refresh_sessions.updateMany({
        where: {
            user_id: userId,
            revoked_at: null,
        },
        data: {
            revoked_at: new Date(),
            revoke_reason: reason,
        },
    });
}

async function revokeSessionByToken(refreshToken) {
    if (!refreshToken) {
        return;
    }

    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.refresh_sessions.updateMany({
        where: {
            token_hash: tokenHash,
            revoked_at: null,
        },
        data: {
            revoked_at: new Date(),
            revoke_reason: 'LOGOUT',
        },
    });
}

module.exports = {
    createSession,
    revokeSession,
    revokeAllUserSessions,
    revokeSessionByToken,
};