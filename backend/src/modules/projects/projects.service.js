// backend/src/modules/projects/projects.service.js
const ApiError = require('../../utils/ApiError');
const projectsRepository = require('./projects.repository');
const githubService = require('../integrations/github/github.service');
const jenkinsService = require('../integrations/jenkins/jenkins.service');
const jenkinsConfig = require('../integrations/jenkins/jenkins.config');

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

    // Disallow deployment if infrastructure setup is not completely READY
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
                    provider: 'JENKINS',
                    status: existing.status,
                    jobName: jenkinsConfig.jobName(),
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
        target: {
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
                provider: 'JENKINS',
                job_name: jenkinsConfig.jobName(),
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
                provider: 'JENKINS',
                status: existing.status,
                jobName: jenkinsConfig.jobName(),
            },
        };
    }

    const { deployment, ciJob } = txResult;

    // 9. Build deployment contract and dispatch to Jenkins / worker
    const jobContract = jenkinsService.buildDeploymentContract({
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

    let jobResult;
    try {
        jobResult = await jenkinsService.triggerDeploymentJob(jobContract);
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
            // A timeout does NOT mean Jenkins rejected the build.
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
            provider: 'JENKINS',
            status: 'QUEUED',
            jobName: jenkinsConfig.jobName(),
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

module.exports = {
    listProjects,
    createProject,
    ALLOWED_ENVIRONMENTS,
    verifyProjectAccess,
    getProjectOverview,
    getDeploymentHistory,
    submitDeploymentRequest,
};
