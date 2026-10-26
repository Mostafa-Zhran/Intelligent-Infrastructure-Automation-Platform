//  src/app.js 
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./modules/auth/auth.routes');
const githubRoutes = require('./modules/integrations/github/github.routes');
const notFound = require('./middleware/notFound');
const globalError = require('./middleware/globalError');
const cors = require('cors');
const corsOptions = require('./config/cors');
const setupSwagger = require('./config/swagger'); // جديد
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// إعداد توثيق OpenAPI قبل المسارات
setupSwagger(app);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Intelligent Infrastructure Automation Platform API is running',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            github: '/api/v1/integrations/github',
            docs: '/api-docs', // جديد
            openapi: '/api-docs.json', // جديد
            frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
        },
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
    });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/integrations/github', githubRoutes);

app.use(notFound);
app.use(globalError);

module.exports = app;