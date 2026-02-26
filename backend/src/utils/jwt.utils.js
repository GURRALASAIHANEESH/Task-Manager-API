// ===== backend/src/utils/jwt.utils.js =====

const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

// ─────────────────────────────────────────────
// generateAccessToken
// Signs a short-lived access token (default 15m).
// Payload is intentionally minimal — avoid storing
// sensitive data in JWT (it is base64, not encrypted).
// ─────────────────────────────────────────────
const generateAccessToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'taskmanager-api',
        audience: 'taskmanager-client',
    });
};

// ─────────────────────────────────────────────
// generateRefreshToken
// Signs a long-lived refresh token (default 7d).
// Should be stored in an httpOnly cookie — never
// in localStorage.
// ─────────────────────────────────────────────
const generateRefreshToken = (payload) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'taskmanager-api',
        audience: 'taskmanager-client',
    });
};

// ─────────────────────────────────────────────
// verifyAccessToken
// Verifies and decodes the access token.
// Throws AppError on invalid/expired tokens so the
// error middleware can handle them uniformly.
// ─────────────────────────────────────────────
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET, {
            issuer: 'taskmanager-api',
            audience: 'taskmanager-client',
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw AppError.unauthorized('Access token has expired. Please refresh your session.', 'TOKEN_EXPIRED');
        }
        if (error.name === 'JsonWebTokenError') {
            throw AppError.unauthorized('Invalid access token.', 'TOKEN_INVALID');
        }
        if (error.name === 'NotBeforeError') {
            throw AppError.unauthorized('Token not yet active.', 'TOKEN_NOT_ACTIVE');
        }
        throw AppError.unauthorized('Token verification failed.', 'TOKEN_VERIFICATION_FAILED');
    }
};

// ─────────────────────────────────────────────
// verifyRefreshToken
// ─────────────────────────────────────────────
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
            issuer: 'taskmanager-api',
            audience: 'taskmanager-client',
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw AppError.unauthorized('Refresh token has expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED');
        }
        throw AppError.unauthorized('Invalid refresh token.', 'REFRESH_TOKEN_INVALID');
    }
};

// ─────────────────────────────────────────────
// decodeToken (no verification — for debug only)
// Never use this for authorization decisions.
// ─────────────────────────────────────────────
const decodeToken = (token) => jwt.decode(token);

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
};
