const express = require('express');

const authController = require('./auth.controller');
const validateRequest = require('../../middleware/validateRequest');
const authenticate = require('../../middleware/authenticate');

const {
    signUpSchema,
    signInSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    changePasswordSchema,
} = require('./auth.validation');
const router = express.Router();

router.get('/signup', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Method Not Allowed. /api/v1/auth/signup accepts POST requests only. Please sign up through the frontend application.',
    });
});

router.post(
    '/signup',
    validateRequest(signUpSchema),
    authController.signUp
);

router.get('/signin', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Method Not Allowed. /api/v1/auth/signin accepts POST requests only. Please log in through the frontend application.',
    });
});

router.post(
    '/signin',
    validateRequest(signInSchema),
    authController.signIn
);

router.post(
    '/signout',
    authController.signOut
);

router.post(
    '/forgot-password',
    validateRequest(forgotPasswordSchema),
    authController.forgotPassword
);

router.post(
    '/reset-password',
    validateRequest(resetPasswordSchema),
    authController.resetPassword
);

router.get(
    '/profile',
    authenticate,
    authController.getProfile
);

router.patch(
    '/profile',
    authenticate,
    validateRequest(updateProfileSchema),
    authController.updateProfile
);

router.patch(
    '/change-password',
    authenticate,
    validateRequest(changePasswordSchema),
    authController.changePassword
);

module.exports = router;