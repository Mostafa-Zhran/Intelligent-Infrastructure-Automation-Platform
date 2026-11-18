// backend/tests/unit/github.actions.service.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const githubActionsService = require('../../src/modules/integrations/github/github.actions.service');

describe('GitHub Actions CI Service Unit Tests', () => {
    it('buildDeploymentContract creates safe non-secret payload', () => {
        const contract = githubActionsService.buildDeploymentContract({
            project: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'My Project',
                slug: 'my-project',
                github_repo_full_name: 'acme/webapp',
                repository_url: 'https://github.com/acme/webapp.git',
            },
            deployment: {
                id: '987e6543-e21b-12d3-a456-426614174000',
            },
            branch: 'feature-x',
            commitSha: 'a'.repeat(40),
            environment: 'development',
            dockerfilePath: 'Dockerfile',
            replicas: 2,
            correlationId: 'corr-12345',
            user: { id: 'user-001', role: 'ADMIN' },
        });

        assert.equal(contract.contractVersion, '1.0.0');
        assert.equal(contract.projectId, '123e4567-e89b-12d3-a456-426614174000');
        assert.equal(contract.deploymentId, '987e6543-e21b-12d3-a456-426614174000');
        assert.equal(contract.repository.fullName, 'acme/webapp');
        assert.equal(contract.git.branch, 'feature-x');
        assert.equal(contract.git.commitSha, 'a'.repeat(40));
        assert.equal(contract.targetEnvironment, 'development');
        assert.equal(contract.build.dockerfilePath, 'Dockerfile');
        assert.equal(contract.correlationId, 'corr-12345');
    });

    it('sanitizeErrorMessage redacts sensitive credentials and limits length', () => {
        const raw = 'Failed with token: ghp_1234567890abcdef and password=SuperSecretPassword123';
        const sanitized = githubActionsService.sanitizeErrorMessage(raw, 250);

        assert.ok(!sanitized.includes('SuperSecretPassword123'));
        assert.ok(!sanitized.includes('ghp_1234567890abcdef'));
        assert.ok(sanitized.includes('[REDACTED]'));
    });

    it('triggerDeploymentJob in mock mode returns QUEUED with GITHUB_ACTIONS provider', async () => {
        process.env.CI_INTEGRATION_MODE = 'mock';

        const result = await githubActionsService.triggerDeploymentJob({
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            deploymentId: '987e6543-e21b-12d3-a456-426614174000',
            repository: { fullName: 'acme/webapp' },
            git: { branch: 'main', commitSha: 'a'.repeat(40) },
            targetEnvironment: 'development',
            build: { dockerfilePath: 'Dockerfile' },
        });

        assert.equal(result.success, true);
        assert.equal(result.provider, 'GITHUB_ACTIONS');
        assert.equal(result.status, 'QUEUED');
        assert.ok(result.jobId.startsWith('gha-mock-'));
    });
});
