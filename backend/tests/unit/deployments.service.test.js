// tests/unit/deployments.service.test.js
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const deploymentsService = require('../../src/modules/deployments/deployments.service');
const deploymentsRepository = require('../../src/modules/deployments/deployments.repository');
const ApiError = require('../../src/utils/ApiError');

describe('Deployments Service Unit Tests (DEP-01..04)', () => {
    const mockUserId = 'user-uuid-1111';
    const mockAdminId = 'admin-uuid-9999';
    const mockStrangerId = 'stranger-uuid-3333';
    const mockDeploymentId = 'dep-uuid-5555';

    const mockUser = { id: mockUserId, role: 'USER' };
    const mockAdmin = { id: mockAdminId, role: 'ADMIN' };
    const mockStranger = { id: mockStrangerId, role: 'USER' };

    const baseDeployment = {
        id: mockDeploymentId,
        project_id: 'proj-uuid-1',
        environment: 'development',
        status: 'RUNNING',
        branch: 'main',
        commit_sha: '1234567890abcdef1234567890abcdef12345678',
        repository_url: 'https://github.com/org/app.git',
        replicas: 2,
        error_message: null,
        started_at: new Date('2026-10-01T10:00:00Z'),
        finished_at: null,
        created_at: new Date('2026-10-01T09:59:00Z'),
        updated_at: new Date('2026-10-01T10:00:00Z'),
        projects: {
            id: 'proj-uuid-1',
            name: 'app-service',
            slug: 'app-service',
            owner_user_id: mockUserId,
            github_repo_full_name: 'org/app',
            project_memberships: [],
        },
        users: { id: mockUserId, name: 'Alice', email: 'alice@test.com' },
        ci_jobs: [],
        deployment_steps: [
            {
                id: 'step-1',
                step_order: 1,
                step_name: 'Clone Repository',
                status: 'COMPLETED',
                started_at: new Date('2026-10-01T10:00:00Z'),
                finished_at: new Date('2026-10-01T10:00:05Z'),
                exit_code: 0,
                error_message: null,
            },
        ],
        deployment_events: [
            {
                id: 'ev-1',
                from_state: 'QUEUED',
                to_state: 'RUNNING',
                stage: 'CI_DISPATCH',
                message: 'Build accepted by runner',
                created_at: new Date('2026-10-01T10:00:00Z'),
            },
        ],
    };

    beforeEach(() => {
        mock.restoreAll();
    });

    describe('DEP-01: listDeployments', () => {
        it('should return paginated deployments visible to the user', async () => {
            mock.method(deploymentsRepository, 'listDeploymentsForUser', async () => [baseDeployment]);
            mock.method(deploymentsRepository, 'countDeploymentsForUser', async () => 1);

            const result = await deploymentsService.listDeployments(mockUser, { page: 1, per_page: 20 });

            assert.strictEqual(result.deployments.length, 1);
            assert.strictEqual(result.deployments[0].id, mockDeploymentId);
            assert.strictEqual(result.pagination.total, 1);
            assert.strictEqual(result.pagination.totalPages, 1);
        });
    });

    describe('DEP-02: getDeploymentById', () => {
        it('should return deployment details with steps and events for owner', async () => {
            mock.method(deploymentsRepository, 'findDeploymentById', async () => baseDeployment);

            const result = await deploymentsService.getDeploymentById(mockDeploymentId, mockUser);

            assert.strictEqual(result.id, mockDeploymentId);
            assert.strictEqual(result.steps.length, 1);
            assert.strictEqual(result.events.length, 1);
            assert.strictEqual(result.steps[0].name, 'Clone Repository');
        });

        it('should allow platform ADMIN even if not project owner or member', async () => {
            mock.method(deploymentsRepository, 'findDeploymentById', async () => baseDeployment);

            const result = await deploymentsService.getDeploymentById(mockDeploymentId, mockAdmin);
            assert.strictEqual(result.id, mockDeploymentId);
        });

        it('should throw 403 Forbidden for unauthorized stranger', async () => {
            mock.method(deploymentsRepository, 'findDeploymentById', async () => baseDeployment);

            await assert.rejects(
                async () => deploymentsService.getDeploymentById(mockDeploymentId, mockStranger),
                (err) => err instanceof ApiError && err.statusCode === 403
            );
        });

        it('should throw 404 if deployment does not exist', async () => {
            mock.method(deploymentsRepository, 'findDeploymentById', async () => null);

            await assert.rejects(
                async () => deploymentsService.getDeploymentById('unknown-id', mockUser),
                (err) => err instanceof ApiError && err.statusCode === 404
            );
        });
    });

    describe('DEP-03: getDeploymentLogs', () => {
        it('should redact secrets (passwords, tokens, keys) from log messages', async () => {
            mock.method(deploymentsRepository, 'findDeploymentById', async () => baseDeployment);
            mock.method(deploymentsRepository, 'getDeploymentLogs', async () => [
                {
                    id: 'log-1',
                    step_id: 'step-1',
                    source: 'build',
                    level: 'INFO',
                    message: 'Running build with token=ghp_secretTokenValue12345 and password: SuperSecretPassword!',
                    logged_at: new Date(),
                },
                {
                    id: 'log-2',
                    step_id: 'step-1',
                    source: 'build',
                    level: 'INFO',
                    message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs.someSecretJwtPayload.signature',
                    logged_at: new Date(),
                },
            ]);

            const result = await deploymentsService.getDeploymentLogs(mockDeploymentId, mockUser);

            assert.strictEqual(result.logs.length, 2);
            assert.ok(!result.logs[0].message.includes('ghp_secretTokenValue12345'));
            assert.ok(!result.logs[0].message.includes('SuperSecretPassword!'));
            assert.ok(result.logs[0].message.includes('[REDACTED]'));
            assert.ok(!result.logs[1].message.includes('eyJhbGciOiJIUzI1NiIs'));
            assert.ok(result.logs[1].message.includes('[REDACTED]'));
        });
    });

    describe('DEP-04: updateDeploymentStatus', () => {
        it('should update status and return result message', async () => {
            mock.method(deploymentsRepository, 'updateDeploymentStatus', async () => ({
                deployment: { ...baseDeployment, status: 'SUCCEEDED', updated_at: new Date() },
                skipped: false,
            }));

            const result = await deploymentsService.updateDeploymentStatus(mockDeploymentId, {
                status: 'SUCCEEDED',
            });

            assert.strictEqual(result.deployment.status, 'SUCCEEDED');
            assert.ok(result.message.includes('SUCCEEDED'));
        });

        it('should reject invalid status with 400 Bad Request', async () => {
            await assert.rejects(
                async () => deploymentsService.updateDeploymentStatus(mockDeploymentId, { status: 'INVALID_STATUS' }),
                (err) => err instanceof ApiError && err.statusCode === 400
            );
        });
    });
});

