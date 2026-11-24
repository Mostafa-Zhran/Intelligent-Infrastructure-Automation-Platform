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
    uploadAvatarSchema,
    changePasswordSchema,
} = require('./auth.validation');
const router = express.Router();

router.get('/signup', (req, res) => {
    res.status(405).json({
        success: false,
        message: 'Method Not Allowed. /api/v1/auth/signup accepts POST requests only. Please sign up through the frontend application.',
    });
});

/**
 * @openapi
 * /api/v1/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user account
 *     description: Creates a new user record and returns the created user entity.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error or passwords do not match
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email or user already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
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

/**
 * @openapi
 * /api/v1/auth/signin:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in with email and password
 *     description: Authenticates user credentials and returns a JWT accessToken in body and sets refreshToken in httpOnly cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignInRequest'
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *                     accessToken: { type: string, example: 'eyJhbGciOiJIUzI1NiIsIn...' }
 *       400:
 *         description: Validation error (missing email or password)
 *       401:
 *         description: Invalid credentials or account locked
 */
router.post(
    '/signin',
    validateRequest(signInSchema),
    authController.signIn
);

/**
 * @openapi
 * /api/v1/auth/signout:
 *   post:
 *     tags: [Auth]
 *     summary: Sign out and invalidate session
 *     description: Clears authentication cookies and invalidates refresh tokens.
 *     responses:
 *       200:
 *         description: Signed out successfully
 */
router.post(
    '/signout',
    authController.signOut
);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     description: Sends a password reset link/token to the user's email if the account exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset instructions sent if email exists
 */
router.post(
    '/forgot-password',
    validateRequest(forgotPasswordSchema),
    authController.forgotPassword
);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     description: Resets password using the token received via email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password successfully reset
 *       400:
 *         description: Invalid or expired reset token
 */
router.post(
    '/reset-password',
    validateRequest(resetPasswordSchema),
    authController.resetPassword
);

/**
 * @openapi
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized — missing or invalid JWT
 *   patch:
 *     tags: [Auth]
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @openapi
 * /api/v1/auth/profile/avatar:
 *   post:
 *     tags: [Auth]
 *     summary: Upload or update user profile image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, description: 'Base64 data URI or image URL' }
 *               avatarUrl: { type: string, description: 'Base64 data URI or image URL' }
 *     responses:
 *       200:
 *         description: Avatar updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/profile/avatar',
    authenticate,
    validateRequest(uploadAvatarSchema),
    authController.uploadAvatar
);

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change user password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or incorrect current password
 *       401:
 *         description: Unauthorized
 */
router.patch(
    '/change-password',
    authenticate,
    validateRequest(changePasswordSchema),
    authController.changePassword
);

module.exports = router;
