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

router.post(
    '/signup',
    validateRequest(signUpSchema),
    authController.signUp
);

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