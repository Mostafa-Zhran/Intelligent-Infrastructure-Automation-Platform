// معالج مسارات تكامل GitHub
const asyncHandler = require('../../../utils/asyncHandler');
const githubService = require('./github.service');
const githubOAuthService = require('./github.oauth.service');

const startOAuth = asyncHandler(async (req, res) => {
    const result = await githubService.startConnection(req.user.id);

    res.status(200).json({
        success: true,
        data: {
        authorizationUrl: result.authorizationUrl,
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        },
    });
});

const handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
        const result = await githubOAuthService.handleCallback({
            code: typeof code === 'string' ? code : undefined,
            state: typeof state === 'string' ? state : undefined,
            error: typeof error === 'string' ? error : undefined,
            errorDescription: typeof errorDescription === 'string' ? errorDescription : undefined,
            authenticatedUserId: req.user.id,
        });

        const redirectUrl = new URL('/profile', frontendUrl);
        redirectUrl.searchParams.set('github', 'connected');
        redirectUrl.searchParams.set('login', result.githubLogin);
        return res.redirect(302, redirectUrl.toString());
    } catch (err) {
        const redirectUrl = new URL('/profile', frontendUrl);
        redirectUrl.searchParams.set('github', 'error');
        redirectUrl.searchParams.set('reason', err.message || 'unknown_error');
        return res.redirect(302, redirectUrl.toString());
    }
});

const getStatus = asyncHandler(async (req, res) => {
    const status = await githubService.getConnectionStatus(req.user.id);

    res.status(200).json({
        success: true,
        data: status,
    });
});

const getOrganizations = asyncHandler(async (req, res) => {
    const expectParam = req.query.expect;
    let expect = [];

    if (typeof expectParam === 'string' && expectParam.trim()) {
        expect = expectParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    const result = await githubService.getOrganizations(req.user.id, expect);

    res.status(200).json({
        success: true,
        data: result,
    });
});

const getRepositories = asyncHandler(async (req, res) => {
    const { owner, page, per_page: perPageRaw } = req.query;

    const result = await githubService.getRepositories(req.user.id, {
        owner: typeof owner === 'string' ? owner : undefined,
        page: page ? Number(page) : 1,
        perPage: perPageRaw ? Number(perPageRaw) : 100,
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

const getRepositoryBranches = asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;
    const { page, per_page: perPageRaw } = req.query;

    const result = await githubService.getRepositoryBranches(req.user.id, {
        owner,
        repo,
        page: page ? Number(page) : 1,
        perPage: perPageRaw ? Number(perPageRaw) : 100,
    });

    res.status(200).json({
        success: true,
        data: result,
    });
});

module.exports = {
    startOAuth,
    handleCallback,
    getStatus,
    getOrganizations,
    getRepositories,
    getRepositoryBranches,
};