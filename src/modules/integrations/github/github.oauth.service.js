// منطق استقبال callback من GitHub: التحقق من state، تبادل الكود، تخزين التوكن
const ApiError = require('../../../utils/ApiError');
const githubRepository = require('./github.repository');
const { hashState } = require('./github.service');
const { encryptToken } = require('./github.crypto');
const { exchangeCodeForToken, fetchGitHubUser } = require('./github.api.service');

async function handleCallback({
    code,
    state,
    error,
    errorDescription,
    authenticatedUserId,
}) {
    if (error) {
        throw new ApiError(400, errorDescription || `GitHub OAuth error: ${error}`);
    }

    if (!code || !state) {
        throw new ApiError(400, 'Missing code or state in callback');
    }

    if (!authenticatedUserId) {
        throw new ApiError(401, 'Authenticated session required to complete GitHub connection');
    }

    const stateHash = hashState(state);
    const stateRecord = await githubRepository.consumeStateForUser({
        stateHash,
        authenticatedUserId,
    });

    if (!stateRecord) {
        throw new ApiError(400, 'Invalid, expired, used, or mismatched OAuth state');
    }

    const tokenData = await exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;
    if (!accessToken) {
        throw new ApiError(502, 'GitHub did not return an access token');
    }

    const githubUser = await fetchGitHubUser(accessToken);
    if (!githubUser?.id || !githubUser?.login) {
        throw new ApiError(502, 'GitHub user identity is incomplete');
    }

    const encrypted = encryptToken(accessToken);
    const scopes = (tokenData.scope || '').split(/[,\s]+/).filter(Boolean);

    await githubRepository.upsertConnection({
        userId: stateRecord.user_id,
        githubUserId: githubUser.id,
        githubLogin: githubUser.login,
        encrypted,
        scopes,
        connectedAt: new Date(),
    });

    return {
        userId: stateRecord.user_id,
        githubLogin: githubUser.login,
    };
}

module.exports = { handleCallback };