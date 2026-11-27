//src/modules/auth/session.service.js 
const crypto = require('crypto');
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { generateRefreshToken, hashRefreshToken } = require('./token.service');

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

/**
 * Validates and rotates a refresh token within its session family.
 * Detects token reuse and revokes the entire family if a rotated/revoked token is replayed.
 */
async function rotateSession(refreshToken, metadata = {}) {
    if (!refreshToken) {
        throw new ApiError(401, 'Refresh token is required');
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const existing = await prisma.refresh_sessions.findUnique({
        where: { token_hash: tokenHash },
        include: { users: true },
    });

    if (!existing) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    if (existing.revoked_at) {
        // Possible token theft / replay — revoke the entire session family
        await prisma.refresh_sessions.updateMany({
            where: {
                family_id: existing.family_id,
                revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
                revoke_reason: 'TOKEN_REUSE',
            },
        });
        throw new ApiError(401, 'Refresh token has been revoked');
    }

    if (existing.expires_at < new Date()) {
        throw new ApiError(401, 'Refresh token expired. Please sign in again.');
    }

    if (!existing.users || existing.users.status !== 'ACTIVE') {
        throw new ApiError(403, 'Account is not active');
    }

    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const newExpiresAt = new Date(
        Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    await prisma.$transaction(async (tx) => {
        const created = await tx.refresh_sessions.create({
            data: {
                user_id: existing.user_id,
                token_hash: newTokenHash,
                family_id: existing.family_id,
                expires_at: newExpiresAt,
                user_agent: metadata.userAgent || existing.user_agent || null,
                ip_address: metadata.ipAddress || existing.ip_address || null,
            },
            select: { id: true },
        });

        await tx.refresh_sessions.update({
            where: { id: existing.id },
            data: {
                last_used_at: new Date(),
                rotated_at: new Date(),
                revoked_at: new Date(),
                revoke_reason: 'ROTATED',
                replaced_by_session_id: created.id,
            },
        });
    });

    return {
        user: existing.users,
        refreshToken: newRefreshToken,
    };
}

module.exports = {
    createSession,
    rotateSession,
    revokeSession,
    revokeAllUserSessions,
    revokeSessionByToken,
};