// tests/unit/dashboard.service.test.js
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

const dashboardService = require('../../src/modules/dashboard/dashboard.service');
const dashboardRepository = require('../../src/modules/dashboard/dashboard.repository');

describe('Dashboard Service Unit Tests (DASH-01, DASH-02)', () => {
    const mockUser = {
        id: 'user-uuid-1111',
        name: 'Developer One',
        email: 'dev@company.com',
        role: 'USER',
    };

    const mockAdminUser = {
        id: 'admin-uuid-9999',
        name: 'Platform Admin',
        email: 'admin@company.com',
        role: 'ADMIN',
    };

    beforeEach(() => {
        mock.restoreAll();
    });

    describe('DASH-01: getDashboardSummary', () => {
        it('should return aggregated metrics, project list, and recent deployments', async () => {
            mock.method(dashboardRepository, 'getDashboardMetricsForUser', async () => ({
                totalProjects: 3,
                runningDeployments: 1,
                failedDeployments: 0,
                succeededDeployments: 2,
            }));

            mock.method(dashboardRepository, 'getDashboardProjectsForUser', async () => [
                {
                    id: 'proj-1',
                    name: 'web-service',
                    slug: 'web-service',
                    description: 'Main web client',
                    repository_url: 'https://github.com/org/web-service.git',
                    repository_branch: 'main',
                    default_environment: 'production',
                    setup_status: 'READY',
                    github_repo_full_name: 'org/web-service',
                    created_at: new Date('2026-10-01'),
                    updated_at: new Date('2026-10-02'),
                    deployments: [
                        {
                            id: 'dep-1',
                            environment: 'production',
                            status: 'SUCCEEDED',
                            branch: 'main',
                            commit_sha: 'abcdef1234567890abcdef1234567890abcdef12',
                            error_message: null,
                            created_at: new Date('2026-10-02'),
                            started_at: new Date('2026-10-02'),
                            finished_at: new Date('2026-10-02'),
                        },
                    ],
                },
            ]);

            mock.method(dashboardRepository, 'getRecentDeploymentsForUser', async () => [
                {
                    id: 'dep-1',
                    project_id: 'proj-1',
                    environment: 'production',
                    status: 'SUCCEEDED',
                    branch: 'main',
                    commit_sha: 'abcdef1234567890abcdef1234567890abcdef12',
                    error_message: null,
                    created_at: new Date('2026-10-02'),
                    started_at: new Date('2026-10-02'),
                    finished_at: new Date('2026-10-02'),
                    projects: {
                        name: 'web-service',
                        github_repo_full_name: 'org/web-service',
                        repository_url: 'https://github.com/org/web-service.git',
                    },
                    users: {
                        name: 'Developer One',
                        email: 'dev@company.com',
                    },
                },
            ]);

            const summary = await dashboardService.getDashboardSummary(mockUser);

            assert.strictEqual(summary.metrics.totalProjects, 3);
            assert.strictEqual(summary.metrics.runningDeployments, 1);
            assert.strictEqual(summary.projects.length, 1);
            assert.strictEqual(summary.projects[0].name, 'web-service');
            assert.strictEqual(summary.projects[0].latestDeployment.status, 'SUCCEEDED');
            assert.strictEqual(summary.recentDeployments.length, 1);
            assert.strictEqual(summary.recentDeployments[0].projectName, 'web-service');
        });

        it('should pass isAdmin flag to repository when user is ADMIN', async () => {
            let passedAdmin = false;
            mock.method(dashboardRepository, 'getDashboardMetricsForUser', async (userId, isAdmin) => {
                passedAdmin = isAdmin;
                return { totalProjects: 0, runningDeployments: 0, failedDeployments: 0, succeededDeployments: 0 };
            });
            mock.method(dashboardRepository, 'getDashboardProjectsForUser', async () => []);
            mock.method(dashboardRepository, 'getRecentDeploymentsForUser', async () => []);

            await dashboardService.getDashboardSummary(mockAdminUser);
            assert.strictEqual(passedAdmin, true);
        });
    });

    describe('DASH-02: getRecentDeployments', () => {
        it('should cap limit at 50 if user requests excessive amount', async () => {
            let requestedLimit = 0;
            mock.method(dashboardRepository, 'getRecentDeploymentsForUser', async (userId, isAdmin, limit) => {
                requestedLimit = limit;
                return [];
            });

            const result = await dashboardService.getRecentDeployments(mockUser, 100);
            assert.strictEqual(requestedLimit, 50);
            assert.strictEqual(result.limit, 50);
        });

        it('should default limit to 10 when not specified', async () => {
            let requestedLimit = 0;
            mock.method(dashboardRepository, 'getRecentDeploymentsForUser', async (userId, isAdmin, limit) => {
                requestedLimit = limit;
                return [];
            });

            const result = await dashboardService.getRecentDeployments(mockUser, undefined);
            assert.strictEqual(requestedLimit, 10);
            assert.strictEqual(result.limit, 10);
        });
    });
});
