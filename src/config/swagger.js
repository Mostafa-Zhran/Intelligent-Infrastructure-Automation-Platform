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
    },
    tags: [
      { name: 'Auth', description: 'Authentication and profile management' },
      { name: 'GitHub', description: 'GitHub OAuth integration' },
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