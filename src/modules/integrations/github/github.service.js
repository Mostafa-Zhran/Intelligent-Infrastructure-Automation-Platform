// منطق بدء اتصال GitHub، حالة الاتصال، المنظمات، المستودعات، والفروع
const crypto = require('crypto');
const githubConfig = require('./github.config');
const githubRepository = require('./github.repository');
const { encryptToken, decryptToken } = require('./github.crypto');
const {
  validateToken,
  fetchUserOrganizations,
  fetchRepositories,
  fetchRepository,
  fetchRepositoryBranches,
} = require('./github.api.service');
const ApiError = require('../../../utils/ApiError');

function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

function hashState(state) {
  return crypto.createHash('sha256').update(state).digest('hex');
}

function buildAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: githubConfig.clientId(),
    redirect_uri: githubConfig.redirectUri(),
    scope: githubConfig.scopes().join(' '),
    state,
    allow_signup: 'true',
  });
  return `${githubConfig.authorizationBaseUrl}?${params.toString()}`;
}

async function startConnection(userId) {
  await githubRepository.invalidateActiveStatesForUser(userId);

  const state = generateState();
  const stateHash = hashState(state);
  const ttlMs = githubConfig.stateTtlMinutes() * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);

  await githubRepository.createOAuthState({ userId, stateHash, expiresAt });

  return {
    authorizationUrl: buildAuthorizationUrl(state),
    expiresAt,
    scopes: githubConfig.scopes(),
  };
}

async function getConnectionStatus(userId) {
  const connection = await githubRepository.findConnectionByUserId(userId);

  if (!connection) {
    return { connected: false };
  }

  if (connection.revoked_at) {
    return {
      connected: false,
      reason: connection.revoked_reason || 'revoked',
    };
  }

  let accessToken;
  try {
    accessToken = decryptToken({
      ciphertext: connection.token_ciphertext,
      iv: connection.token_iv,
      tag: connection.token_tag,
    });
  } catch (err) {
    await githubRepository.markConnectionRevoked(connection.id, 'DECRYPTION_FAILED');
    return { connected: false, reason: 'decryption_failed' };
  }

  const validation = await validateToken(accessToken);

  if (validation.valid === false) {
    await githubRepository.markConnectionRevoked(connection.id, 'TOKEN_REVOKED');
    return { connected: false, reason: 'token_revoked' };
  }

  const baseAccount = {
    login: connection.github_login,
    id: connection.github_user_id,
  };

  if (validation.valid === null) {
    return {
      connected: true,
      verification: 'unavailable',
      verificationReason: validation.reason,
      account: baseAccount,
      scopes: connection.token_scopes,
      connectedAt: connection.connected_at,
    };
  }

  return {
    connected: true,
    verification: 'ok',
    account: {
      login: validation.user.login,
      id: String(validation.user.id),
      name: validation.user.name || null,
      avatarUrl: validation.user.avatar_url || null,
    },
    scopes: connection.token_scopes,
    connectedAt: connection.connected_at,
  };
}

async function getOrganizations(userId, expect = []) {
  const connection = await githubRepository.findConnectionByUserId(userId);

  if (!connection) {
    throw new ApiError(409, 'GitHub account is not connected');
  }

  if (connection.revoked_at) {
    throw new ApiError(409, `GitHub connection is revoked: ${connection.revoked_reason || 'unknown'}`);
  }

  let accessToken;
  try {
    accessToken = decryptToken({
      ciphertext: connection.token_ciphertext,
      iv: connection.token_iv,
      tag: connection.token_tag,
    });
  } catch (err) {
    await githubRepository.markConnectionRevoked(connection.id, 'DECRYPTION_FAILED');
    throw new ApiError(409, 'GitHub connection must be re-established');
  }

  const userValidation = await validateToken(accessToken);
  if (userValidation.valid === false) {
    await githubRepository.markConnectionRevoked(connection.id, 'TOKEN_REVOKED');
    throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
  }
  if (userValidation.valid === null) {
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const orgsResult = await fetchUserOrganizations(accessToken);

  let organizations = [];
  let canReadOrgs = false;

  if (orgsResult.ok) {
    canReadOrgs = true;
    organizations = orgsResult.organizations.map((org) => ({
      login: org.login,
      id: String(org.id),
      description: org.description || null,
      avatarUrl: org.avatar_url || null,
    }));
  } else if (orgsResult.reason === 'insufficient_scope') {
    canReadOrgs = false;
    organizations = [];
  } else if (orgsResult.reason === 'token_revoked') {
    await githubRepository.markConnectionRevoked(connection.id, 'TOKEN_REVOKED');
    throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
  } else {
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const availableLogins = new Set(organizations.map((o) => o.login.toLowerCase()));
  const missing = [];

  for (const expectedLogin of expect) {
    const normalized = String(expectedLogin).trim();
    if (!normalized) continue;
    if (availableLogins.has(normalized.toLowerCase())) continue;

    missing.push({
      login: normalized,
      reason: canReadOrgs ? 'not_a_member' : 'insufficient_scope',
    });
  }

  return {
    account: {
      login: userValidation.user.login,
      id: String(userValidation.user.id),
      name: userValidation.user.name || null,
      avatarUrl: userValidation.user.avatar_url || null,
    },
    organizations,
    permissions: {
      canReadOrgs,
    },
    missing,
    scopes: connection.token_scopes,
  };
}

/**
 * دالة مساعدة داخلية: تجيب اتصال نشط + توكن صالح + تحدد نوع المالك.
 * ترمي ApiError جاهزة للاستخدام في الـ controller.
 */
async function resolveAccessContext(userId, owner) {
  if (!owner || typeof owner !== 'string' || !owner.trim()) {
    throw new ApiError(400, 'The owner parameter is required');
  }

  const connection = await githubRepository.findConnectionByUserId(userId);

  if (!connection) {
    throw new ApiError(409, 'GitHub account is not connected');
  }

  if (connection.revoked_at) {
    throw new ApiError(409, `GitHub connection is revoked: ${connection.revoked_reason || 'unknown'}`);
  }

  let accessToken;
  try {
    accessToken = decryptToken({
      ciphertext: connection.token_ciphertext,
      iv: connection.token_iv,
      tag: connection.token_tag,
    });
  } catch (err) {
    await githubRepository.markConnectionRevoked(connection.id, 'DECRYPTION_FAILED');
    throw new ApiError(409, 'GitHub connection must be re-established');
  }

  const userValidation = await validateToken(accessToken);
  if (userValidation.valid === false) {
    await githubRepository.markConnectionRevoked(connection.id, 'TOKEN_REVOKED');
    throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
  }
  if (userValidation.valid === null) {
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const requestedOwner = owner.trim();
  const isPersonalOwner =
    requestedOwner.toLowerCase() === userValidation.user.login.toLowerCase();

  let ownerType = null;

  if (isPersonalOwner) {
    ownerType = 'user';
  } else {
    const orgsResult = await fetchUserOrganizations(accessToken);

    if (orgsResult.reason === 'token_revoked') {
      await githubRepository.markConnectionRevoked(connection.id, 'TOKEN_REVOKED');
      throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
    }

    if (!orgsResult.ok) {
      throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
    }

    const orgMatch = orgsResult.organizations.find(
      (org) => org.login.toLowerCase() === requestedOwner.toLowerCase()
    );

    if (!orgMatch) {
      throw new ApiError(403, `Owner "${requestedOwner}" is not available to the connected GitHub account`);
    }

    ownerType = 'org';
  }

  return {
    connection,
    accessToken,
    owner: requestedOwner,
    ownerType,
    user: userValidation.user,
  };
}

async function getRepositories(userId, { owner, page = 1, perPage = 100 }) {
  const ctx = await resolveAccessContext(userId, owner);

  const result = await fetchRepositories({
    accessToken: ctx.accessToken,
    owner: ctx.owner,
    ownerType: ctx.ownerType,
    page,
    perPage,
  });

  if (!result.ok) {
    if (result.reason === 'token_revoked') {
      await githubRepository.markConnectionRevoked(ctx.connection.id, 'TOKEN_REVOKED');
      throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
    }
    if (result.reason === 'not_found') {
      throw new ApiError(404, 'Repository owner or repository was not found, or is not accessible');
    }
    if (result.reason === 'forbidden') {
      throw new ApiError(403, 'GitHub denied access to this owner\'s repositories');
    }
    if (result.reason === 'validation_failed') {
      throw new ApiError(400, 'GitHub rejected the request parameters');
    }
    if (result.reason === 'rate_limited') {
      const err = new ApiError(429, 'GitHub rate limit exceeded. Please retry later.');
      err.rateLimitReset = result.rateLimitReset;
      throw err;
    }
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const repositories = result.repositories.map((repo) => ({
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    visibility: repo.private ? 'private' : 'public',
    isPrivate: !!repo.private,
    defaultBranch: repo.default_branch || null,
    owner: {
      login: repo.owner?.login || ctx.owner,
      id: repo.owner?.id ? String(repo.owner.id) : null,
      type: repo.owner?.type || (ctx.ownerType === 'org' ? 'Organization' : 'User'),
    },
    description: repo.description || null,
    updatedAt: repo.updated_at || null,
  }));

  return {
    owner: {
      login: ctx.owner,
      type: ctx.ownerType === 'org' ? 'Organization' : 'User',
    },
    repositories,
    pagination: result.pagination,
    scopes: ctx.connection.token_scopes,
  };
}

/**
 * ترجع فروع مستودع محدد، مع تحديد الفرع الافتراضي.
 * تتعامل مع المستودع الفاضي (409 من GitHub) كقائمة فروع فارغة.
 */
async function getRepositoryBranches(userId, { owner, repo, page = 1, perPage = 100 }) {
  if (!repo || typeof repo !== 'string' || !repo.trim()) {
    throw new ApiError(400, 'The repository name is required');
  }

  const ctx = await resolveAccessContext(userId, owner);
  const repoName = repo.trim();

  const repoResult = await fetchRepository({
    accessToken: ctx.accessToken,
    owner: ctx.owner,
    repo: repoName,
  });

  if (!repoResult.ok) {
    if (repoResult.reason === 'token_revoked') {
      await githubRepository.markConnectionRevoked(ctx.connection.id, 'TOKEN_REVOKED');
      throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
    }
    if (repoResult.reason === 'not_found') {
      throw new ApiError(404, 'Repository not found or not accessible');
    }
    if (repoResult.reason === 'forbidden') {
      throw new ApiError(403, 'GitHub denied access to this repository');
    }
    if (repoResult.reason === 'rate_limited') {
      const err = new ApiError(429, 'GitHub rate limit exceeded. Please retry later.');
      err.rateLimitReset = repoResult.rateLimitReset;
      throw err;
    }
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const repository = repoResult.repository;
  const defaultBranch = repository.default_branch || null;

  const branchesResult = await fetchRepositoryBranches({
    accessToken: ctx.accessToken,
    owner: ctx.owner,
    repo: repoName,
    page,
    perPage,
  });

  if (!branchesResult.ok) {
    if (branchesResult.reason === 'token_revoked') {
      await githubRepository.markConnectionRevoked(ctx.connection.id, 'TOKEN_REVOKED');
      throw new ApiError(401, 'GitHub token has been revoked. Please reconnect.');
    }
    if (branchesResult.reason === 'not_found') {
      throw new ApiError(404, 'Repository branches are not accessible');
    }
    if (branchesResult.reason === 'forbidden') {
      throw new ApiError(403, 'GitHub denied access to this repository\'s branches');
    }
    if (branchesResult.reason === 'rate_limited') {
      const err = new ApiError(429, 'GitHub rate limit exceeded. Please retry later.');
      err.rateLimitReset = branchesResult.rateLimitReset;
      throw err;
    }
    throw new ApiError(502, 'GitHub is temporarily unavailable. Please retry shortly.');
  }

  const branches = branchesResult.branches.map((branch) => ({
    name: branch.name,
    isDefault: defaultBranch ? branch.name === defaultBranch : false,
    protected: !!branch.protected,
    commit: branch.commit
      ? {
          sha: branch.commit.sha,
          url: branch.commit.url || null,
        }
      : null,
  }));

  return {
    repository: {
      id: String(repository.id),
      name: repository.name,
      fullName: repository.full_name,
      url: repository.html_url,
      visibility: repository.private ? 'private' : 'public',
      isPrivate: !!repository.private,
      defaultBranch,
    },
    branches,
    emptyRepository: branchesResult.emptyRepository,
    pagination: branchesResult.pagination,
    scopes: ctx.connection.token_scopes,
  };
}

module.exports = {
  startConnection,
  hashState,
  getConnectionStatus,
  getOrganizations,
  getRepositories,
  getRepositoryBranches,
};