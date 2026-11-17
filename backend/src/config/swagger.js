// backend/src/config/swagger.js
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Intelligent Infrastructure Automation Platform API',
      version: '1.0.0',
      description:
        'Interactive REST API documentation for the Intelligent Infrastructure Automation Platform.\n\n' +
        '### How to authenticate:\n' +
        '1. Use **POST /api/v1/auth/signin** with your credentials to obtain an `accessToken`.\n' +
        '2. Click the **Authorize 🔓** button at the top right of this page.\n' +
        '3. Enter your token in the `bearerAuth` field (format: simply paste the JWT string).\n' +
        '4. Click **Authorize** — all authenticated requests will now include your token automatically.\n\n' +
        '*For worker webhook callbacks (/api/deployments/{id}/status), supply the `X-Worker-Api-Key` header via `workerApiKey`.*',
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment (relative — works on Railway & localhost)',
      },
      {
        url: 'https://automated-devops.up.railway.app',
        description: 'Railway Production',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from POST /api/v1/auth/signin',
        },
        workerApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Worker-Api-Key',
          description: 'Worker authentication key for CI/CD status callbacks',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found' },
            error: { type: 'string', example: 'Detailed error description' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Alex Developer' },
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        SignUpRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'confirmPassword'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Alex Developer' },
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            password: { type: 'string', minLength: 8, maxLength: 72, example: 'SecurePassword123!' },
            confirmPassword: { type: 'string', minLength: 8, maxLength: 72, example: 'SecurePassword123!' },
          },
        },
        SignInRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
            password: { type: 'string', example: 'SecurePassword123!' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'alex@example.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password', 'confirmPassword'],
          properties: {
            token: { type: 'string', example: 'reset-token-from-email' },
            password: { type: 'string', minLength: 8, example: 'NewSecurePassword123!' },
            confirmPassword: { type: 'string', minLength: 8, example: 'NewSecurePassword123!' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Alex NewName' },
            email: { type: 'string', format: 'email', example: 'newemail@example.com' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string', example: 'CurrentPassword123!' },
            newPassword: { type: 'string', minLength: 8, example: 'NewPassword123!' },
            confirmPassword: { type: 'string', minLength: 8, example: 'NewPassword123!' },
          },
        },
        CreateProjectRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'My Web Application' },
            description: { type: 'string', maxLength: 500, example: 'Production backend service' },
            repositoryUrl: { type: 'string', format: 'uri', example: 'https://github.com/my-org/web-service' },
            repositoryBranch: { type: 'string', default: 'main', example: 'main' },
            defaultEnvironment: {
              type: 'string',
              enum: ['development', 'staging', 'production', 'test', 'preview'],
              default: 'development',
              example: 'development',
            },
            githubRepoOwner: { type: 'string', example: 'my-org' },
            githubRepoFullName: { type: 'string', example: 'my-org/web-service' },
            buildCommand: { type: 'string', example: 'npm run build' },
            outputDirectory: { type: 'string', example: 'dist' },
          },
        },
        ProjectOverview: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            repository_url: { type: 'string', nullable: true },
            repository_branch: { type: 'string' },
            default_environment: { type: 'string' },
            setup_status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'READY', 'FAILED'] },
            created_at: { type: 'string', format: 'date-time' },
            latest_deployment: { type: 'object', nullable: true },
          },
        },
        DeploymentRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            project_id: { type: 'string', format: 'uuid' },
            environment: { type: 'string' },
            branch: { type: 'string' },
            commit_sha: { type: 'string' },
            status: { type: 'string', enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] },
            created_at: { type: 'string', format: 'date-time' },
            started_at: { type: 'string', format: 'date-time', nullable: true },
            finished_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateDeploymentRequest: {
          type: 'object',
          properties: {
            branch: { type: 'string', example: 'main' },
            commitSha: { type: 'string', example: '0123456789abcdef0123456789abcdef01234567' },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production', 'test', 'preview'],
              default: 'development',
            },
            dockerfilePath: { type: 'string', default: 'Dockerfile', example: 'Dockerfile' },
            replicas: { type: 'integer', minimum: 1, maximum: 50, default: 1 },
            idempotencyKey: { type: 'string', example: 'req-deploy-001' },
          },
        },
        CreateDeploymentResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', example: 'QUEUED' },
            environment: { type: 'string', example: 'development' },
            branch: { type: 'string', example: 'main' },
            commitSha: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'System', description: 'System health check and status probes' },
      { name: 'Auth', description: 'Authentication, registration, sessions, and profile' },
      { name: 'GitHub', description: 'GitHub OAuth, organizations, repositories, and branches' },
      { name: 'Projects', description: 'Project management and repository analysis' },
      { name: 'Deployments', description: 'Deployment execution, history, logs, and worker callbacks' },
      { name: 'Dashboard', description: 'Aggregated platform metrics and overview' },
    ],
  },
  // Look for annotations in app.js and all module route files using normalized forward-slash paths for cross-platform compatibility
  apis: [
    path.resolve(__dirname, '../app.js').split(path.sep).join('/'),
    path.resolve(__dirname, '../modules/**/*.routes.js').split(path.sep).join('/'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  // Interactive Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'IIAP API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      },
    })
  );

  // Raw OpenAPI specification JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger;
