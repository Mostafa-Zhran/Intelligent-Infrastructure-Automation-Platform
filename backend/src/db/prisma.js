require('dotenv').config();

const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
let connectionString = rawDbUrl.replace(/^["']|["']$/g, '').trim();

if (connectionString.includes('sslmode=require') && !connectionString.includes('sslaccept=')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}sslaccept=accept_invalid_certs`;
}

const isRemoteOrSsl =
    connectionString.includes('sslmode=require') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('railway') ||
    (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost'));

const poolConfig = {
    connectionString,
};

if (isRemoteOrSsl) {
    poolConfig.ssl = {
        rejectUnauthorized: false,
    };
}

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
