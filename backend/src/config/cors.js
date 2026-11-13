const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
    : ['http://localhost:5173'];

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://intelligent-infrastructure-automation-platform.vercel.app',
    'https://intelligent-infrastructure-automati.vercel.app',
    ...configuredOrigins,
].filter(Boolean);

function isAllowed(origin) {
    if (!origin) return true;
    const cleanOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin)) return true;
    // Allow any Vercel deployment (preview or production)
    if (/^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/i.test(cleanOrigin)) return true;
    // Allow localhost on any port
    if (/^http:\/\/localhost(:\d+)?$/i.test(cleanOrigin)) return true;
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(cleanOrigin)) return true;
    return false;
}

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowed(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Idempotency-Key',
        'X-Worker-Api-Key',
        'X-Correlation-Id',
        'correlation-id',
    ],
};

module.exports = corsOptions;
