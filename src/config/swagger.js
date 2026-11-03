// إعداد Swagger UI و OpenAPI من تعليقات JSDoc
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Intelligent Infrastructure Automation Platform API',
      version: '1.0.0',
      description:
        'REST API for authentication, GitHub integration, and infrastructure automation.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from POST /api/v1/auth/signin',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Human-readable error description',
            },
          },
        },
        MessageResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '223e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
            platform_role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
            status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED'], example: 'ACTIVE' },
          },
        },
        SignUpRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'confirmPassword'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Jane Doe' },
            email: { type: 'string', format: 'email', maxLength: 254, example: 'jane.doe@example.com' },
            password: { type: 'string', minLength: 8, maxLength: 72, example: 'SecurePassword123!' },
            confirmPassword: { type: 'string', example: 'SecurePassword123!' },
          },
        },
        SignInRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
            password: { type: 'string', example: 'SecurePassword123!' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jane.doe@example.com' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'password', 'confirmPassword'],
          properties: {
            token: { type: 'string', example: 'd3b07384d113edec49eaa6238ad5ff00' },
            password: { type: 'string', minLength: 8, maxLength: 72, example: 'NewSecurePassword123!' },
            confirmPassword: { type: 'string', example: 'NewSecurePassword123!' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100, example: 'Jane Smith' },
            email: { type: 'string', format: 'email', example: 'jane.smith@example.com' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string', example: 'SecurePassword123!' },
            newPassword: { type: 'string', minLength: 8, maxLength: 72, example: 'BrandNewPassword456!' },
            confirmPassword: { type: 'string', example: 'BrandNewPassword456!' },
          },
        },
        RepositoryInfo: {
          type: 'object',
          properties: {
            id: { type: 'string', nullable: true, example: '1234567' },
            owner: { type: 'string', nullable: true, example: 'acme-org' },
            fullName: { type: 'string', nullable: true, example: 'acme-org/production-platform' },
            url: { type: 'string', nullable: true, example: 'https://github.com/acme-org/production-platform.git' },
          },
        },
        DeploymentTargetInfo: {
          type: 'object',
          description: 'Safe target infrastructure configuration (contains zero credentials or secrets)',
          properties: {
            provider: { type: 'string', example: 'AWS_EKS' },
            environment: { type: 'string', example: 'development' },
            cluster: { type: 'string', example: 'k8s-cluster' },
            namespace: { type: 'string', example: 'app-production-platform' },
            replicas: { type: 'integer', example: 1 },
          },
        },
        DeploymentRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'e5c4a3b2-1098-4765-b432-123456789abc' },
            projectId: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            environment: { type: 'string', example: 'development' },
            branch: { type: 'string', example: 'main' },
            commitSha: { type: 'string', example: '9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a' },
            status: {
              type: 'string',
              enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
              example: 'QUEUED',
            },
            replicas: { type: 'integer', example: 1 },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            finishedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time', example: '2026-11-03T10:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-11-03T10:00:00.000Z' },
            errorMessage: { type: 'string', nullable: true, example: null },
            createdBy: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid', example: '223e4567-e89b-12d3-a456-426614174000' },
                name: { type: 'string', example: 'Jane Doe' },
              },
            },
          },
        },
        ProjectOverview: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            name: { type: 'string', example: 'Production Platform' },
            slug: { type: 'string', example: 'production-platform' },
            description: { type: 'string', nullable: true, example: 'Infrastructure automation engine' },
            repository: { $ref: '#/components/schemas/RepositoryInfo' },
            selectedBranch: { type: 'string', example: 'main' },
            environment: { type: 'string', example: 'development' },
            setupStatus: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'READY', 'FAILED'],
              example: 'READY',
            },
            target: { $ref: '#/components/schemas/DeploymentTargetInfo' },
            latestDeployment: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid', example: 'e5c4a3b2-1098-4765-b432-123456789abc' },
                status: { type: 'string', example: 'SUCCEEDED' },
                environment: { type: 'string', example: 'development' },
                branch: { type: 'string', example: 'main' },
                commitSha: { type: 'string', example: '9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a' },
                startedAt: { type: 'string', format: 'date-time', nullable: true },
                finishedAt: { type: 'string', format: 'date-time', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                errorMessage: { type: 'string', nullable: true },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateDeploymentRequest: {
          type: 'object',
          properties: {
            branch: {
              type: 'string',
              description: 'Target branch to deploy. Defaults to project configured branch.',
              example: 'main',
            },
            commitSha: {
              type: 'string',
              description: 'Optional explicit 40-character hex commit SHA. If omitted, resolved automatically via GitHub.',
              example: '9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a',
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production', 'test', 'preview'],
              description: 'Target deployment environment. Defaults to project default environment.',
              example: 'development',
            },
            dockerfilePath: {
              type: 'string',
              default: 'Dockerfile',
              description: 'Relative path to Dockerfile for container image build.',
              example: 'Dockerfile',
            },
            replicas: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 1,
              description: 'Desired Kubernetes deployment replica count.',
              example: 1,
            },
            idempotencyKey: {
              type: 'string',
              description: 'Optional client idempotency key to prevent duplicate submissions.',
              example: '7856cb79-8031-477b-8f95-c6f376dd57a9',
            },
          },
        },
        CreateDeploymentResponse: {
          type: 'object',
          properties: {
            deploymentId: { type: 'string', format: 'uuid', example: 'e5c4a3b2-1098-4765-b432-123456789abc' },
            status: { type: 'string', example: 'QUEUED' },
            environment: { type: 'string', example: 'development' },
            branch: { type: 'string', example: 'main' },
            commitSha: { type: 'string', example: '9f8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-11-03T10:00:00.000Z' },
            correlationId: { type: 'string', example: 'corr-deploy-12345' },
            job: {
              type: 'object',
              properties: {
                provider: { type: 'string', example: 'JENKINS' },
                status: { type: 'string', example: 'QUEUED' },
                jobName: { type: 'string', example: 'pipeline-app-deployment' },
                jobId: { type: 'string', example: '42' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and profile management' },
      { name: 'GitHub', description: 'GitHub OAuth integration' },
      { name: 'Projects', description: 'Projects and deployment management' },
    ],
  },
  // المسارات التي تحتوي على تعليقات @openapi
  apis: ['./src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  // صفحة Swagger UI التفاعلية
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'IIAP API Docs',
    })
  );

  // ملف OpenAPI خام بصيغة JSON للاستهلاك الخارجي
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = setupSwagger;