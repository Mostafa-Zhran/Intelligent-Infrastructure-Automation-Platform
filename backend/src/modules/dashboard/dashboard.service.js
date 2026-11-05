// backend/src/modules/dashboard/dashboard.service.js
const dashboardRepository = require('./dashboard.repository');

function formatDeploymentSummary(d) {
    if (!d) return null;
    return {
        id: d.id,
        environment: d.environment,
        status: d.status,
        branch: d.branch || 'main',
        commitSha: d.commit_sha || null,
        errorSummary: d.status === 'FAILED' ? d.error_message || 'Deployment execution failed' : null,
        startedAt: d.started_at,
        finishedAt: d.finished_at,
        createdAt: d.created_at,
    };
}

async function getDashboardSummary(user) {
    const isAdmin = user.role === 'ADMIN';

    const [metrics, rawProjects, rawRecentDeployments] = await Promise.all([
        dashboardRepository.getDashboardMetricsForUser(user.id, isAdmin),
        dashboardRepository.getDashboardProjectsForUser(user.id, isAdmin),
        dashboardRepository.getRecentDeploymentsForUser(user.id, isAdmin, 5),
    ]);

    const projects = rawProjects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        repositoryUrl: p.repository_url,
        repositoryBranch: p.repository_branch || 'main',
        defaultEnvironment: p.default_environment,
        setupStatus: p.setup_status,
        githubRepoFullName: p.github_repo_full_name,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        latestDeployment: formatDeploymentSummary(p.deployments?.[0]),
    }));

    const recentDeployments = rawRecentDeployments.map((d) => ({
        id: d.id,
        projectId: d.project_id,
        projectName: d.projects?.name || 'Unknown Project',
        repository: d.projects?.github_repo_full_name || d.projects?.repository_url || '',
        environment: d.environment,
        status: d.status,
        branch: d.branch || 'main',
        commitSha: d.commit_sha,
        errorSummary: d.status === 'FAILED' ? d.error_message || 'Execution error' : null,
        author: d.users?.name || d.users?.email || 'System',
        startedAt: d.started_at || d.created_at,
        finishedAt: d.finished_at,
        createdAt: d.created_at,
    }));

    return {
        metrics,
        projects,
        recentDeployments,
    };
}

async function getRecentDeployments(user, rawLimit) {
    const isAdmin = user.role === 'ADMIN';
    const limit = Math.min(50, Math.max(1, parseInt(rawLimit) || 10));

    const raw = await dashboardRepository.getRecentDeploymentsForUser(user.id, isAdmin, limit);

    return {
        total: raw.length,
        limit,
        deployments: raw.map((d) => ({
            id: d.id,
            projectId: d.project_id,
            projectName: d.projects?.name || 'Unknown Project',
            repository: d.projects?.github_repo_full_name || d.projects?.repository_url || '',
            environment: d.environment,
            status: d.status,
            branch: d.branch || 'main',
            commitSha: d.commit_sha,
            errorSummary: d.status === 'FAILED' ? d.error_message || 'Execution error' : null,
            author: d.users?.name || d.users?.email || 'System',
            startedAt: d.started_at || d.created_at,
            finishedAt: d.finished_at,
            createdAt: d.created_at,
        })),
    };
}

module.exports = {
    getDashboardSummary,
    getRecentDeployments,
};
