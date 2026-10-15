//  src/app.js 
const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./modules/auth/auth.routes');
const notFound = require('./middleware/notFound');
const globalError = require('./middleware/globalError');
const cors = require('cors');
const corsOptions = require('./config/cors');
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
    });
});

app.use('/api/v1/auth', authRoutes);

app.use(notFound);
app.use(globalError);

module.exports = app;
