// backend/src/modules/integrations/github/github.api.service.js
// التعامل مع GitHub API: تبادل الكود وجلب هوية المستخدم
const githubConfig = require('./github.config');

const REQUEST_TIMEOUT_MS = 10000;


async function exchangeCodeForToken(code) {
    const body = new URLSearchParams({
        client_id: githubConfig.clientId(),
        client_secret: githubConfig.clientSecret(),
        code,
        redirect_uri: githubConfig.redirectUri(),
    });

    const response = await fetch(githubConfig.tokenExchangeUrl, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
        const message = data.error_description || data.error || 'Token exchange failed';
        const err = new Error(message);
        err.code = data.error || 'token_exchange_failed';
        err.status = 400;
        throw err;
    }

    return data;
}

async function fetchGitHubUser(accessToken) {
    const response = await fetch(`${githubConfig.apiBaseUrl}/user`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });

    if (!response.ok) {
        const err = new Error('Failed to fetch GitHub user profile');
        err.status = 502;
        throw err;
    }

    return response.json();
}

async function validateToken(accessToken) {
    let response;
    try {
        response = await fetch(`${githubConfig.apiBaseUrl}/user`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            signal: AbortSignal.timeout(10000),
        });
    } catch (err) {
        return { valid: null, reason: 'network_error' };
    }

    if (response.status === 401) {
        return { valid: false, reason: 'token_revoked' };
    }

    if (!response.ok) {
        return { valid: null, reason: `github_unavailable_${response.status}` };
    }

    const user = await response.json();
    return { valid: true, user };
}

async function fetchUserOrganizations(accessToken) {
    let response;
    try {
        response = await fetch(
            `${githubConfig.apiBaseUrl}/user/orgs?per_page=100`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                signal: AbortSignal.timeout(10000),
            }
        );
    } catch (err) {
        return { ok: false, reason: 'network_error' };
    }

    if (response.status === 401) {
        return { ok: false, reason: 'token_revoked' };
    }

    if (response.status === 403) {
        return { ok: false, reason: 'insufficient_scope' };
    }

    if (!response.ok) {
        return { ok: false, reason: `github_unavailable_${response.status}` };
    }

    const organizations = await response.json();
    return { ok: true, organizations };
}

function parseLastPage(linkHeader) {
    if (!linkHeader || typeof linkHeader !== 'string') {
        return 1;
    }
    const lastMatch = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    if (lastMatch) {
        return Number(lastMatch[1]);
    }
    return 1;
}

async function fetchRepositories({
    accessToken,
    owner,
    ownerType,
    page = 1,
    perPage = 100,
}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 100));

    let url;
    if (ownerType === 'org') {
        url =
            `${githubConfig.apiBaseUrl}/orgs/${encodeURIComponent(owner)}/repos` +
            `?type=all&per_page=${safePerPage}&page=${safePage}&sort=updated&direction=desc`;
    } else {
        url =
            `${githubConfig.apiBaseUrl}/user/repos` +
            `?affiliation=owner&per_page=${safePerPage}&page=${safePage}&sort=updated&direction=desc`;
    }

    let response;
    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (err) {
        return { ok: false, reason: 'network_error' };
    }

    if (response.status === 401) {
        return { ok: false, reason: 'token_revoked' };
    }

    if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetEpoch = Number(response.headers.get('x-ratelimit-reset') || 0);
        if (remaining === '0') {
            return {
                ok: false,
                reason: 'rate_limited',
                rateLimitReset: resetEpoch > 0 ? new Date(resetEpoch * 1000) : null,
            };
        }
        return { ok: false, reason: 'forbidden' };
    }

    if (response.status === 404) {
        return { ok: false, reason: 'not_found' };
    }

    if (response.status === 422) {
        return { ok: false, reason: 'validation_failed' };
    }

    if (!response.ok) {
        return { ok: false, reason: `github_unavailable_${response.status}` };
    }

    const repositories = await response.json();
    const linkHeader = response.headers.get('link');
    const lastPage = parseLastPage(linkHeader);

    return {
        ok: true,
        repositories,
        pagination: {
            page: safePage,
            perPage: safePerPage,
            hasNext: safePage < lastPage,
            totalPages: lastPage,
        },
    };
}

async function fetchRepository({ accessToken, owner, repo }) {
    let response;
    try {
        response = await fetch(
            `${githubConfig.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }
        );
    } catch (err) {
        return { ok: false, reason: 'network_error' };
    }

    if (response.status === 401) {
        return { ok: false, reason: 'token_revoked' };
    }

    if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetEpoch = Number(response.headers.get('x-ratelimit-reset') || 0);
        if (remaining === '0') {
            return {
                ok: false,
                reason: 'rate_limited',
                rateLimitReset: resetEpoch > 0 ? new Date(resetEpoch * 1000) : null,
            };
        }
        return { ok: false, reason: 'forbidden' };
    }

    if (response.status === 404) {
        return { ok: false, reason: 'not_found' };
    }

    if (!response.ok) {
        return { ok: false, reason: `github_unavailable_${response.status}` };
    }

    const repository = await response.json();
    return { ok: true, repository };
}


async function fetchRepositoryBranches({
    accessToken,
    owner,
    repo,
    page = 1,
    perPage = 100,
}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number(perPage) || 100));

    const url =
        `${githubConfig.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches` +
        `?per_page=${safePerPage}&page=${safePage}`;

    let response;
    try {
        response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (err) {
        return { ok: false, reason: 'network_error' };
    }

    if (response.status === 401) {
        return { ok: false, reason: 'token_revoked' };
    }

    if (response.status === 403) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetEpoch = Number(response.headers.get('x-ratelimit-reset') || 0);
        if (remaining === '0') {
            return {
                ok: false,
                reason: 'rate_limited',
                rateLimitReset: resetEpoch > 0 ? new Date(resetEpoch * 1000) : null,
            };
        }
        return { ok: false, reason: 'forbidden' };
    }

    if (response.status === 404) {
        return { ok: false, reason: 'not_found' };
    }

    if (response.status === 409) {
        return {
            ok: true,
            branches: [],
            emptyRepository: true,
            pagination: {
                page: safePage,
                perPage: safePerPage,
                hasNext: false,
                totalPages: 1,
            },
        };
    }

    if (!response.ok) {
        return { ok: false, reason: `github_unavailable_${response.status}` };
    }

    const branches = await response.json();
    const linkHeader = response.headers.get('link');
    const lastPage = parseLastPage(linkHeader);

    return {
        ok: true,
        branches,
        emptyRepository: false,
        pagination: {
            page: safePage,
            perPage: safePerPage,
            hasNext: safePage < lastPage,
            totalPages: lastPage,
        },
    };
}

module.exports = {
    exchangeCodeForToken,
    fetchGitHubUser,
    validateToken,
    fetchUserOrganizations,
    fetchRepositories,
    fetchRepository,
    fetchRepositoryBranches,
};