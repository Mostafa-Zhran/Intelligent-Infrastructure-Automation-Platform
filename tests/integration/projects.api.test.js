// tests/integration/projects.api.test.js
const { describe, it, before, after, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-api-tests-32chars!';
process.env.JENKINS_INTEGRATION_MODE = 'mock';

const app = require('../../src/app');
const tokenService = require('../../src/modules/auth/token.service');
const projectsRepository = require('../../src/modules/projects/projects.repository');
const githubService = require('../../src/modules/integrations/github/github.service');
const jenkinsService = require('../../src/modules/integrations/jenkins/jenkins.service');

describe('Projects and Deployments HTTP API Integration Tests', () => {
    let server;
    let baseUrl;

    const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockOwnerId = '223e4567-e89b-12d3-a456-426614174000';
    const mockViewerId = '323e4567-e89b-12d3-a456-426614174000';
    const validCommitSha = '9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a';

    let ownerToken;
    let viewerToken;

    const sampleProject = {
        id: mockProjectId,
        name: 'Production Kubernetes Platform',
        slug: 'prod-k8s-platform',
        description: 'Auto deployment pipeline',
        owner_user_id: mockOwnerId,
        default_environment: 'development',
        setup_status: 'READY',
        github_repo_id: '1234567',
        github_repo_owner: 'acme-org',
        github_repo_full_name: 'acme-org/prod-k8s-platform',
        repository_branch: 'main',
        repository_url: 'https://github.com/acme-org/prod-k8s-platform.git',
        created_at: new Date('2026-10-01T00:00:00.000Z'),
        updated_at: new Date('2026-10-01T00:00:00.000Z'),
        project_memberships: [],
    };

    before(async () => {
        ownerToken = tokenService.generateAccessToken({
            id: mockOwnerId,
            platform_role: 'USER',
        });
        viewerToken = tokenService.generateAccessToken({
            id: mockViewerId,
            platform_role: 'USER',
        });

        await new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}`;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    beforeEach(() => {
        mock.restoreAll();
    });

    describe('GET /api/projects/:projectId (DETAILS-01)', () => {
        it('should return 401 Unauthorized when missing token', async () => {
            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}`);
            const data = await res.json();

            assert.equal(res.status, 401);
            assert.equal(data.success, false);
            assert(data.message.includes('Authentication required'));
        });

        it('should return 400 Bad Request when projectId is not a valid UUID', async () => {
            const res = await fetch(`${baseUrl}/api/projects/not-a-valid-uuid`, {
                headers: { Authorization: `Bearer ${ownerToken}` },
            });
            const data = await res.json();

            assert.equal(res.status, 400);
            assert.equal(data.success, false);
            assert(data.message.includes('UUID'));
        });

        it('should return 200 OK with repository, branch, environment, setupStatus, target, and latest deployment', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'getProjectOverview', async () => ({
                ...sampleProject,
                deployments: [
                    {
                        id: 'dep-latest-001',
                        status: 'SUCCEEDED',
                        environment: 'development',
                        branch: 'main',
                        commit_sha: validCommitSha,
                        replicas: 1,
                        started_at: '2026-10-02T10:00:00Z',
                        finished_at: '2026-10-02T10:04:00Z',
                        created_at: '2026-10-02T09:59:00Z',
                        updated_at: '2026-10-02T10:04:00Z',
                        error_message: null,
                    },
                ],
            }));

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}`, {
                headers: { Authorization: `Bearer ${ownerToken}` },
            });
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.success, true);
            assert.equal(body.data.project.id, mockProjectId);
            assert.equal(body.data.project.setupStatus, 'READY');
            assert.equal(body.data.project.environment, 'development');
            assert.equal(body.data.project.selectedBranch, 'main');
            assert.deepEqual(body.data.project.repository, {
                id: '1234567',
                owner: 'acme-org',
                fullName: 'acme-org/prod-k8s-platform',
                url: 'https://github.com/acme-org/prod-k8s-platform.git',
            });
            assert.equal(body.data.project.latestDeployment.id, 'dep-latest-001');
            assert.equal(body.data.project.latestDeployment.status, 'SUCCEEDED');
            assert.equal(body.data.project.target.provider, 'AWS_EKS');
            assert.equal(body.data.project.target.namespace, 'app-prod-k8s-platform');
        });

        it('should also work on versioned prefix /api/v1/projects/:projectId', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'getProjectOverview', async () => ({
                ...sampleProject,
                deployments: [],
            }));

            const res = await fetch(`${baseUrl}/api/v1/projects/${mockProjectId}`, {
                headers: { Authorization: `Bearer ${ownerToken}` },
            });
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.success, true);
            assert.equal(body.data.project.id, mockProjectId);
        });
    });

    describe('GET /api/projects/:projectId/deployments (DETAILS-02)', () => {
        it('should return 200 with deployment history sorted newest first and pagination info', async () => {
            const mockDeployments = [
                {
                    id: 'dep-new',
                    project_id: mockProjectId,
                    environment: 'development',
                    branch: 'main',
                    commit_sha: validCommitSha,
                    status: 'QUEUED',
                    replicas: 1,
                    started_at: null,
                    finished_at: null,
                    error_message: null,
                    created_at: new Date('2026-10-02T12:00:00Z'),
                    updated_at: new Date('2026-10-02T12:00:00Z'),
                    users: { id: mockOwnerId, name: 'John Doe' },
                },
            ];

            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'getProjectDeployments', async () => mockDeployments);
            mock.method(projectsRepository, 'countProjectDeployments', async () => 1);

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                headers: { Authorization: `Bearer ${ownerToken}` },
            });
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.success, true);
            assert.equal(body.data.deployments.length, 1);
            assert.equal(body.data.deployments[0].id, 'dep-new');
            assert.equal(body.data.deployments[0].commitSha, validCommitSha);
            assert.equal(body.data.pagination.page, 1);
            assert.equal(body.data.pagination.total, 1);
        });

        it('should support limit query parameter as an alias for per_page', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'getProjectDeployments', async (id, opts) => {
                assert.equal(opts.take, 5);
                return [];
            });
            mock.method(projectsRepository, 'countProjectDeployments', async () => 0);

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments?limit=5`, {
                headers: { Authorization: `Bearer ${ownerToken}` },
            });
            const body = await res.json();

            assert.equal(res.status, 200);
            assert.equal(body.success, true);
            assert.equal(body.data.pagination.perPage, 5);
        });
    });

    describe('POST /api/projects/:projectId/deployments (DETAILS-03)', () => {
        it('should successfully submit a deployment request and return Queued status and correlation ID', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData, eventData, auditData }) => ({
                    deployment: {
                        id: 'dep-created-999',
                        ...deploymentData,
                        created_at: new Date('2026-11-03T10:00:00Z'),
                    },
                    ciJob: { id: 'ci-job-1', ...ciJobData },
                    event: { id: 'evt-1', ...eventData },
                    auditLog: { id: 'aud-1', ...auditData },
                })
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                    'X-Correlation-Id': 'client-corr-id-1234',
                },
                body: JSON.stringify({
                    branch: 'main',
                    environment: 'development',
                    replicas: 2,
                }),
            });
            const body = await res.json();

            assert.equal(res.status, 201);
            assert.equal(body.success, true);
            assert.equal(body.data.status, 'QUEUED');
            assert.equal(body.data.deploymentId, 'dep-created-999');
            assert.equal(body.data.commitSha, validCommitSha);
            assert.equal(body.data.environment, 'development');
            assert.equal(res.headers.get('x-correlation-id'), 'client-corr-id-1234');
        });

        it('should return 409 Conflict when duplicate active deployment is in progress', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => ({
                id: 'active-dep-conflict',
                status: 'RUNNING',
                environment: 'development',
            }));

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    branch: 'main',
                    environment: 'development',
                }),
            });
            const body = await res.json();

            assert.equal(res.status, 409);
            assert.equal(body.success, false);
            assert(body.message.includes('already in progress'));
        });

        it('should return 403 Forbidden when user has viewer role without deploy permission', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...sampleProject,
                project_memberships: [
                    {
                        user_id: mockViewerId,
                        status: 'ACTIVE',
                        project_roles: {
                            name: 'Viewer',
                            normalized_name: 'VIEWER',
                            project_role_permissions: [],
                        },
                    },
                ],
            }));

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${viewerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    branch: 'main',
                }),
            });
            const body = await res.json();

            assert.equal(res.status, 403);
            assert.equal(body.success, false);
            assert(body.message.includes('permission to trigger deployments'));
        });

        it('should return 502 Bad Gateway and mark deployment as FAILED when Jenkins CI fails', async () => {
            let recordedStatus = null;
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-jenkins-fail', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-fail-1', ...ciJobData },
                })
            );
            mock.method(jenkinsService, 'triggerDeploymentJob', async () => {
                throw new Error('Jenkins CI service timeout');
            });
            mock.method(
                projectsRepository,
                'markDeploymentFailed',
                async (deploymentId, ciJobId, errorMsg) => {
                    recordedStatus = 'FAILED';
                    return {};
                }
            );

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ branch: 'main' }),
            });
            const body = await res.json();

            assert.equal(res.status, 502);
            assert.equal(body.success, false);
            assert(body.message.includes('Deployment marked as FAILED'));
            assert.equal(recordedStatus, 'FAILED');
        });

        it('should return 504 Gateway Timeout and retain QUEUED status when Jenkins dispatch times out', async () => {
            let unknownStatusRecorded = null;
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-timeout-rec', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-timeout-rec', ...ciJobData },
                })
            );
            mock.method(jenkinsService, 'triggerDeploymentJob', async () => {
                const timeoutErr = new jenkinsService.JenkinsIntegrationError(
                    'Connection timed out after 5000ms',
                    new Error('timeout'),
                    504,
                    true
                );
                throw timeoutErr;
            });
            mock.method(
                projectsRepository,
                'markDeploymentDispatchUnknown',
                async (deploymentId, ciJobId, errorMsg) => {
                    unknownStatusRecorded = 'QUEUED';
                    return {};
                }
            );

            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ branch: 'main' }),
            });
            const body = await res.json();

            assert.equal(res.status, 504);
            assert.equal(body.success, false);
            assert(body.message.includes('remains in QUEUED status pending background reconciliation'));
            assert.equal(unknownStatusRecorded, 'QUEUED');
        });

        it('should validate and sanitize X-Correlation-Id header', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-corr-clean', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-corr', ...ciJobData },
                })
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            // Test invalid header with spaces and special symbols
            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                    'X-Correlation-Id': 'invalid correlation id with spaces & symbols!',
                },
                body: JSON.stringify({ branch: 'main' }),
            });
            const returnedCorrId = res.headers.get('x-correlation-id');

            assert.equal(res.status, 201);
            // Verify illegal chars were rejected and replaced with a valid clean UUID
            assert(!returnedCorrId.includes('spaces'));
            assert(/^[0-9a-f-]{36}$/.test(returnedCorrId));
        });

        it('should reject invalid Idempotency-Key header with 400 Bad Request', async () => {
            const longInvalidKey = 'A'.repeat(300); // Exceeds 255 chars
            const res = await fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ownerToken}`,
                    'Content-Type': 'application/json',
                    'Idempotency-Key': longInvalidKey,
                },
                body: JSON.stringify({ branch: 'main' }),
            });
            const body = await res.json();

            assert.equal(res.status, 400);
            assert.equal(body.success, false);
            assert(body.message.includes('Invalid Idempotency-Key header'));
        });

        it('CONCURRENCY: simultaneous requests with same Idempotency-Key safely return existing deployment', async () => {
            const sharedKey = 'concurrent-idem-key-888';
            let creationAttempts = 0;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(projectsRepository, 'findDeploymentByIdempotencyKey', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));

            // First call succeeds, second call hits P2002 and returns idempotent existing record
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => {
                    creationAttempts++;
                    if (creationAttempts === 1) {
                        return {
                            deployment: { id: 'dep-concurrency-1', ...deploymentData, created_at: new Date() },
                            ciJob: { id: 'ci-1', ...ciJobData },
                        };
                    }
                    // Simulate P2002 handled returning existing record
                    return {
                        idempotent: true,
                        deployment: {
                            id: 'dep-concurrency-1',
                            status: 'QUEUED',
                            environment: 'development',
                            branch: 'main',
                            commit_sha: validCommitSha,
                            created_at: new Date(),
                        },
                    };
                }
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            // Send two requests concurrently
            const [res1, res2] = await Promise.all([
                fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${ownerToken}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': sharedKey,
                    },
                    body: JSON.stringify({ branch: 'main' }),
                }),
                fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${ownerToken}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': sharedKey,
                    },
                    body: JSON.stringify({ branch: 'main' }),
                }),
            ]);

            assert([200, 201].includes(res1.status));
            assert([200, 201].includes(res2.status));

            const body1 = await res1.json();
            const body2 = await res2.json();

            // Both return the same deploymentId
            assert.equal(body1.data.deploymentId, 'dep-concurrency-1');
            assert.equal(body2.data.deploymentId, 'dep-concurrency-1');
        });

        it('CONCURRENCY: simultaneous requests for same environment produce 409 Conflict', async () => {
            let activeExists = false;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => sampleProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => {
                if (activeExists) {
                    return { id: 'dep-race-winner', status: 'QUEUED', environment: 'development' };
                }
                return null;
            });
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => {
                    activeExists = true;
                    return {
                        deployment: { id: 'dep-race-winner', ...deploymentData, created_at: new Date() },
                        ciJob: { id: 'ci-race', ...ciJobData },
                    };
                }
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            const [res1, res2] = await Promise.all([
                fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${ownerToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ branch: 'main' }),
                }),
                fetch(`${baseUrl}/api/projects/${mockProjectId}/deployments`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${ownerToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ branch: 'main' }),
                }),
            ]);

            const statuses = [res1.status, res2.status].sort();
            // One must succeed (201) and the other must be rejected (409 Conflict)
            assert.deepEqual(statuses, [201, 409]);
        });
    });
});

