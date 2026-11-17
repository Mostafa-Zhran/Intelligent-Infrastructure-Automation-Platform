//  src/app.js 
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const githubRoutes = require('./modules/integrations/github/github.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const deploymentsRoutes = require('./modules/deployments/deployments.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const correlationId = require('./middleware/correlationId');
const notFound = require('./middleware/notFound');
const globalError = require('./middleware/globalError');
const corsOptions = require('./config/cors');
const setupSwagger = require('./config/swagger');
const prisma = require('./db/prisma');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(correlationId);

// OpenAPI Swagger Documentation
setupSwagger(app);

/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: API root information and available endpoints
 *     responses:
 *       200:
 *         description: Service status and endpoint directory
 */
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Intelligent Infrastructure Automation Platform API is running',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            github: '/api/v1/integrations/github',
            projects: '/api/projects',
            deployments: '/api/deployments',
            dashboard: '/api/dashboard',
            docs: '/api-docs',
            openapi: '/api-docs.json',
            frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
        },
    });
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health and database connectivity probe
 *     description: Executes a live ping against PostgreSQL / Supabase and returns server uptime.
 *     responses:
 *       200:
 *         description: Server healthy and database connected
 *       503:
 *         description: Database unreachable or configuration error
 */
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        let githubStatesTable = 'ok';
        try {
            await prisma.github_oauth_states.count();
        } catch (e) {
            githubStatesTable = e.message;
        }

        res.status(200).json({
            status: 'ok',
            database: 'connected',
            githubConfig: {
                githubStatesTable,
                clientIdConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID.trim()),
                clientSecretConfigured: Boolean(process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CLIENT_SECRET.trim()),
                redirectUriConfigured: Boolean(process.env.GITHUB_OAUTH_REDIRECT_URI && process.env.GITHUB_OAUTH_REDIRECT_URI.trim()),
                encryptionKeyConfigured: Boolean(process.env.GITHUB_TOKEN_ENCRYPTION_KEY && process.env.GITHUB_TOKEN_ENCRYPTION_KEY.trim()),
            },
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(503).json({
            status: 'degraded',
            database: 'disconnected',
            error: err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/integrations/github', githubRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/deployments', deploymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(globalError);

module.exports = app;
