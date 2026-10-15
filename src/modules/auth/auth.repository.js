const prisma = require('../../db/prisma');

async function findByEmail(email) {
    return prisma.users.findFirst({
        where: {
            email: {
                equals: email,
                mode: 'insensitive',
            },
        },
    });
}

async function findById(id) {
    return prisma.users.findUnique({
        where: { id },
    });
}

async function createUser(data) {
    return prisma.users.create({
        data: {
            name: data.name,
            email: data.email,
            password_hash: data.passwordHash,
            status: data.status,
        },
    });
}

async function updateUser(id, data) {
    return prisma.users.update({
        where: { id },
        data,
    });
}

async function getProfileById(id) {
    return prisma.users.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            platform_role: true,
            status: true,
            created_at: true,
            updated_at: true,
        },
    });
}

module.exports = {
    findByEmail,
    findById,
    createUser,
    updateUser,
    getProfileById,
};