// backend/src/modules/projects/projects.service.js
const ApiError = require('../../utils/ApiError');
const projectsRepository = require('./projects.repository');
const githubService = require('../integrations/github/github.service');
const githubActionsService = require('../integrations/github/github.actions.service');
const ec2TargetRepository = require('./ec2Target.repository');
const awsClusterRepository = require('./awsCluster.repository');

function getCiProvider() {
    return (process.env.CI_PROVIDER || 'GITHUB_ACTIONS').toUpperCase();
}

function getCiService() {
    return githubActionsService;
}

function getCiJobName() {
    return process.env.GITHUB_WORKFLOW_FILE || 'deploy.yml';
}

const ALLOWED_ENVIRONMENTS = [
    'development',
    'staging',
    'production',
    'test',
    'preview',
];

/**
 * Verifies that the user has authorization to access the specified project.
 *
 * Rules:
 * 1. Platform ADMIN: has full access to all projects and actions.
 * 2. Project Owner: has full access to the project they own.
 * 3. Project Member: must have an ACTIVE membership.
 *    - For action 'view': any active membership role is permitted.
 *    - For action 'deploy': role must be OWNER, ADMIN, MAINTAINER, DEPLOYER,
 *      or have explicit 'deployment:create' / 'deploy' permission.
 */
async function verifyProjectAccess(
    projectId,
    userId,
    userRole,
    requiredAction = 'view'
) {
    const project = await projectsRepository.findProjectWithMembership(
        projectId,
        userId
    );

    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    // 1. Platform Admin
    if (userRole === 'ADMIN') {
        return { project, role: 'ADMIN', isOwner: false, isAdmin: true };
    }

    // 2. Project Owner
    if (project.owner_user_id === userId) {
        return { project, role: 'OWNER', isOwner: true, isAdmin: false };
    }

    // 3. Project Member
    const membership = project.project_memberships?.[0];
    if (!membership || membership.status !== 'ACTIVE') {
        throw new ApiError(403, 'You do not have permission to access this project');
    }

    // View action only requires active membership
    if (requiredAction === 'view') {
        return {
            project,
            membership,
            role: membership.project_roles?.name,
            isOwner: false,
            isAdmin: false,
        };
    }

    // Deployment action requires deployment permission
    if (requiredAction === 'deploy') {
        const role = membership.project_roles;
        const roleName = (role?.name || '').toUpperCase();
        const normalizedName = (role?.normalized_name || '').toUpperCase();

        const privilegedRoles = [
            'OWNER',
            'ADMIN',
            'MAINTAINER',
            'DEPLOYER',
            'LEAD',
            'DEVOPS',
        ];
        if (privilegedRoles.includes(roleName) || privilegedRoles.includes(normalizedName)) {
            return {
                project,
                membership,
                role: role?.name,
                isOwner: false,
                isAdmin: false,
            };
        }

        // Check granular permissions assigned to this role
        const rolePerms = role?.project_role_permissions || [];
        const hasDeployPermission = rolePerms.some((p) => {
            const key = (p.permissions?.key || '').toLowerCase();
            return (
                key === 'deployment:create' ||
                key === 'deployments:create' ||
                key === 'deploy' ||
                key === '*'
            );
        });

        if (hasDeployPermission) {
            return {
                project,
                membership,
                role: role?.name,
                isOwner: false,
                isAdmin: false,
            };
        }

        throw new ApiError(
            403,
            'You do not have permission to trigger deployments for this project'
        );
    }

    return {
        project,
        membership,
        role: membership.project_roles?.name,
        isOwner: false,
        isAdmin: false,
    };
}

/**
 * DETAILS-01 — Project Overview
 * GET /api/projects/:projectId
 */
async function getProjectOverview(projectId, user) {
    await verifyProjectAccess(projectId, user.id, user.role, 'view');

    const project = await projectsRepository.getProjectOverview(projectId);
    if (!project) {
        throw new ApiError(404, 'Project not found');
    }

    const latestDeployment = project.deployments?.[0] || null;

    const repository = {
        id: project.github_repo_id || null,
        owner:
            project.github_repo_owner ||
            (project.github_repo_full_name
                ? project.github_repo_full_name.split('/')[0]
                : null),
        fullName: project.github_repo_full_name || null,
        url:
            project.repository_url ||
            (project.github_repo_full_name
                ? `https://github.com/${project.github_repo_full_name}`
                : null),
    };

    // Safe target info without credentials or secrets
    const target = {
        provider: 'AWS_EKS',
        environment: project.default_environment || 'development',
        cluster: 'k8s-cluster',
        namespace: `app-${project.slug}`,
        replicas: latestDeployment?.replicas || 1,
    };

    return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description || null,
        repository,
        selectedBranch: project.repository_branch || 'main',
        environment: project.default_environment || 'development',
        setupStatus: project.setup_status,
        latestDeployment: latestDeployment
            ? {
                  id: latestDeployment.id,
                  status: latestDeployment.status,
                  environment: latestDeployment.environment,
                  branch: latestDeployment.branch,
                  commitSha: latestDeployment.commit_sha,
                  startedAt: latestDeployment.started_at,
                  finishedAt: latestDeployment.finished_at,
                  createdAt: latestDeployment.created_at,
                  updatedAt: latestDeployment.updated_at,
                  errorMessage: latestDeployment.error_message,
              }
            : null,
        target,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
    };
}

/**
 * DETAILS-02 — Project Deployment History
 * GET /api/projects/:projectId/deployments
 */
async function getDeploymentHistory(
    projectId,
    user,
    query = {}
) {
    await verifyProjectAccess(projectId, user.id, user.role, 'view');

    const safePage = Math.max(1, Number(query.page) || 1);
    // Support per_page as canonical parameter, and limit as backward-compatible alias
    const requestedLimit =
        query.per_page !== undefined ? query.per_page : query.limit;
    const safePerPage = Math.min(100, Math.max(1, Number(requestedLimit) || 20));
    const skip = (safePage - 1) * safePerPage;

    const [deployments, total] = await Promise.all([
        projectsRepository.getProjectDeployments(projectId, {
            skip,
            take: safePerPage,
            environment: query.environment,
            status: query.status,
        }),
        projectsRepository.countProjectDeployments(projectId, {
            environment: query.environment,
            status: query.status,
        }),
    ]);

    const formattedDeployments = deployments.map((d) => ({
        id: d.id,
        projectId: d.project_id,
        environment: d.environment,
        branch: d.branch,
        commitSha: d.commit_sha,
        status: d.status,
        replicas: d.replicas,
        startedAt: d.started_at,
        finishedAt: d.finished_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        errorMessage: d.error_message,
        createdBy: d.users
            ? {
                  id: d.users.id,
                  name: d.users.name,
              }
            : null,
    }));

    return {
        deployments: formattedDeployments,
        pagination: {
            page: safePage,
            perPage: safePerPage,
            total,
            totalPages: Math.ceil(total / safePerPage) || 1,
        },
    };
}

/**
 * DETAILS-03 — Submit Deployment Request
 * POST /api/projects/:projectId/deployments
 */
async function submitDeploymentRequest(projectId, user, input, correlationId) {
    // 1. Verify project access and deployment permission
    const { project } = await verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'deploy'
    );

    // 2. Validate project configuration and setup readiness
    if (!project.github_repo_full_name && !project.repository_url) {
        throw new ApiError(
            400,
            'Project repository is not configured. Please configure a valid Git repository before requesting a deployment.'
        );
    }

    // Check if project has a BYOS EC2 or BYOC AWS EKS Cluster target configured
    const ec2Target = await ec2TargetRepository.findByProjectId(projectId).catch(() => null);
    const awsClusterTarget = !ec2Target
        ? await awsClusterRepository.findByProjectId(projectId).catch(() => null)
        : null;

    // Disallow deployment if infrastructure setup is not completely READY (unless EC2 BYOS or BYOC Cluster target is configured)
    if (!ec2Target && !awsClusterTarget) {
        if (project.setup_status === 'FAILED') {
            throw new ApiError(
                400,
                'Project setup status is FAILED. Please resolve project configuration before deploying.'
            );
        }

        if (project.setup_status !== 'READY') {
            throw new ApiError(
                400,
                `Project infrastructure setup is not ready (current status: '${project.setup_status}'). Deployment requests are only allowed when setup status is 'READY'.`
            );
        }
    }

    // 3. Validate target environment
    const targetEnvironment =
        input.environment || project.default_environment || 'development';
    if (!ALLOWED_ENVIRONMENTS.includes(targetEnvironment)) {
        throw new ApiError(
            400,
            `Target environment '${targetEnvironment}' is invalid. Allowed environments: ${ALLOWED_ENVIRONMENTS.join(', ')}`
        );
    }

    // 4. Handle pre-flight idempotency key check (fast path)
    const idempotencyKey = input.idempotencyKey || null;
    if (idempotencyKey) {
        const existing = await projectsRepository.findDeploymentByIdempotencyKey(
            user.id,
            idempotencyKey
        );
        if (existing) {
            return {
                idempotent: true,
                deploymentId: existing.id,
                status: existing.status,
                environment: existing.environment,
                branch: existing.branch,
                commitSha: existing.commit_sha,
                createdAt: existing.created_at,
                correlationId,
                job: {
                    provider: getCiProvider(),
                    status: existing.status,
                    jobName: getCiJobName(),
                },
            };
        }
    }

    // 5. Pre-flight check for duplicate active deployment requests
    const activeDeployment = await projectsRepository.findActiveDeployment(
        projectId,
        targetEnvironment
    );
    if (activeDeployment) {
        throw new ApiError(
            409,
            `An active deployment (${activeDeployment.id}) is already in progress with status '${activeDeployment.status}' for environment '${targetEnvironment}'. Please wait for it to finish or cancel it before triggering a new deployment.`
        );
    }

    // 6. Resolve branch and capture exact commit SHA
    const selectedBranch =
        input.branch || project.repository_branch || 'main';

    let repoOwner = project.github_repo_owner;
    let repoName = null;
    if (project.github_repo_full_name) {
        const parts = project.github_repo_full_name.split('/');
        repoOwner = repoOwner || parts[0];
        repoName = parts[1];
    }

    let resolvedCommit;
    try {
        resolvedCommit = await githubService.resolveBranchCommit({
            userId: user.id,
            ownerUserId: project.owner_user_id,
            owner: repoOwner,
            repo: repoName,
            branch: selectedBranch,
            commitSha: input.commitSha,
        });
    } catch (err) {
        if (err instanceof ApiError) {
            throw err;
        }
        throw new ApiError(400, `Commit resolution failed: ${err.message}`);
    }

    const finalCommitSha = resolvedCommit.sha;
    const finalBranch = resolvedCommit.branch || selectedBranch;
    const repoUrl =
        project.repository_url ||
        (project.github_repo_full_name
            ? `https://github.com/${project.github_repo_full_name}.git`
            : '');

    // 7. Snapshot execution configuration (No raw secrets!)
    const executionSnapshot = {
        projectId: project.id,
        environment: targetEnvironment,
        repository: {
            id: project.github_repo_id || null,
            fullName: project.github_repo_full_name || null,
            url: repoUrl,
        },
        git: {
            branch: finalBranch,
            commitSha: finalCommitSha,
        },
        build: {
            dockerfilePath: input.dockerfilePath || 'Dockerfile',
            replicas: input.replicas || 1,
        },
        target: ec2Target
            ? {
                  platform: 'Docker',
                  provider: 'AWS_EC2',
                  host: `${ec2Target.public_ip}:${ec2Target.host_port}`,
              }
            : awsClusterTarget
              ? {
                    platform: 'Kubernetes',
                    provider: 'AWS_EKS_BYOC',
                    namespace: `app-${project.slug}`,
                    cluster: awsClusterTarget.cluster_name,
                    region: awsClusterTarget.aws_region,
                }
              : {
                    platform: 'Kubernetes',
                    provider: 'AWS_EKS',
                    namespace: `app-${project.slug}`,
                    cluster: 'k8s-cluster',
                },
        secretReferences: [
            {
                name: 'APP_SECRETS',
                reference: `secretsmanager:projects/${project.slug}/${targetEnvironment}`,
                type: 'AWS_SECRETS_MANAGER_REF',
            },
        ],
        correlationId,
        triggeredBy: {
            userId: user.id,
            userRole: user.role,
        },
        timestamp: new Date().toISOString(),
    };

    // 8. Atomically create deployment in Queued status, CI job, snapshot event, and audit log
    // Protected by PostgreSQL transaction advisory lock and unique constraint handling
    const txResult =
        await projectsRepository.createDeploymentTransaction({
            deploymentData: {
                project_id: project.id,
                environment: targetEnvironment,
                repository_url: repoUrl,
                branch: finalBranch,
                commit_sha: finalCommitSha,
                replicas: input.replicas || 1,
                status: 'QUEUED',
                created_by_user_id: user.id,
                idempotency_key: idempotencyKey,
            },
            ciJobData: {
                project_id: project.id,
                provider: getCiProvider(),
                job_name: getCiJobName(),
                status: 'PENDING',
            },
            eventData: {
                stage: 'QUEUED',
                from_state: null,
                to_state: 'QUEUED',
                message:
                    'Deployment request accepted and queued for pipeline execution',
                metadata: { snapshot: executionSnapshot },
            },
            auditData: {
                actor_user_id: user.id,
                project_id: project.id,
                event_type: 'DEPLOYMENT_REQUESTED',
                resource_type: 'deployment',
                metadata: {
                    environment: targetEnvironment,
                    branch: finalBranch,
                    commitSha: finalCommitSha,
                    correlationId,
                },
            },
        });

    // If transaction caught a concurrent duplicate Idempotency-Key insert, return existing deployment
    if (txResult.idempotent) {
        const existing = txResult.deployment;
        return {
            idempotent: true,
            deploymentId: existing.id,
            status: existing.status,
            environment: existing.environment,
            branch: existing.branch,
            commitSha: existing.commit_sha,
            createdAt: existing.created_at,
            correlationId,
            job: {
                provider: getCiProvider(),
                status: existing.status,
                jobName: getCiJobName(),
            },
        };
    }

    const { deployment, ciJob } = txResult;

    // 9a. SAAS BYOS EC2 Deployment Path
    if (ec2Target) {
        // Fetch GitHub token for private repo access (non-blocking on failure)
        let ec2GithubToken = null;
        try {
            ec2GithubToken = await githubService.getUserAccessToken(user.id);
            if (!ec2GithubToken && project.owner_user_id && project.owner_user_id !== user.id) {
                ec2GithubToken = await githubService.getUserAccessToken(project.owner_user_id);
            }
        } catch {
            // Public repos will work without token
        }

        let storedEnvVars = {};
        try {
            const envVarsService = require('./envVars.service');
            storedEnvVars = await envVarsService.getDecryptedEnvMap(project.id);
        } catch {
            // Non-blocking fallback
        }
        const mergedEnvVars = { ...storedEnvVars, ...(input.envVars || {}) };

        setImmediate(() => {
            const ec2DeploymentOrchestrator = require('../deployments/ec2-deployment.orchestrator');
            void ec2DeploymentOrchestrator.executeEc2Deployment({
                deploymentId: deployment.id,
                projectId: project.id,
                projectName: project.slug || project.name,
                repoUrl,
                branch: finalBranch,
                envVars: mergedEnvVars,
                githubToken: ec2GithubToken,
            });
        });

        return {
            deploymentId: deployment.id,
            status: 'QUEUED',
            target: 'AWS_EC2',
            host: `${ec2Target.public_ip}:${ec2Target.host_port}`,
            environment: targetEnvironment,
            branch: finalBranch,
            commitSha: finalCommitSha,
            createdAt: deployment.created_at,
            correlationId,
        };
    }

    // 9b-BYOC. Cluster Mode (BYOC AWS EKS via Terraform + ECR + K8s)
    if (awsClusterTarget) {
        let byocGithubToken = null;
        try {
            byocGithubToken = await githubService.getUserAccessToken(user.id);
            if (!byocGithubToken && project.owner_user_id && project.owner_user_id !== user.id) {
                byocGithubToken = await githubService.getUserAccessToken(project.owner_user_id);
            }
        } catch {
            // Public repos work without token
        }

        setImmediate(() => {
            const byocClusterOrchestrator = require('../deployments/byoc-cluster.orchestrator');
            void byocClusterOrchestrator.executeByocClusterDeployment({
                deploymentId: deployment.id,
                projectId: project.id,
                projectName: project.slug || project.name,
                repoUrl,
                branch: finalBranch,
                githubToken: byocGithubToken,
                replicas: input.replicas || 1,
                dockerfilePath: input.dockerfilePath || 'Dockerfile',
                envVars: input.envVars || {},
            });
        });

        return {
            deploymentId: deployment.id,
            status: 'QUEUED',
            target: 'AWS_EKS_BYOC',
            clusterName: awsClusterTarget.cluster_name,
            region: awsClusterTarget.aws_region,
            environment: targetEnvironment,
            branch: finalBranch,
            commitSha: finalCommitSha,
            createdAt: deployment.created_at,
            correlationId,
        };
    }

    // 9b. Legacy CI service dispatch path
    const activeCiService = getCiService();
    const jobContract = activeCiService.buildDeploymentContract({
        project,
        deployment,
        branch: finalBranch,
        commitSha: finalCommitSha,
        environment: targetEnvironment,
        dockerfilePath: input.dockerfilePath,
        replicas: input.replicas,
        correlationId,
        user,
    });

    let userToken = null;
    try {
        userToken = await githubService.getUserAccessToken(user.id);
        if (!userToken && project.owner_user_id && project.owner_user_id !== user.id) {
            userToken = await githubService.getUserAccessToken(project.owner_user_id);
        }
    } catch {
        // Non-blocking fallback
    }

    let jobResult;
    try {
        jobResult = await activeCiService.triggerDeploymentJob(jobContract, userToken);
        await projectsRepository.markDeploymentDispatched(
            deployment.id,
            ciJob.id,
            jobResult.jobId,
            jobResult.queueItemUrl
        );
    } catch (err) {
        if (err.isTimeout) {
            // RELIABILITY REQUIREMENT:
            // Ambiguous dispatch timeout handling.
            // A timeout does NOT mean CI rejected the build.
            // Keep status as QUEUED to maintain concurrency locks and prevent duplicate builds,
            // while recording reconciliation pending state for Point 6 worker tracking.
            await projectsRepository.markDeploymentDispatchUnknown(
                deployment.id,
                ciJob.id,
                err.message
            );

            throw new ApiError(
                504,
                `Deployment created with ID ${deployment.id}, but the CI pipeline dispatch response timed out. The deployment remains in QUEUED status pending background reconciliation via DEPLOYMENT_ID to prevent duplicate builds.`
            );
        }

        // Definite failure: mark deployment as FAILED
        await projectsRepository.markDeploymentFailed(
            deployment.id,
            ciJob.id,
            `CI pipeline dispatch failed: ${err.message}`
        );

        throw new ApiError(
            502,
            `Deployment created with ID ${deployment.id}, but CI pipeline dispatch failed: ${err.message}. Deployment marked as FAILED.`
        );
    }

    // 10. Return deployment ID and Queued status
    return {
        deploymentId: deployment.id,
        status: 'QUEUED',
        environment: targetEnvironment,
        branch: finalBranch,
        commitSha: finalCommitSha,
        createdAt: deployment.created_at,
        correlationId,
        job: {
            provider: getCiProvider(),
            status: 'QUEUED',
            jobName: getCiJobName(),
            jobId: jobResult.jobId,
        },
    };
}


async function listProjects(user) {
    const isAdmin = user.role === 'ADMIN';
    const projects = await projectsRepository.listProjectsForUser(user.id, isAdmin);

    return projects.map((p) => {
        const latestDeploy = p.deployments?.[0] || null;
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            repositoryUrl: p.repository_url,
            repositoryBranch: p.repository_branch,
            defaultEnvironment: p.default_environment,
            setupStatus: p.setup_status,
            githubRepoId: p.github_repo_id,
            githubRepoOwner: p.github_repo_owner,
            githubRepoFullName: p.github_repo_full_name,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            latestDeployment: latestDeploy
                ? {
                      id: latestDeploy.id,
                      status: latestDeploy.status,
                      environment: latestDeploy.environment,
                      commitSha: latestDeploy.commit_sha,
                      branch: latestDeploy.branch,
                      createdAt: latestDeploy.created_at,
                      updatedAt: latestDeploy.updated_at,
                  }
                : null,
        };
    });
}

async function createProject(user, projectData) {
    const {
        name,
        slug: requestedSlug,
        description,
        repositoryUrl,
        repositoryBranch = 'main',
        defaultEnvironment = 'development',
        githubRepoId,
        githubRepoOwner,
        githubRepoFullName,
    } = projectData;

    // Check if repo already registered for this environment
    if (githubRepoId) {
        const existing = await projectsRepository.findProjectByRepoAndEnv(
            githubRepoId,
            defaultEnvironment
        );
        if (existing) {
            throw new ApiError(
                409,
                `A project connected to this GitHub repository in environment '${defaultEnvironment}' already exists.`
            );
        }
    }

    // Generate slug
    let baseSlug = (requestedSlug || name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'project';

    let slug = baseSlug;
    let counter = 1;
    while (await projectsRepository.findProjectBySlug(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    // Create project record
    const newProject = await projectsRepository.createProjectRecord({
        name: name.trim(),
        slug,
        description: description ? description.trim() : null,
        owner_user_id: user.id,
        repository_url: repositoryUrl ? repositoryUrl.trim() : null,
        repository_branch: repositoryBranch ? repositoryBranch.trim() : 'main',
        default_environment: defaultEnvironment,
        setup_status: 'READY',
        github_repo_id: githubRepoId ? String(githubRepoId) : null,
        github_repo_owner: githubRepoOwner ? githubRepoOwner.trim() : null,
        github_repo_full_name: githubRepoFullName ? githubRepoFullName.trim() : null,
    });

    return {
        id: newProject.id,
        name: newProject.name,
        slug: newProject.slug,
        description: newProject.description,
        repositoryUrl: newProject.repository_url,
        repositoryBranch: newProject.repository_branch,
        defaultEnvironment: newProject.default_environment,
        setupStatus: newProject.setup_status,
        githubRepoId: newProject.github_repo_id,
        githubRepoOwner: newProject.github_repo_owner,
        githubRepoFullName: newProject.github_repo_full_name,
        createdAt: newProject.created_at,
        updatedAt: newProject.updated_at,
    };
}

/**
 * SETUP-02: Inspects repository metadata and root manifests via GitHub API.
 * Detects Dockerfile and application manifests (Node.js, Python, Java, Go, Rust, etc.)
 * Returns supported: true only if a valid Dockerfile is detected.
 */
async function analyzeRepository(user, { owner, repo, branch = 'main', dockerfilePath = 'Dockerfile' }) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    return githubService.analyzeRepository({
        userId: user.id,
        owner,
        repo,
        branch,
        dockerfilePath,
    });
}

// ─── SETUP-05: Infrastructure Setup Pipeline ──────────────────────────────────

/**
 * SETUP-05 — Start the infrastructure setup pipeline for a project.
 * POST /api/projects/:projectId/setup
 *
 * Steps:
 *   1. Verify the caller has 'deploy' permission on the project.
 *   2. Confirm valid MVP configuration (repository connected).
 *   3. Prevent duplicate active setups (unless force=true and last run FAILED).
 *   4. Create a deployment record with environment='setup' + ci_job + event + audit_log.
 *   5. Update project.setup_status → IN_PROGRESS.
 *   6. Dispatch setup job to GitHub Actions asynchronously.
 *   7. Return pipeline ID + QUEUED status without waiting for execution.
 */
async function startProjectSetup(projectId, user, { force = false } = {}, correlationId) {
    // 1. Verify deploy permission
    const { project } = await verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'deploy'
    );

    // 2. Validate MVP configuration: a repository must be connected
    if (!project.github_repo_full_name && !project.repository_url) {
        throw new ApiError(
            400,
            'Project repository is not configured. Please connect a GitHub repository before starting the setup pipeline.'
        );
    }

    // 3. Prevent duplicate active setup operations
    const activeSetup = await projectsRepository.findActiveSetup(projectId);
    if (activeSetup) {
        throw new ApiError(
            409,
            `A setup pipeline (${activeSetup.id}) is already in progress with status '${activeSetup.status}'. Please wait for it to finish before starting a new one.`
        );
    }

    // If force=true allow re-running when last setup FAILED; otherwise block re-run if READY
    if (!force && project.setup_status === 'READY') {
        throw new ApiError(
            409,
            "Project setup is already READY. Pass { force: true } in the request body to re-run the setup pipeline."
        );
    }

    // 4. Build deployment data for setup pipeline
    const repoUrl =
        project.repository_url ||
        (project.github_repo_full_name
            ? `https://github.com/${project.github_repo_full_name}.git`
            : '');

    const setupCorrelationId = correlationId || `setup-${projectId}-${Date.now()}`;

    // Atomically create setup deployment record (reuses createDeploymentTransaction)
    let txResult;
    try {
        txResult = await projectsRepository.createSetupDeploymentRecord({
            deploymentData: {
                project_id: project.id,
                environment: 'setup',
                repository_url: repoUrl,
                branch: project.repository_branch || 'main',
                commit_sha: null,
                replicas: 1,
                status: 'QUEUED',
                created_by_user_id: user.id,
                idempotency_key: null,
            },
            ciJobData: {
                project_id: project.id,
                provider: getCiProvider(),
                job_name: process.env.GITHUB_SETUP_WORKFLOW_FILE || 'setup.yml',
                status: 'PENDING',
            },
            eventData: {
                stage: 'QUEUED',
                from_state: null,
                to_state: 'QUEUED',
                message: 'Infrastructure setup pipeline queued',
                metadata: { setupCorrelationId, triggeredBy: { userId: user.id, userRole: user.role } },
            },
            auditData: {
                actor_user_id: user.id,
                project_id: project.id,
                event_type: 'SETUP_REQUESTED',
                resource_type: 'deployment',
                metadata: {
                    environment: 'setup',
                    correlationId: setupCorrelationId,
                    force,
                },
            },
        });
    } catch (err) {
        // Re-throw ApiError (e.g., duplicate from advisory lock)
        if (err instanceof ApiError) throw err;
        throw new ApiError(500, `Failed to create setup pipeline record: ${err.message}`);
    }

    const { deployment, ciJob } = txResult;

    // 5. Update project setup_status → IN_PROGRESS
    try {
        await projectsRepository.updateProjectSetupStatus(project.id, 'IN_PROGRESS');
    } catch (err) {
        // Non-fatal: deployment record was created, log and continue
        // (status reconciliation can fix this via polling)
    }

    // 6. Build job contract and dispatch to GitHub Actions asynchronously
    const activeCiService = getCiService();
    const jobContract = activeCiService.buildDeploymentContract({
        project,
        deployment,
        branch: project.repository_branch || 'main',
        commitSha: null,
        environment: 'setup',
        dockerfilePath: 'Dockerfile',
        replicas: 1,
        correlationId: setupCorrelationId,
        user,
    });

    let userToken = null;
    try {
        userToken = await githubService.getUserAccessToken(user.id);
        if (!userToken && project.owner_user_id && project.owner_user_id !== user.id) {
            userToken = await githubService.getUserAccessToken(project.owner_user_id);
        }
    } catch {
        // Non-blocking fallback
    }

    try {
        const jobResult = await activeCiService.triggerDeploymentJob(jobContract, userToken);
        await projectsRepository.markDeploymentDispatched(
            deployment.id,
            ciJob.id,
            jobResult.jobId,
            jobResult.queueItemUrl
        );

        return {
            setupPipelineId: deployment.id,
            status: 'QUEUED',
            environment: 'setup',
            correlationId: setupCorrelationId,
            createdAt: deployment.created_at,
            job: {
                provider: getCiProvider(),
                status: 'QUEUED',
                jobName: process.env.GITHUB_SETUP_WORKFLOW_FILE || 'setup.yml',
                jobId: jobResult.jobId,
            },
        };
    } catch (err) {
        if (err.isTimeout) {
            await projectsRepository.markDeploymentDispatchUnknown(
                deployment.id,
                ciJob.id,
                err.message
            );
            throw new ApiError(
                504,
                `Setup pipeline created with ID ${deployment.id}, but CI dispatch timed out. The setup remains in QUEUED status pending background reconciliation.`
            );
        }

        // Definite failure: mark setup as FAILED and revert project status
        await projectsRepository.markDeploymentFailed(
            deployment.id,
            ciJob.id,
            `Setup CI dispatch failed: ${err.message}`
        );
        await projectsRepository.updateProjectSetupStatus(project.id, 'FAILED').catch(() => {});

        throw new ApiError(
            502,
            `Setup pipeline created with ID ${deployment.id}, but CI dispatch failed: ${err.message}. Setup marked as FAILED.`
        );
    }
}

/**
 * SETUP-05 — Get the current setup status for a project.
 * GET /api/projects/:projectId/setup-status
 *
 * Returns the project's overall setup_status and details of the latest
 * setup deployment pipeline (stages, timestamps, safe error summary).
 */
async function getSetupStatus(projectId, user) {
    // Verify view access (any project member may poll setup status)
    const { project } = await verifyProjectAccess(
        projectId,
        user.id,
        user.role,
        'view'
    );

    const latestSetup = await projectsRepository.getLatestSetupDeployment(projectId);

    // Build a sanitized error summary — never expose raw tokens or secrets
    const sanitizeError = (msg) => {
        if (!msg) return null;
        // Strip any credential-looking tokens
        return msg
            .replace(/(?:bearer|basic|token|password|secret|authorization)[:\s=]+\S+/gi, '[REDACTED]')
            .substring(0, 300);
    };

    // Map deployment_events to stages
    const stages = latestSetup?.deployment_events?.map((ev) => ({
        stage: ev.stage,
        fromState: ev.from_state,
        toState: ev.to_state,
        message: ev.message,
        occurredAt: ev.created_at,
    })) || [];

    const latestCiJob = latestSetup?.ci_jobs?.[0] || null;

    return {
        setupStatus: project.setup_status,
        pipeline: latestSetup
            ? {
                  id: latestSetup.id,
                  status: latestSetup.status,
                  environment: latestSetup.environment,
                  startedAt: latestSetup.started_at || latestSetup.created_at,
                  finishedAt: latestSetup.finished_at || null,
                  createdAt: latestSetup.created_at,
                  updatedAt: latestSetup.updated_at,
                  errorSummary: sanitizeError(latestSetup.error_message),
                  stages,
                  ciJob: latestCiJob
                      ? {
                            provider: latestCiJob.provider,
                            status: latestCiJob.status,
                            jobName: latestCiJob.job_name,
                            externalJobId: latestCiJob.external_job_id || null,
                            url: latestCiJob.url || null,
                        }
                      : null,
              }
            : null,
    };
}

async function deleteProject(projectId, user) {
    if (!user || !user.id) {
        throw new ApiError(401, 'Authentication required');
    }

    const access = await verifyProjectAccess(
        projectId,
        user.id,
        user.role || user.platform_role,
        'deploy'
    );

    if (!access.isOwner && !access.isAdmin) {
        throw new ApiError(403, 'Only the project owner or platform admin can delete this project');
    }

    await projectsRepository.deleteProjectById(projectId);
    return { id: projectId, deleted: true };
}

Object.assign(module.exports, {
    listProjects,
    createProject,
    ALLOWED_ENVIRONMENTS,
    verifyProjectAccess,
    getProjectOverview,
    getDeploymentHistory,
    submitDeploymentRequest,
    analyzeRepository,
    // SETUP-05
    startProjectSetup,
    getSetupStatus,
    deleteProject,
});
