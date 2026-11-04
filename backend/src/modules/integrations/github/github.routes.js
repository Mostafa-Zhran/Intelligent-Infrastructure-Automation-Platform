// مسارات تكامل GitHub
const express = require('express');
const authenticate = require('../../../middleware/authenticate');
const githubController = require('./github.controller');

const router = express.Router();

/**
 * @openapi
 * /api/v1/integrations/github/connect:
 *   get:
 *     tags: [GitHub]
 *     summary: Start GitHub OAuth connection
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL generated
 *       401:
 *         description: Authentication required
 */
router.get('/connect', authenticate, githubController.startOAuth);

/**
 * @openapi
 * /api/v1/integrations/github/callback:
 *   get:
 *     tags: [GitHub]
 *     summary: Handle GitHub OAuth callback
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       302:
 *         description: Redirects to frontend with a result indicator
 */
router.get('/callback', authenticate, githubController.handleCallback);

/**
 * @openapi
 * /api/v1/integrations/github/status:
 *   get:
 *     tags: [GitHub]
 *     summary: Get GitHub connection status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection status returned
 */
router.get('/status', authenticate, githubController.getStatus);

/**
 * @openapi
 * /api/v1/integrations/github/organizations:
 *   get:
 *     tags: [GitHub]
 *     summary: List accessible GitHub organizations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: expect
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Account and organizations returned
 */
router.get('/organizations', authenticate, githubController.getOrganizations);

/**
 * @openapi
 * /api/v1/integrations/github/repositories:
 *   get:
 *     tags: [GitHub]
 *     summary: List accessible repositories for an owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Repositories returned
 */
router.get('/repositories', authenticate, githubController.getRepositories);

/**
 * @openapi
 * /api/v1/integrations/github/repositories/{owner}/{repo}/branches:
 *   get:
 *     tags: [GitHub]
 *     summary: List branches of a repository
 *     description: Returns available branches with the default branch flagged. Empty repositories return an empty branches list with emptyRepository true.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *         description: GitHub login of the personal account or organization
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository name (not the full name)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 100
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Repository and branches returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     repository:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         url:
 *                           type: string
 *                           format: uri
 *                         visibility:
 *                           type: string
 *                           enum: [public, private]
 *                         isPrivate:
 *                           type: boolean
 *                         defaultBranch:
 *                           type: string
 *                           nullable: true
 *                     branches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           isDefault:
 *                             type: boolean
 *                           protected:
 *                             type: boolean
 *                           commit:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               sha:
 *                                 type: string
 *                               url:
 *                                 type: string
 *                                 nullable: true
 *                     emptyRepository:
 *                       type: boolean
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         perPage:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: Missing or invalid parameters
 *       401:
 *         description: GitHub token revoked or authentication required
 *       403:
 *         description: Owner not available or access denied
 *       404:
 *         description: Repository not found or not accessible
 *       409:
 *         description: GitHub account not connected
 *       429:
 *         description: GitHub rate limit exceeded
 *       502:
 *         description: GitHub temporarily unavailable
 */
router.get(
    '/repositories/:owner/:repo/branches',
    authenticate,
    githubController.getRepositoryBranches
);

module.exports = router;