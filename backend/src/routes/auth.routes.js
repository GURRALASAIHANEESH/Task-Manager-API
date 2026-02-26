// ===== backend/src/routes/auth.routes.js =====

const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    changePasswordSchema,
} = require('../validators/auth.validator');

// ─────────────────────────────────────────────
// Public routes — no authentication required
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post(
    '/register',
    validate(registerSchema, 'body'),
    authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and return access token
 * @access  Public
 */
router.post(
    '/login',
    validate(loginSchema, 'body'),
    authController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Issue new access token using refresh token
 *          Refresh token is read from httpOnly cookie.
 *          Falls back to request body for non-browser clients.
 * @access  Public (token in cookie or body)
 */
router.post(
    '/refresh',
    authController.refreshToken
);

// ─────────────────────────────────────────────
// Protected routes — authentication required
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Clear refresh token cookie and invalidate session
 * @access  Private
 */
router.post(
    '/logout',
    authenticate,
    authController.logout
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get(
    '/me',
    authenticate,
    authController.getProfile
);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change authenticated user password
 * @access  Private
 */
router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema, 'body'),
    authController.changePassword
);

module.exports = router;
