// ===== backend/src/controllers/authController.js =====

const authService = require('../services/authService');
const { sendOk, sendCreated } = require('../utils/apiResponse');

// ─────────────────────────────────────────────
// Controllers are intentionally thin.
// They handle only:
//   1. Extracting data from req
//   2. Calling the appropriate service
//   3. Sending the response
//
// All business logic lives in services.
// All error handling is delegated to the global
// error middleware via next(error).
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// register
// POST /api/v1/auth/register
// ─────────────────────────────────────────────
const register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.register({ email, password });

        // Set refresh token in httpOnly cookie — never exposed to JS
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days in ms
            path: '/api/v1/auth/refresh',                  // Scoped — only sent to refresh endpoint
        });

        return sendCreated(res, 'Account created successfully.', {
            user: result.user,
            accessToken: result.accessToken,
            // refreshToken is in httpOnly cookie — NOT in response body
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// login
// POST /api/v1/auth/login
// ─────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        // Rotate refresh token cookie on every login
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/v1/auth/refresh',
        });

        return sendOk(res, 'Login successful.', {
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// logout
// POST /api/v1/auth/logout
//
// Clears the httpOnly refresh token cookie.
// The client is responsible for discarding the
// access token from memory.
// ─────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/v1/auth/refresh',
        });

        return sendOk(res, 'Logged out successfully.');
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// refreshToken
// POST /api/v1/auth/refresh
//
// Reads refresh token from httpOnly cookie.
// Returns a new access token.
// ─────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
    try {
        // Read from cookie (preferred) or fall back to body
        // for clients that cannot use cookies (mobile apps, etc.)
        const token = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!token) {
            const AppError = require('../utils/AppError');
            return next(
                AppError.unauthorized(
                    'No refresh token provided. Please log in again.',
                    'NO_REFRESH_TOKEN'
                )
            );
        }

        const result = await authService.refreshAccessToken({ refreshToken: token });

        return sendOk(res, 'Access token refreshed successfully.', {
            accessToken: result.accessToken,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// getProfile
// GET /api/v1/auth/me
// ─────────────────────────────────────────────
const getProfile = async (req, res, next) => {
    try {
        const profile = await authService.getProfile(req.user.id);

        return sendOk(res, 'Profile retrieved successfully.', { user: profile });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// changePassword
// POST /api/v1/auth/change-password
// ─────────────────────────────────────────────
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        await authService.changePassword(req.user.id, { currentPassword, newPassword });

        // Invalidate refresh token cookie on password change
        // Forces re-login on all devices (basic session revocation)
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/v1/auth/refresh',
        });

        return sendOk(res, 'Password changed successfully. Please log in again.');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getProfile,
    changePassword,
};
