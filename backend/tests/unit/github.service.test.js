// backend/tests/unit/github.service.test.js
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.GITHUB_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 'a').toString('base64');

const githubService = require('../../src/modules/integrations/github/github.service');
const githubRepository = require('../../src/modules/integrations/github/github.repository');
const githubApiService = require('../../src/modules/integrations/github/github.api.service');
const githubCrypto = require('../../src/modules/integrations/github/github.crypto');

describe('GitHub Service: Repository Analysis & .NET Classification', () => {
    const mockUserId = '11111111-2222-3333-4444-555555555555';
    const encryptedToken = githubCrypto.encryptToken('mock-gh-access-token');

    beforeEach(() => {
        mock.restoreAll();

        // Standard connection & auth mocks
        mock.method(githubRepository, 'findConnectionByUserId', async () => ({
            id: '12345678-1234-1234-1234-123456789012',
            user_id: mockUserId,
            github_login: 'acme-corp',
            github_user_id: '123456',
            token_ciphertext: encryptedToken.ciphertext,
            token_iv: encryptedToken.iv,
            token_tag: encryptedToken.tag,
            token_scopes: ['repo'],
            connected_at: new Date(),
            revoked_at: null,
        }));

        mock.method(githubRepository, 'markConnectionRevoked', async () => true);

        mock.method(githubApiService, 'validateToken', async () => ({
            valid: true,
            user: { login: 'acme-corp', id: 123456 },
        }));

        mock.method(githubApiService, 'fetchRepository', async () => ({
            ok: true,
            repository: { default_branch: 'main' },
        }));
    });

    it('should classify project as C# / .NET when *.csproj is in root', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'WeatherForecast.csproj', type: 'file' },
                        { name: 'Program.cs', type: 'file' },
                        { name: 'appsettings.json', type: 'file' },
                        { name: 'Dockerfile', type: 'file' },
                    ],
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'weather-api',
            branch: 'main',
        });

        assert.equal(result.supported, true);
        assert.equal(result.framework, 'C# / .NET');
        assert.equal(result.dockerfilePath, 'Dockerfile');
        assert.ok(result.manifests.includes('WeatherForecast.csproj'));
        assert.ok(result.detectedFiles.includes('WeatherForecast.csproj'));
        assert.ok(result.detectedFiles.includes('appsettings.json'));
    });

    it('should classify project as C# / .NET when *.sln and global.json are present', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'Enterprise.sln', type: 'file' },
                        { name: 'global.json', type: 'file' },
                        { name: 'Directory.Build.props', type: 'file' },
                        { name: 'README.md', type: 'file' },
                    ],
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'enterprise-solution',
            branch: 'main',
        });

        assert.equal(result.supported, false);
        assert.equal(result.framework, 'C# / .NET');
        assert.equal(result.dockerfilePath, null);
        assert.ok(result.manifests.includes('Enterprise.sln'));
        assert.ok(result.manifests.includes('global.json'));
        assert.ok(result.manifests.includes('Directory.Build.props'));
        assert.match(result.reason, /No Dockerfile detected/);
    });

    it('should classify modern .NET 9 project when *.slnx solution file is present', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'CoreApp.slnx', type: 'file' },
                        { name: 'Dockerfile', type: 'file' },
                    ],
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'core-app',
            branch: 'main',
        });

        assert.equal(result.supported, true);
        assert.equal(result.framework, 'C# / .NET');
        assert.ok(result.manifests.includes('CoreApp.slnx'));
    });

    it('should classify C# / .NET project when .csproj resides in src/ subfolder', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'src', type: 'dir' },
                        { name: 'Dockerfile', type: 'file' },
                        { name: 'README.md', type: 'file' },
                    ],
                };
            }
            if (path === 'src') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'OrderService.csproj', type: 'file' },
                        { name: 'Program.cs', type: 'file' },
                    ],
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'order-service',
            branch: 'main',
        });

        assert.equal(result.supported, true);
        assert.equal(result.framework, 'C# / .NET');
        assert.ok(result.manifests.includes('src/OrderService.csproj'));
    });

    it('should preserve existing Node.js classification without interference', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'package.json', type: 'file' },
                        { name: 'Dockerfile', type: 'file' },
                    ],
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'node-app',
            branch: 'main',
        });

        assert.equal(result.supported, true);
        assert.equal(result.hasDockerfile, true);
        assert.equal(result.framework, 'Node.js');
        assert.deepEqual(result.manifests, ['package.json']);
    });

    it('SAAS-01: should detect Dockerfile inside .docker/ directory when missing from root', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [
                        { name: 'package.json', type: 'file' },
                        { name: '.docker', type: 'dir' },
                    ],
                };
            }
            if (path === '.docker/Dockerfile') {
                return {
                    ok: true,
                    isDirectory: false,
                    file: { name: 'Dockerfile', path: '.docker/Dockerfile' },
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'node-app',
            branch: 'main',
        });

        assert.equal(result.supported, true);
        assert.equal(result.hasDockerfile, true);
        assert.equal(result.dockerfilePath, '.docker/Dockerfile');
    });

    it('SAAS-01: should normalize leading ./ in custom dockerfilePath', async () => {
        mock.method(githubApiService, 'fetchRepositoryContents', async ({ path }) => {
            if (path === '') {
                return {
                    ok: true,
                    isDirectory: true,
                    entries: [{ name: 'backend', type: 'dir' }],
                };
            }
            if (path === 'backend/Dockerfile') {
                return {
                    ok: true,
                    isDirectory: false,
                    file: { name: 'Dockerfile', path: 'backend/Dockerfile' },
                };
            }
            return { ok: false, reason: 'not_found' };
        });

        const result = await githubService.analyzeRepository({
            userId: mockUserId,
            owner: 'acme-corp',
            repo: 'monorepo',
            branch: 'main',
            dockerfilePath: './backend/Dockerfile',
        });

        assert.equal(result.supported, true);
        assert.equal(result.hasDockerfile, true);
        assert.equal(result.dockerfilePath, 'backend/Dockerfile');
    });
});
