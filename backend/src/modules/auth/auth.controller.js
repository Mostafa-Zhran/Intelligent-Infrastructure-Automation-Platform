// src/modules/auth/auth.controller.js 
const authService = require('./auth.service');
const asyncHandler = require('../../utils/asyncHandler');

const isProduction = process.env.NODE_ENV === 'production';

const accessCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000,
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearAccessCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
};

const clearRefreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
};

const signUp = asyncHandler(async (req, res) => {
    const result = await authService.signUp(req.body);

    res.status(201).json({
        success: true,
        data: result,
    });
});

const signIn = asyncHandler(async (req, res) => {
    const result = await authService.signIn({
        ...req.body,
        metadata: {
            userAgent: req.get('user-agent'),
            ipAddress: req.ip,
        },
    });

    res.cookie('accessToken', result.accessToken, accessCookieOptions);
    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);

    res.status(200).json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
});

const signOut = asyncHandler(async (req, res) => {
    await authService.signOut({
        refreshToken: req.cookies.refreshToken,
    });

    res.clearCookie('accessToken', clearAccessCookieOptions);
    res.clearCookie('refreshToken', clearRefreshCookieOptions);

    res.status(200).json({
        success: true,
        message: 'Signed out successfully',
    });
});

const forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetUserPassword(req.body);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

const getProfile = asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user.id);

    res.status(200).json({
        success: true,
        data: { user },
    });
});

const updateProfile = asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.user.id, req.body);

    res.status(200).json({
        success: true,
        data: { user },
    });
});

const changePassword = asyncHandler(async (req, res) => {
    const result = await authService.changePassword(
        req.user.id,
        req.body
    );

    res.clearCookie('accessToken', clearAccessCookieOptions);
    res.clearCookie('refreshToken', clearRefreshCookieOptions);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});


module.exports = {
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resetPassword,
    changePassword,
    getProfile,
    updateProfile,

};

