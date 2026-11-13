require('dotenv').config();

const { PrismaClient } = require('../../generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const rawDbUrl = (process.env.DATABASE_URL || '').trim();
const connectionString = rawDbUrl.replace(/^["']|["']$/g, '').trim();

const adapter = new PrismaPg({
    connectionString,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
