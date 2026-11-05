// tests/unit/projects.service.test.js
const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-unit-tests-32chars';
process.env.JENKINS_INTEGRATION_MODE = 'mock';

const projectsService = require('../../src/modules/projects/projects.service');
const projectsRepository = require('../../src/modules/projects/projects.repository');
const githubService = require('../../src/modules/integrations/github/github.service');
const jenkinsService = require('../../src/modules/integrations/jenkins/jenkins.service');
const ApiError = require('../../src/utils/ApiError');

describe('Projects & Deployments Service Unit Tests', () => {
    const mockProjectId = '11111111-1111-1111-1111-111111111111';
    const mockOwnerId = '22222222-2222-2222-2222-222222222222';
    const mockMemberId = '33333333-3333-3333-3333-333333333333';
    const mockAdminId = '44444444-4444-4444-4444-444444444444';
    const mockStrangerId = '55555555-5555-5555-5555-555555555555';

    const baseProject = {
        id: mockProjectId,
        name: 'Auto Platform',
        slug: 'auto-platform',
        description: 'Infrastructure automation',
        owner_user_id: mockOwnerId,
        default_environment: 'development',
        setup_status: 'READY',
        github_repo_id: '987654',
        github_repo_owner: 'acme-corp',
        github_repo_full_name: 'acme-corp/auto-platform',
        repository_branch: 'main',
        repository_url: 'https://github.com/acme-corp/auto-platform.git',
        created_at: new Date('2026-10-01T00:00:00.000Z'),
        updated_at: new Date('2026-10-01T00:00:00.000Z'),
        project_memberships: [],
    };

    const validCommitSha = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

    beforeEach(() => {
        // Reset mocks
        mock.restoreAll();
    });

    describe('DETAILS-01: Project Overview', () => {
        it('should return project overview with repository, branch, environment, setupStatus, target, and latest deployment', async () => {
            const projectWithOwner = {
                ...baseProject,
                deployments: [
                    {
                        id: 'dep-1234',
                        status: 'SUCCEEDED',
                        environment: 'development',
                        branch: 'main',
                        commit_sha: validCommitSha,
                        replicas: 2,
                        started_at: new Date('2026-10-02T10:00:00Z'),
                        finished_at: new Date('2026-10-02T10:05:00Z'),
                        created_at: new Date('2026-10-02T09:59:00Z'),
                        updated_at: new Date('2026-10-02T10:05:00Z'),
                        error_message: null,
                    },
                ],
            };

            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
            }));
            mock.method(projectsRepository, 'getProjectOverview', async () => projectWithOwner);

            const overview = await projectsService.getProjectOverview(mockProjectId, {
                id: mockOwnerId,
                role: 'USER',
            });

            assert.equal(overview.id, mockProjectId);
            assert.equal(overview.name, 'Auto Platform');
            assert.equal(overview.selectedBranch, 'main');
            assert.equal(overview.environment, 'development');
            assert.equal(overview.setupStatus, 'READY');
            assert.deepEqual(overview.repository, {
                id: '987654',
                owner: 'acme-corp',
                fullName: 'acme-corp/auto-platform',
                url: 'https://github.com/acme-corp/auto-platform.git',
            });
            assert.equal(overview.latestDeployment.id, 'dep-1234');
            assert.equal(overview.latestDeployment.status, 'SUCCEEDED');
            assert.equal(overview.target.provider, 'AWS_EKS');
            assert.equal(overview.target.namespace, 'app-auto-platform');
            assert.equal(overview.target.replicas, 2);
        });

        it('should return 404 if project does not exist', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => null);

            await assert.rejects(
                async () => {
                    await projectsService.getProjectOverview(mockProjectId, {
                        id: mockOwnerId,
                        role: 'USER',
                    });
                },
                (err) => err instanceof ApiError && err.statusCode === 404
            );
        });

        it('should reject non-member with 403 Forbidden', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                project_memberships: [],
            }));

            await assert.rejects(
                async () => {
                    await projectsService.getProjectOverview(mockProjectId, {
                        id: mockStrangerId,
                        role: 'USER',
                    });
                },
                (err) => err instanceof ApiError && err.statusCode === 403
            );
        });

        it('should allow platform ADMIN even if not in project_memberships', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                project_memberships: [],
            }));
            mock.method(projectsRepository, 'getProjectOverview', async () => ({
                ...baseProject,
                deployments: [],
            }));

            const overview = await projectsService.getProjectOverview(mockProjectId, {
                id: mockAdminId,
                role: 'ADMIN',
            });

            assert.equal(overview.id, mockProjectId);
            assert.equal(overview.latestDeployment, null);
        });
    });

    describe('DETAILS-02: Project Deployment History', () => {
        it('should return deployment history sorted newest first with timestamps and branch/commit info', async () => {
            const mockDeployments = [
                {
                    id: 'dep-2',
                    project_id: mockProjectId,
                    environment: 'development',
                    branch: 'main',
                    commit_sha: 'commit-sha-2',
                    status: 'QUEUED',
                    replicas: 1,
                    started_at: null,
                    finished_at: null,
                    error_message: null,
                    created_at: new Date('2026-10-02T12:00:00Z'),
                    updated_at: new Date('2026-10-02T12:00:00Z'),
                    users: { id: mockOwnerId, name: 'Alice Owner' },
                },
                {
                    id: 'dep-1',
                    project_id: mockProjectId,
                    environment: 'development',
                    branch: 'main',
                    commit_sha: 'commit-sha-1',
                    status: 'SUCCEEDED',
                    replicas: 1,
                    started_at: new Date('2026-10-01T10:00:00Z'),
                    finished_at: new Date('2026-10-01T10:05:00Z'),
                    error_message: null,
                    created_at: new Date('2026-10-01T09:59:00Z'),
                    updated_at: new Date('2026-10-01T10:05:00Z'),
                    users: { id: mockOwnerId, name: 'Alice Owner' },
                },
            ];

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'getProjectDeployments', async () => mockDeployments);
            mock.method(projectsRepository, 'countProjectDeployments', async () => 2);

            const result = await projectsService.getDeploymentHistory(mockProjectId, {
                id: mockOwnerId,
                role: 'USER',
            });

            assert.equal(result.deployments.length, 2);
            assert.equal(result.deployments[0].id, 'dep-2');
            assert.equal(result.deployments[0].status, 'QUEUED');
            assert.equal(result.deployments[1].id, 'dep-1');
            assert.equal(result.deployments[1].status, 'SUCCEEDED');
            assert.equal(result.pagination.total, 2);
            assert.equal(result.pagination.totalPages, 1);
        });

        it('should enforce project access on deployment history', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                project_memberships: [],
            }));

            await assert.rejects(
                async () => {
                    await projectsService.getDeploymentHistory(mockProjectId, {
                        id: mockStrangerId,
                        role: 'USER',
                    });
                },
                (err) => err instanceof ApiError && err.statusCode === 403
            );
        });
    });

    describe('DETAILS-03: Submit Deployment Request', () => {
        it('should successfully submit deployment with Queued status and dispatch to CI pipeline', async () => {
            let createdDeploymentData = null;
            let dispatchedCiJobId = null;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData, eventData, auditData }) => {
                    createdDeploymentData = deploymentData;
                    return {
                        deployment: {
                            id: 'dep-new-uuid',
                            ...deploymentData,
                            created_at: new Date(),
                            updated_at: new Date(),
                        },
                        ciJob: {
                            id: 'ci-job-uuid',
                            ...ciJobData,
                            deployment_id: 'dep-new-uuid',
                        },
                        event: { id: 'evt-uuid', ...eventData },
                        auditLog: { id: 'audit-uuid', ...auditData },
                    };
                }
            );
            mock.method(
                projectsRepository,
                'markDeploymentDispatched',
                async (depId, jobId, externalId) => {
                    dispatchedCiJobId = jobId;
                    return {};
                }
            );

            const result = await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockOwnerId, role: 'USER' },
                { branch: 'main', environment: 'development' },
                'corr-test-123'
            );

            assert.equal(result.status, 'QUEUED');
            assert.equal(result.deploymentId, 'dep-new-uuid');
            assert.equal(result.commitSha, validCommitSha);
            assert.equal(result.branch, 'main');
            assert.equal(result.environment, 'development');
            assert.equal(result.correlationId, 'corr-test-123');
            assert.equal(createdDeploymentData.status, 'QUEUED');
            assert.equal(dispatchedCiJobId, 'ci-job-uuid');
        });

        it('should accept an explicit valid 40-character commit SHA', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-1', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-1', ...ciJobData },
                })
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            const result = await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockOwnerId, role: 'USER' },
                { branch: 'main', commitSha: validCommitSha },
                'corr-test'
            );

            assert.equal(result.status, 'QUEUED');
            assert.equal(result.commitSha, validCommitSha);
        });

        it('should prevent duplicate active deployments when one is already QUEUED or RUNNING', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => ({
                id: 'existing-active-dep-123',
                status: 'QUEUED',
                environment: 'development',
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main', environment: 'development' },
                        'corr-test'
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 409);
                    assert(err.message.includes('already in progress'));
                    return true;
                }
            );
        });

        it('should handle idempotent duplicate requests gracefully', async () => {
            const idempotencyKey = 'unique-key-xyz-123';
            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(
                projectsRepository,
                'findDeploymentByIdempotencyKey',
                async (userId, key) => ({
                    id: 'dep-existing-idempotent',
                    status: 'QUEUED',
                    environment: 'development',
                    branch: 'main',
                    commit_sha: validCommitSha,
                    created_at: new Date(),
                })
            );

            const result = await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockOwnerId, role: 'USER' },
                { branch: 'main', idempotencyKey },
                'corr-test'
            );

            assert.equal(result.idempotent, true);
            assert.equal(result.deploymentId, 'dep-existing-idempotent');
        });

        it('should reject request when target environment is invalid', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { environment: 'super-production' }
                    );
                },
                (err) => err instanceof ApiError && err.statusCode === 400
            );
        });

        it('should reject request when repository is not configured on project', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                github_repo_full_name: null,
                repository_url: null,
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' }
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 400);
                    assert(err.message.includes('repository is not configured'));
                    return true;
                }
            );
        });

        it('should reject request when project setup status is FAILED', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                setup_status: 'FAILED',
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' }
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 400);
                    assert(err.message.includes('setup status is FAILED'));
                    return true;
                }
            );
        });

        it('should reject member without deployment permission with 403 Forbidden', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                project_memberships: [
                    {
                        user_id: mockMemberId,
                        status: 'ACTIVE',
                        project_roles: {
                            name: 'Viewer',
                            normalized_name: 'VIEWER',
                            project_role_permissions: [],
                        },
                    },
                ],
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockMemberId, role: 'USER' },
                        { branch: 'main' }
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 403);
                    assert(err.message.includes('permission to trigger deployments'));
                    return true;
                }
            );
        });

        it('should allow member with Deployer role to trigger deployment', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                project_memberships: [
                    {
                        user_id: mockMemberId,
                        status: 'ACTIVE',
                        project_roles: {
                            name: 'Deployer',
                            normalized_name: 'DEPLOYER',
                            project_role_permissions: [],
                        },
                    },
                ],
            }));
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-member-1', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-1', ...ciJobData },
                })
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            const result = await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockMemberId, role: 'USER' },
                { branch: 'main' }
            );

            assert.equal(result.status, 'QUEUED');
        });

        it('RELIABILITY: when Jenkins dispatch fails, deployment must be marked FAILED and NEVER left as Queued', async () => {
            let failedStatusRecorded = null;
            let failureErrorMessage = null;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: {
                        id: 'dep-fail-case',
                        ...deploymentData,
                        created_at: new Date(),
                    },
                    ciJob: {
                        id: 'ci-job-fail-case',
                        ...ciJobData,
                    },
                })
            );

            // Simulate Jenkins service unavailable / failure
            mock.method(jenkinsService, 'triggerDeploymentJob', async () => {
                throw new Error('Connection refused: Jenkins is unavailable (ECONNREFUSED)');
            });

            // Capture the markDeploymentFailed call
            mock.method(
                projectsRepository,
                'markDeploymentFailed',
                async (deploymentId, ciJobId, errorMsg) => {
                    failedStatusRecorded = 'FAILED';
                    failureErrorMessage = errorMsg;
                    return {
                        updatedDeployment: { id: deploymentId, status: 'FAILED' },
                    };
                }
            );

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' },
                        'corr-fail-test'
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 502);
                    assert(err.message.includes('Deployment marked as FAILED'));
                    return true;
                }
            );

            // Verify reliability guarantee: status was explicitly updated to FAILED!
            assert.equal(failedStatusRecorded, 'FAILED');
            assert(failureErrorMessage.includes('ECONNREFUSED'));
        });

        it('RELIABILITY: deployment snapshot must snapshot repo, git ref, environment, and execution config without raw secrets', async () => {
            let capturedEventSnapshot = null;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'release/v1',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData, eventData }) => {
                    capturedEventSnapshot = eventData.metadata.snapshot;
                    return {
                        deployment: { id: 'dep-snap', ...deploymentData, created_at: new Date() },
                        ciJob: { id: 'ci-snap', ...ciJobData },
                    };
                }
            );
            mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

            await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockOwnerId, role: 'USER' },
                { branch: 'release/v1', dockerfilePath: 'custom/Dockerfile', replicas: 3 },
                'corr-snapshot'
            );

            assert.notEqual(capturedEventSnapshot, null);
            assert.equal(capturedEventSnapshot.projectId, mockProjectId);
            assert.equal(capturedEventSnapshot.git.branch, 'release/v1');
            assert.equal(capturedEventSnapshot.git.commitSha, validCommitSha);
            assert.equal(capturedEventSnapshot.build.dockerfilePath, 'custom/Dockerfile');
            assert.equal(capturedEventSnapshot.build.replicas, 3);
            assert.equal(capturedEventSnapshot.target.platform, 'Kubernetes');
            assert.equal(capturedEventSnapshot.target.namespace, 'app-auto-platform');

            // CRITICAL: verify secretReferences has NO plaintext passwords or tokens
            assert(Array.isArray(capturedEventSnapshot.secretReferences));
            const secretsJson = JSON.stringify(capturedEventSnapshot.secretReferences);
            assert(!secretsJson.includes('password'));
            assert(!secretsJson.includes('token'));
            assert(!secretsJson.includes('secret_key'));
        });

        it('should reject request when project setup status is PENDING (not ready)', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                setup_status: 'PENDING',
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' }
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 400);
                    assert(err.message.includes('setup is not ready'));
                    assert(err.message.includes('PENDING'));
                    return true;
                }
            );
        });

        it('should reject request when project setup status is IN_PROGRESS (not ready)', async () => {
            mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
                ...baseProject,
                setup_status: 'IN_PROGRESS',
            }));

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' }
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 400);
                    assert(err.message.includes('setup is not ready'));
                    assert(err.message.includes('IN_PROGRESS'));
                    return true;
                }
            );
        });

        it('RELIABILITY: ambiguous Jenkins dispatch timeout retains QUEUED status, records DISPATCH_TIMEOUT event, and throws 504', async () => {
            let unknownStatusRecorded = null;
            let unknownErrorMessage = null;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async ({ deploymentData, ciJobData }) => ({
                    deployment: { id: 'dep-timeout-1', ...deploymentData, created_at: new Date() },
                    ciJob: { id: 'ci-timeout-1', ...ciJobData },
                })
            );

            // Simulate Jenkins timeout error
            mock.method(jenkinsService, 'triggerDeploymentJob', async () => {
                const timeoutErr = new jenkinsService.JenkinsIntegrationError(
                    'Connection timed out after 5000ms reaching Jenkins at http://localhost:8080',
                    new Error('timeout'),
                    504,
                    true // isTimeout = true
                );
                throw timeoutErr;
            });

            mock.method(
                projectsRepository,
                'markDeploymentDispatchUnknown',
                async (deploymentId, ciJobId, errorMsg) => {
                    unknownStatusRecorded = 'QUEUED'; // Retained as QUEUED for reconciliation!
                    unknownErrorMessage = errorMsg;
                    return {
                        updatedDeployment: { id: deploymentId, status: 'QUEUED' },
                    };
                }
            );

            await assert.rejects(
                async () => {
                    await projectsService.submitDeploymentRequest(
                        mockProjectId,
                        { id: mockOwnerId, role: 'USER' },
                        { branch: 'main' },
                        'corr-timeout-test'
                    );
                },
                (err) => {
                    assert(err instanceof ApiError);
                    assert.equal(err.statusCode, 504);
                    assert(err.message.includes('remains in QUEUED status pending background reconciliation'));
                    return true;
                }
            );

            assert.equal(unknownStatusRecorded, 'QUEUED');
            assert(unknownErrorMessage.includes('timed out'));
        });

        it('RELIABILITY: concurrent duplicate Idempotency-Key caught via P2002 returns existing deployment without error', async () => {
            const idempotencyKey = 'concurrent-key-999';
            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'findActiveDeployment', async () => null);
            mock.method(projectsRepository, 'findDeploymentByIdempotencyKey', async () => null); // Pre-check saw null
            mock.method(githubService, 'resolveBranchCommit', async () => ({
                sha: validCommitSha,
                branch: 'main',
            }));

            // Simulate createDeploymentTransaction catching P2002 and returning existing record
            mock.method(
                projectsRepository,
                'createDeploymentTransaction',
                async () => ({
                    idempotent: true,
                    deployment: {
                        id: 'dep-concurrency-winner',
                        status: 'QUEUED',
                        environment: 'development',
                        branch: 'main',
                        commit_sha: validCommitSha,
                        created_at: new Date('2026-11-03T10:00:00Z'),
                    },
                })
            );

            const result = await projectsService.submitDeploymentRequest(
                mockProjectId,
                { id: mockOwnerId, role: 'USER' },
                { branch: 'main', idempotencyKey },
                'corr-idemp'
            );

            assert.equal(result.idempotent, true);
            assert.equal(result.deploymentId, 'dep-concurrency-winner');
        });
    });

    describe('API Consistency & Pagination', () => {
        it('should support limit query parameter as an alias for per_page', async () => {
            let capturedTake = null;

            mock.method(projectsRepository, 'findProjectWithMembership', async () => baseProject);
            mock.method(projectsRepository, 'getProjectDeployments', async (id, opts) => {
                capturedTake = opts.take;
                return [];
            });
            mock.method(projectsRepository, 'countProjectDeployments', async () => 0);

            const result = await projectsService.getDeploymentHistory(mockProjectId, {
                id: mockOwnerId,
                role: 'USER',
            }, { page: 1, limit: 15 });

            assert.equal(capturedTake, 15);
            assert.equal(result.pagination.perPage, 15);
        });
    });

    describe('Jenkins Service Utilities', () => {
        it('sanitizeErrorMessage strips HTML tags and limits length to 250 characters', () => {
            const rawHtml = '<html><head><title>Error 500</title></head><body><h1>Internal Error</h1><p>Stack trace: at org.apache.catalina.core...</p></body></html>';
            const sanitized = jenkinsService.sanitizeErrorMessage(rawHtml, 50);

            assert(!sanitized.includes('<html>'));
            assert(!sanitized.includes('<h1>'));
            assert(sanitized.length <= 50);
        });

        it('sanitizeErrorMessage redacts exposed credentials and tokens', () => {
            const errorWithToken = 'Failed connecting: Bearer secret_token_value12345 in header';
            const sanitized = jenkinsService.sanitizeErrorMessage(errorWithToken);

            assert(!sanitized.includes('secret_token_value12345'));
            assert(sanitized.includes('[REDACTED]'));
        });

        it('formatJobUrlPath supports nested Jenkins folders', () => {
            const path = jenkinsService.formatJobUrlPath('infrastructure/production/deploy-app');
            assert.equal(path, 'infrastructure/job/production/job/deploy-app');
        });
    });
});
