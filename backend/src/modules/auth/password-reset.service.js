const crypto = require('crypto');
const prisma = require('../../db/prisma');
const ApiError = require('../../utils/ApiError');
const { hashPassword } = require('./password.service');

const TOKEN_TTL_MINUTES = Number(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 15
);

function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function createPasswordResetToken(userId) {
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);


    const expiresAt = new Date(
        Date.now() + TOKEN_TTL_MINUTES * 60 * 1000
    );

    await prisma.$transaction([
        prisma.password_reset_tokens.updateMany({
            where: {
                user_id: userId,
                used_at: null,
            },
            data: {
                used_at: new Date(),
            },
        }),
        prisma.password_reset_tokens.create({
            data: {
                user_id: userId,
                token_hash: tokenHash,
                expires_at: expiresAt,
            },
        }),
    ]);

    return token;


}

async function resetPassword({ token, password }) {
    const tokenHash = hashResetToken(token);
    const now = new Date();

    const resetRecord = await prisma.password_reset_tokens.findFirst({
        where: {
            token_hash: tokenHash,
            used_at: null,
            expires_at: { gt: now },
        },
        select: {
            id: true,
            user_id: true,
        },
    });

    if (!resetRecord) {
        
        throw new ApiError(400, 'Invalid or expired password reset token');
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
        const claimed = await tx.password_reset_tokens.updateMany({
            where: {
                id: resetRecord.id,
                used_at: null,
                expires_at: { gt: new Date() },
            },
            data: { used_at: new Date() },
        });

        if (claimed.count !== 1) {
            
            throw new ApiError(400, 'Invalid or expired password reset token');
        }

        await tx.users.update({
            where: { id: resetRecord.user_id },
            data: { password_hash: passwordHash },
        });

        await tx.password_reset_tokens.updateMany({
            where: {
                user_id: resetRecord.user_id,
                used_at: null,
            },
            data: { used_at: new Date() },
        });

        await tx.refresh_sessions.updateMany({
            where: {
                user_id: resetRecord.user_id,
                revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
                revoke_reason: 'PASSWORD_CHANGED',
            },
        });
    });

    return { message: 'Password reset successfully. Please sign in again.' };

}


module.exports = {
    createPasswordResetToken,
    hashResetToken,
    resetPassword,

};
