// backend/src/modules/integrations/github/github.repository.js

// عمليات قاعدة البيانات المتعلقة بتكامل GitHub
const prisma = require('../../../db/prisma');

async function createOAuthState({ userId, stateHash, expiresAt }) {
    return prisma.github_oauth_states.create({
        data: {
            user_id: userId,
            state_hash: stateHash,
            expires_at: expiresAt,
        },
    });
}

async function invalidateActiveStatesForUser(userId) {
    return prisma.github_oauth_states.updateMany({
        where: { user_id: userId, used_at: null },
        data: { used_at: new Date() },
    });
}

async function consumeStateForUser({ stateHash, authenticatedUserId }) {
    return prisma.$transaction(
        async (tx) => {
            const now = new Date();
            const state = await tx.github_oauth_states.findFirst({
                where: {
                    state_hash: stateHash,
                    used_at: null,
                    expires_at: { gt: now },
                },
            });

            if (!state) {
                return null;
            }

            if (!authenticatedUserId || state.user_id !== authenticatedUserId) {
                return null;
            }

            const consumed = await tx.github_oauth_states.updateMany({
                where: {
                    id: state.id,
                    used_at: null,
                    expires_at: { gt: now },
                },
                data: { used_at: now },
            });

            if (consumed.count !== 1) {
                return null;
            }

            return state;
        },
        { isolationLevel: 'Serializable' }
    );
}

async function upsertConnection({
    userId,
    githubUserId,
    githubLogin,
    encrypted,
    scopes,
    connectedAt,
}) {
    return prisma.github_connections.upsert({
        where: { user_id: userId },
        create: {
        user_id: userId,
        github_user_id: String(githubUserId),
        github_login: githubLogin,
        token_ciphertext: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_tag: encrypted.tag,
        token_key_version: encrypted.keyVersion,
        token_scopes: scopes,
        connected_at: connectedAt,
        },
        update: {
        github_user_id: String(githubUserId),
        github_login: githubLogin,
        token_ciphertext: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_tag: encrypted.tag,
        token_key_version: encrypted.keyVersion,
        token_scopes: scopes,
        connected_at: connectedAt,
        revoked_at: null,
        revoked_reason: null,
        },
    });
}

async function findConnectionByUserId(userId) {
    return prisma.github_connections.findUnique({
        where: { user_id: userId },
    });
}

async function markConnectionRevoked(connectionId, reason) {
    return prisma.github_connections.update({
        where: { id: connectionId },
        data: {
            revoked_at: new Date(),
            revoked_reason: reason,
        },
    });
}

module.exports = {
    createOAuthState,
    invalidateActiveStatesForUser,
    consumeStateForUser,
    upsertConnection,
    findConnectionByUserId,
    markConnectionRevoked,
};