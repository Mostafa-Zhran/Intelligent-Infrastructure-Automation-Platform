// tests/unit/setup.pipeline.test.js
// SETUP-05 — Unit tests for the infrastructure setup pipeline service functions.
// All external dependencies (repository, GitHub Actions) are mocked.
'use strict';

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_ACCESS_SECRET = 'test-secret-key-for-unit-tests-32chars';
process.env.CI_INTEGRATION_MODE = 'mock';

const projectsService = require('../../src/modules/projects/projects.service');
const projectsRepository = require('../../src/modules/projects/projects.repository');
const githubActionsService = require('../../src/modules/integrations/github/github.actions.service');
const ApiError = require('../../src/utils/ApiError');

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const mockProjectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const mockOwnerId   = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const mockSetupId   = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const baseProject = {
    id: mockProjectId,
    name: 'IIAP Test',
    slug: 'iiap-test',
    description: 'Infrastructure automation test project',
    owner_user_id: mockOwnerId,
    default_environment: 'development',
    setup_status: 'PENDING',
    github_repo_id: '123456',
    github_repo_owner: 'acme-corp',
    github_repo_full_name: 'acme-corp/iiap-test',
    repository_branch: 'main',
    repository_url: 'https://github.com/acme-corp/iiap-test.git',
    created_at: new Date('2026-11-01T00:00:00.000Z'),
    updated_at: new Date('2026-11-01T00:00:00.000Z'),
    project_memberships: [],
};

const ownerUser = { id: mockOwnerId, role: 'USER' };
const adminUser = { id: 'admin-id', role: 'ADMIN' };

const mockSetupDeployment = {
    id: mockSetupId,
    project_id: mockProjectId,
    environment: 'setup',
    status: 'QUEUED',
    branch: 'main',
    commit_sha: null,
    replicas: 1,
    error_message: null,
    started_at: null,
    finished_at: null,
    created_at: new Date('2026-11-18T10:00:00.000Z'),
    updated_at: new Date('2026-11-18T10:00:00.000Z'),
};

const mockCiJob = {
    id: 'ci-job-id',
    deployment_id: mockSetupId,
    provider: 'GITHUB_ACTIONS',
    job_name: 'setup.yml',
    status: 'PENDING',
    external_job_id: null,
    url: null,
    created_at: new Date('2026-11-18T10:00:00.000Z'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SETUP-05: startProjectSetup', () => {
    beforeEach(() => { mock.restoreAll(); });

    // ── Happy path ──

    it('should queue a setup pipeline and return 202-style data for project owner', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({ ...baseProject, setup_status: 'IN_PROGRESS' }));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-mock-9999',
            queueItemUrl: 'https://github.com/acme-corp/iiap-test/actions',
            status: 'QUEUED',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, ownerUser, { force: false }, 'corr-test-1');

        assert.equal(result.setupPipelineId, mockSetupId);
        assert.equal(result.status, 'QUEUED');
        assert.equal(result.environment, 'setup');
        assert.ok(result.correlationId);
        assert.ok(result.createdAt);
        assert.equal(result.job.provider, 'GITHUB_ACTIONS');
        assert.equal(result.job.jobId, 'gha-mock-9999');
    });

    it('should allow an ADMIN user to trigger setup', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-mock-admin',
            queueItemUrl: 'https://github.com/acme-corp/iiap-test/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, adminUser, {}, 'corr-admin');
        assert.equal(result.environment, 'setup');
        assert.ok(result.setupPipelineId);
    });

    it('should auto-generate a correlationId when none is provided', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-auto',
            queueItemUrl: 'https://github.com/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, ownerUser);
        assert.ok(result.correlationId, 'correlationId should be auto-generated');
        assert.match(result.correlationId, /^setup-/);
    });

    // ── Duplicate prevention ──

    it('should throw 409 when an active setup (QUEUED) is already running', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => ({
            ...mockSetupDeployment,
            status: 'QUEUED',
        }));

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 409);
                assert.match(err.message, /already in progress/i);
                return true;
            }
        );
    });

    it('should throw 409 when an active setup is RUNNING', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => ({
            ...mockSetupDeployment,
            status: 'RUNNING',
        }));

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 409);
                return true;
            }
        );
    });

    it('should throw 409 when setup_status is READY and force=false', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'READY',
        }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser, { force: false }),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 409);
                assert.match(err.message, /already READY/i);
                return true;
            }
        );
    });

    it('should allow re-run when setup_status is READY and force=true', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'READY',
        }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-force',
            queueItemUrl: 'https://github.com/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, ownerUser, { force: true });
        assert.equal(result.status, 'QUEUED');
    });

    it('should allow re-run when previous setup FAILED (force=false still works)', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'FAILED',
        }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-retry',
            queueItemUrl: 'https://github.com/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, ownerUser, { force: false });
        assert.equal(result.status, 'QUEUED');
    });

    // ── Configuration validation ──

    it('should throw 400 when no repository is configured', async () => {
        const projectNoRepo = {
            ...baseProject,
            github_repo_full_name: null,
            repository_url: null,
        };
        mock.method(projectsRepository, 'findProjectWithMembership', async () => projectNoRepo);

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 400);
                assert.match(err.message, /repository is not configured/i);
                return true;
            }
        );
    });

    // ── Access control ──

    it('should throw 404 when project does not exist', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => null);

        await assert.rejects(
            () => projectsService.startProjectSetup('nonexistent-id', ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 404);
                return true;
            }
        );
    });

    it('should throw 403 when caller is a stranger with no membership', async () => {
        const projectWithNoMembership = {
            ...baseProject,
            owner_user_id: 'someone-else',
            project_memberships: [],
        };
        mock.method(projectsRepository, 'findProjectWithMembership', async () => projectWithNoMembership);

        const stranger = { id: 'stranger-id', role: 'USER' };
        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, stranger),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 403);
                return true;
            }
        );
    });

    // ── setup_status transitions ──

    it('should update project setup_status to IN_PROGRESS before dispatching', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));

        let capturedStatus = null;
        mock.method(projectsRepository, 'updateProjectSetupStatus', async (pid, status) => {
            capturedStatus = status;
            return {};
        });
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            jobId: 'gha-transition-test',
            queueItemUrl: 'https://github.com/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        await projectsService.startProjectSetup(mockProjectId, ownerUser);
        assert.equal(capturedStatus, 'IN_PROGRESS');
    });

    it('should mark setup_status as FAILED and deployment as FAILED when CI dispatch fails definitively', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));

        // CI dispatch fails with a definite error (not timeout)
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => {
            const err = new Error('GitHub Actions rejected dispatch: 422');
            err.isTimeout = false;
            throw err;
        });

        let failedDeploymentId = null;
        mock.method(projectsRepository, 'markDeploymentFailed', async (depId) => {
            failedDeploymentId = depId;
            return {};
        });

        let statusSetToFailed = false;
        // updateProjectSetupStatus may be called twice — capture last call
        let callCount = 0;
        mock.method(projectsRepository, 'updateProjectSetupStatus', async (pid, status) => {
            callCount++;
            if (status === 'FAILED') statusSetToFailed = true;
            return {};
        });

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 502);
                return true;
            }
        );

        assert.equal(failedDeploymentId, mockSetupId, 'Should mark the deployment as failed');
        assert.ok(statusSetToFailed, 'Should set project setup_status to FAILED on CI error');
    });

    it('should throw 504 and keep deployment QUEUED on CI dispatch timeout', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));

        mock.method(githubActionsService, 'triggerDeploymentJob', async () => {
            const err = new Error('Dispatch timed out');
            err.isTimeout = true;
            throw err;
        });

        let unknownCalledWith = null;
        mock.method(projectsRepository, 'markDeploymentDispatchUnknown', async (depId) => {
            unknownCalledWith = depId;
            return {};
        });

        await assert.rejects(
            () => projectsService.startProjectSetup(mockProjectId, ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 504);
                return true;
            }
        );

        assert.equal(unknownCalledWith, mockSetupId, 'Should call markDeploymentDispatchUnknown');
    });

    // ── Secret safety ──

    it('should never include raw secrets or tokens in the returned result', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'findActiveSetup', async () => null);
        mock.method(projectsRepository, 'createSetupDeploymentRecord', async () => ({
            deployment: { ...mockSetupDeployment },
            ciJob: { ...mockCiJob },
            event: {},
            auditLog: null,
        }));
        mock.method(projectsRepository, 'updateProjectSetupStatus', async () => ({}));
        mock.method(githubActionsService, 'triggerDeploymentJob', async () => ({
            success: true,
            provider: 'GITHUB_ACTIONS',
            jobId: 'gha-safe',
            queueItemUrl: 'https://github.com/actions',
        }));
        mock.method(projectsRepository, 'markDeploymentDispatched', async () => ({}));

        const result = await projectsService.startProjectSetup(mockProjectId, ownerUser);

        const serialized = JSON.stringify(result);
        assert.ok(!serialized.includes('secret'), 'Result must not contain "secret"');
        assert.ok(!serialized.includes('token'), 'Result must not contain "token"');
        assert.ok(!serialized.includes('password'), 'Result must not contain "password"');
        assert.ok(!serialized.includes('AWS_SECRET'), 'Result must not contain AWS secrets');
        assert.ok(!serialized.includes('GITHUB_TOKEN'), 'Result must not contain GitHub token');
    });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SETUP-05: getSetupStatus', () => {
    beforeEach(() => { mock.restoreAll(); });

    it('should return setupStatus and null pipeline when no setup has ever run', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({ ...baseProject }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => null);

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);

        assert.equal(result.setupStatus, 'PENDING');
        assert.equal(result.pipeline, null);
    });

    it('should return correct status and pipeline shape for an active QUEUED setup', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'IN_PROGRESS',
        }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => ({
            ...mockSetupDeployment,
            status: 'QUEUED',
            deployment_events: [
                {
                    stage: 'QUEUED',
                    from_state: null,
                    to_state: 'QUEUED',
                    message: 'Setup pipeline queued',
                    created_at: new Date('2026-11-18T10:00:00Z'),
                },
            ],
            ci_jobs: [{ ...mockCiJob, external_job_id: 'gha-queued-id', url: 'https://gh.com/actions' }],
        }));

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);

        assert.equal(result.setupStatus, 'IN_PROGRESS');
        assert.ok(result.pipeline, 'pipeline should be present');
        assert.equal(result.pipeline.id, mockSetupId);
        assert.equal(result.pipeline.status, 'QUEUED');
        assert.equal(result.pipeline.stages.length, 1);
        assert.equal(result.pipeline.stages[0].stage, 'QUEUED');
        assert.equal(result.pipeline.ciJob.externalJobId, 'gha-queued-id');
    });

    it('should return a safe errorSummary for a FAILED setup (no raw secrets)', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'FAILED',
        }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => ({
            ...mockSetupDeployment,
            status: 'FAILED',
            error_message: 'token=supersecret123 CI rejected dispatch at step 3',
            deployment_events: [],
            ci_jobs: [],
        }));

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);

        assert.equal(result.setupStatus, 'FAILED');
        assert.ok(result.pipeline.errorSummary, 'errorSummary should be present');
        assert.ok(!result.pipeline.errorSummary.includes('supersecret123'), 'Raw secret must not be in errorSummary');
        assert.ok(result.pipeline.errorSummary.includes('[REDACTED]'), 'Secret must be redacted');
    });

    it('should not expose null ciJob fields when no ci_job exists', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'IN_PROGRESS',
        }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => ({
            ...mockSetupDeployment,
            status: 'RUNNING',
            deployment_events: [],
            ci_jobs: [],
        }));

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);
        assert.equal(result.pipeline.ciJob, null);
    });

    it('should return READY status when setup completed successfully', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'READY',
        }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => ({
            ...mockSetupDeployment,
            status: 'SUCCEEDED',
            finished_at: new Date('2026-11-18T10:15:00Z'),
            deployment_events: [
                {
                    stage: 'QUEUED',
                    from_state: null,
                    to_state: 'QUEUED',
                    message: 'Queued',
                    created_at: new Date('2026-11-18T10:00:00Z'),
                },
                {
                    stage: 'COMPLETED',
                    from_state: 'RUNNING',
                    to_state: 'SUCCEEDED',
                    message: 'Setup complete',
                    created_at: new Date('2026-11-18T10:15:00Z'),
                },
            ],
            ci_jobs: [{ ...mockCiJob, status: 'SUCCEEDED', external_job_id: 'gha-done' }],
        }));

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);

        assert.equal(result.setupStatus, 'READY');
        assert.equal(result.pipeline.status, 'SUCCEEDED');
        assert.equal(result.pipeline.stages.length, 2);
        assert.ok(result.pipeline.finishedAt, 'finishedAt should be present on completion');
    });

    it('should not expose secrets in the pipeline response', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => ({
            ...baseProject,
            setup_status: 'IN_PROGRESS',
        }));
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => ({
            ...mockSetupDeployment,
            status: 'RUNNING',
            deployment_events: [],
            ci_jobs: [{ ...mockCiJob, external_job_id: 'gha-running' }],
        }));

        const result = await projectsService.getSetupStatus(mockProjectId, ownerUser);
        const serialized = JSON.stringify(result);
        assert.ok(!serialized.includes('AWS_SECRET'), 'Response must not expose AWS secrets');
        assert.ok(!serialized.includes('GITHUB_TOKEN'), 'Response must not expose GitHub token');
    });

    it('should throw 404 when project does not exist', async () => {
        mock.method(projectsRepository, 'findProjectWithMembership', async () => null);

        await assert.rejects(
            () => projectsService.getSetupStatus('nonexistent-uuid', ownerUser),
            (err) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.statusCode, 404);
                return true;
            }
        );
    });

    it('should allow any authenticated project member (viewer) to poll setup status', async () => {
        const projectWithMember = {
            ...baseProject,
            setup_status: 'IN_PROGRESS',
            owner_user_id: 'other-owner',
            project_memberships: [
                {
                    user_id: 'viewer-user-id',
                    status: 'ACTIVE',
                    project_roles: { name: 'VIEWER', normalized_name: 'viewer', project_role_permissions: [] },
                },
            ],
        };
        mock.method(projectsRepository, 'findProjectWithMembership', async () => projectWithMember);
        mock.method(projectsRepository, 'getLatestSetupDeployment', async () => null);

        const viewerUser = { id: 'viewer-user-id', role: 'USER' };
        const result = await projectsService.getSetupStatus(mockProjectId, viewerUser);

        assert.equal(result.setupStatus, 'IN_PROGRESS');
        assert.equal(result.pipeline, null);
    });
});
