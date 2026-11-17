// backend/src/modules/integrations/github/github.config.js
require('dotenv').config();
const ApiError = require('../../../utils/ApiError');

function requireEnv(key) {
    const value = process.env[key];
    if (!value || !value.trim()) {
        throw new ApiError(500, `Missing required environment variable: ${key}. Please add it to your Railway Variables.`);
    }
    return value.trim();
}

const githubConfig = {
    clientId: () => requireEnv('GITHUB_CLIENT_ID'),
    clientSecret: () => requireEnv('GITHUB_CLIENT_SECRET'),
    redirectUri: () => requireEnv('GITHUB_OAUTH_REDIRECT_URI'),
    stateTtlMinutes: () => Number(process.env.GITHUB_OAUTH_STATE_TTL_MINUTES || 10),
    scopes: () =>
        (process.env.GITHUB_OAUTH_SCOPES || 'read:user read:org repo')
        .split(/\s+/)
        .filter(Boolean),
    authorizationBaseUrl: 'https://github.com/login/oauth/authorize',
    tokenExchangeUrl: 'https://github.com/login/oauth/access_token',
    apiBaseUrl: 'https://api.github.com',
};

module.exports = githubConfig;
