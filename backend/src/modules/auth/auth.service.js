const authRepository = require('./auth.repository');
const {
    hashPassword,
    comparePassword,
} = require('./password.service');
const {
    generateAccessToken,
    generateRefreshToken,
} = require('./token.service');
const {
    createSession,
    revokeSessionByToken,
    revokeAllUserSessions,
} = require('./session.service');
const ApiError = require('../../utils/ApiError');
const passwordResetService = require('./password-reset.service');
const { sendPasswordResetEmail } = require('../../utils/email.service');
const { resetPassword } = require('./password-reset.service');

async function signUp({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await authRepository.findByEmail(normalizedEmail);

    if (existingUser) {
        throw new ApiError(409, 'Email is already registered');
    }

    const passwordHash = await hashPassword(password);

    const user = await authRepository.createUser({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
    });

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            platform_role: user.platform_role,
            status: user.status,
        },
    };
}

async function signIn({ email, password, metadata = {} }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findByEmail(normalizedEmail);

    if (!user || !(await comparePassword(password, user.password_hash))) {
        throw new ApiError(401, 'Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
        throw new ApiError(403, 'Account is not active');
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const session = await createSession(user, refreshToken, metadata);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            platform_role: user.platform_role,
            status: user.status,
        },
        accessToken,
        refreshToken,
        session,
    };
}

async function signOut({ refreshToken }) {
    await revokeSessionByToken(refreshToken);
}

async function forgotPassword({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findByEmail(normalizedEmail);

    const message =
        'If an account exists for this email, a reset link will be sent.';

    if (!user) {
        return { message };
    }

    const token = await passwordResetService.createPasswordResetToken(user.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl =
        `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return { message };
}

async function resetUserPassword({ token, password }) {
    return resetPassword({ token, password });
}

async function getProfile(userId) {
    const user = await authRepository.getProfileById(userId);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    return user;
}

async function updateProfile(userId, { name, email }) {
    const currentUser = await authRepository.findById(userId);

    if (!currentUser) {
        throw new ApiError(404, 'User not found');
    }

    const data = {};

    if (name !== undefined) {
        data.name = name.trim();
    }

    if (email !== undefined) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await authRepository.findByEmail(normalizedEmail);

        if (existingUser && existingUser.id !== userId) {
            throw new ApiError(409, 'Email is already registered');
        }

        data.email = normalizedEmail;
    }

    if (Object.keys(data).length === 0) {
        throw new ApiError(400, 'No profile fields provided');
    }

    const updatedUser = await authRepository.updateUser(userId, data);

    return {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        platform_role: updatedUser.platform_role,
        status: updatedUser.status,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
    };
}

async function changePassword(userId, { currentPassword, newPassword }) {
    const user = await authRepository.findById(userId);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password_hash
    );

    if (!isCurrentPasswordValid) {
        throw new ApiError(401, 'Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    await authRepository.updateUser(userId, {
        password_hash: passwordHash,
    });

    await revokeAllUserSessions(userId, 'PASSWORD_CHANGED');

    return {
        message: 'Password changed successfully. Please sign in again.',
    };
}

module.exports = {
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resetUserPassword,
    getProfile,
    updateProfile,
    changePassword,
};
