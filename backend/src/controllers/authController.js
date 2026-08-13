const authService = require('../services/authService');
const { sendOk, sendCreated } = require('../utils/apiResponse');

const register = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.register({ email, password });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/v1/auth/refresh',
        });

        return sendCreated(res, 'Account created successfully.', {
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

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

const refreshToken = async (req, res, next) => {
    try {
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

const getProfile = async (req, res, next) => {
    try {
        const profile = await authService.getProfile(req.user.id);

        return sendOk(res, 'Profile retrieved successfully.', { user: profile });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        await authService.changePassword(req.user.id, { currentPassword, newPassword });

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
