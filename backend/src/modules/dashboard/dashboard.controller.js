// backend/src/modules/dashboard/dashboard.controller.js
const asyncHandler = require('../../utils/asyncHandler');
const dashboardService = require('./dashboard.service');

/**
 * GET /api/dashboard
 * Returns summary metrics, projects list, and recent deployments in a single call.
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboardSummary(req.user);

    res.status(200).json({
        success: true,
        data,
    });
});

/**
 * GET /api/dashboard/recent-deployments
 * Returns recent deployments visible to the user (sorted newest first, max 50).
 */
const getRecentDeployments = asyncHandler(async (req, res) => {
    const data = await dashboardService.getRecentDeployments(req.user, req.query.limit);

    res.status(200).json({
        success: true,
        data,
    });
});

module.exports = {
    getDashboardSummary,
    getRecentDeployments,
};
