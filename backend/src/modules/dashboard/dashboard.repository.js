// backend/src/modules/dashboard/dashboard.repository.js
const prisma = require('../../db/prisma');

async function getDashboardProjectsForUser(userId, isAdmin) {
    const where = isAdmin
        ? {}
        : {
              OR: [
                  { owner_user_id: userId },
                  {
                      project_memberships: {
                          some: { user_id: userId, status: 'ACTIVE' },
                      },
                  },
              ],
          };

    return prisma.projects.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
            deployments: {
                orderBy: [
                    { created_at: 'desc' },
                    { id: 'desc' },
                ],
                take: 1,
                select: {
                    id: true,
                    environment: true,
                    status: true,
                    branch: true,
                    commit_sha: true,
                    error_message: true,
                    created_at: true,
                    started_at: true,
                    finished_at: true,
                },
            },
        },
    });
}

async function getDashboardMetricsForUser(userId, isAdmin) {
    const projectFilter = isAdmin
        ? {}
        : {
              projects: {
                  OR: [
                      { owner_user_id: userId },
                      {
                          project_memberships: {
                              some: { user_id: userId, status: 'ACTIVE' },
                          },
                      },
                  ],
              },
          };

    const [totalProjects, runningDeployments, failedDeployments, succeededDeployments] =
        await Promise.all([
            prisma.projects.count({
                where: isAdmin
                    ? {}
                    : {
                          OR: [
                              { owner_user_id: userId },
                              {
                                  project_memberships: {
                                      some: { user_id: userId, status: 'ACTIVE' },
                                  },
                              },
                          ],
                      },
            }),
            prisma.deployments.count({
                where: {
                    ...projectFilter,
                    status: 'RUNNING',
                },
            }),
            prisma.deployments.count({
                where: {
                    ...projectFilter,
                    status: 'FAILED',
                },
            }),
            prisma.deployments.count({
                where: {
                    ...projectFilter,
                    status: 'SUCCEEDED',
                },
            }),
        ]);

    return {
        totalProjects,
        runningDeployments,
        failedDeployments,
        succeededDeployments,
    };
}

async function getRecentDeploymentsForUser(userId, isAdmin, limit = 10) {
    const where = isAdmin
        ? {}
        : {
              projects: {
                  OR: [
                      { owner_user_id: userId },
                      {
                          project_memberships: {
                              some: { user_id: userId, status: 'ACTIVE' },
                          },
                      },
                  ],
              },
          };

    return prisma.deployments.findMany({
        where,
        orderBy: [
            { created_at: 'desc' },
            { id: 'desc' },
        ],
        take: limit,
        include: {
            projects: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    github_repo_full_name: true,
                    repository_url: true,
                },
            },
            users: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });
}

module.exports = {
    getDashboardProjectsForUser,
    getDashboardMetricsForUser,
    getRecentDeploymentsForUser,
};
