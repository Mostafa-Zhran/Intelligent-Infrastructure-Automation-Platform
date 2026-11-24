// backend/src/db/prisma.js
require('dotenv').config();

// Bypass Node.js strict CA validation for cloud poolers with intermediate / self-signed certs (e.g. Supabase, AWS RDS)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
let connectionString = rawDbUrl.replace(/^["']|["']$/g, '').trim();

// Strip sslmode from the connection string URL so pg-pool does not override programmatic ssl options
const cleanConnectionString = connectionString
    .replace(/([?&])sslmode=[^&]+(&|$)/, '$1')
    .replace(/[?&]$/, '');

const pool = new Pool({
    connectionString: cleanConnectionString,
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on('error', (err) => {
    console.error('Unexpected database client error in connection pool:', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
