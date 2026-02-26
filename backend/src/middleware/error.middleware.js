// ===== backend/src/middleware/error.middleware.js =====

const logger = require('../config/logger');
const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
// handlePrismaError
//
// Maps Prisma-specific error codes to clean AppError
// instances. Prevents Prisma internals from leaking
// to the client.
//
// Common Prisma error codes:
//   P2002 — Unique constraint violation
//   P2025 — Record not found
//   P2003 — Foreign key constraint violation
//   P2014 — Relation violation
// ─────────────────────────────────────────────
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002': {
            const field = error.meta?.target?.[0] || 'field';
            return AppError.conflict(
                `A record with this ${field} already exists.`,
                'DUPLICATE_ENTRY'
            );
        }
        case 'P2025':
            return AppError.notFound(
                'The requested resource was not found.',
                'RECORD_NOT_FOUND'
            );
        case 'P2003':
            return AppError.badRequest(
                'Operation violates a foreign key constraint.',
                'FOREIGN_KEY_VIOLATION'
            );
        case 'P2014':
            return AppError.badRequest(
                'The operation violates a required relation.',
                'RELATION_VIOLATION'
            );
        default:
            return AppError.internal(
                'A database error occurred.',
                'DATABASE_ERROR'
            );
    }
};

// ─────────────────────────────────────────────
// handleJWTError
//
// Catches raw jsonwebtoken errors that may slip through
// if verifyAccessToken is called outside the middleware.
// ─────────────────────────────────────────────
const handleJWTError = (error) => {
    if (error.name === 'TokenExpiredError') {
        return AppError.unauthorized('Access token has expired.', 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
        return AppError.unauthorized('Invalid access token.', 'TOKEN_INVALID');
    }
    return AppError.unauthorized('Token verification failed.', 'TOKEN_VERIFICATION_FAILED');
};

// ─────────────────────────────────────────────
// sendErrorDev
//
// Development error response — includes full stack
// trace and error details for easy debugging.
// ─────────────────────────────────────────────
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        errorCode: err.errorCode,
        details: err.details,
        stack: err.stack,
        error: err,
    });
};

// ─────────────────────────────────────────────
// sendErrorProd
//
// Production error response — only exposes safe,
// operational error information. Stack traces and
// internal details are never sent to the client.
// ─────────────────────────────────────────────
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        // Safe to expose — we threw this intentionally
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errorCode: err.errorCode || null,
            details: err.details || null,
        });
    } else {
        // Programmer error or unknown — log it, send generic message
        logger.error('UNHANDLED ERROR:', {
            message: err.message,
            stack: err.stack,
        });

        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            errorCode: 'INTERNAL_SERVER_ERROR',
        });
    }
};

// ─────────────────────────────────────────────
// globalErrorHandler
//
// Express 4-argument error middleware.
// Must be registered LAST in app.js after all routes.
//
// Handles:
//   - AppError (operational)
//   - Prisma errors (P20xx codes)
//   - JWT errors (TokenExpiredError, JsonWebTokenError)
//   - Unhandled programmer errors
// ─────────────────────────────────────────────
const globalErrorHandler = (err, req, res, next) => {
    // Set defaults for unknown errors
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log all errors with context
    logger.error(`[${req.method}] ${req.originalUrl} - ${err.statusCode} - ${err.message}`, {
        userId: req.user?.id || 'unauthenticated',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        stack: err.stack,
    });

    // Transform known third-party errors into AppError
    let error = err;

    if (err.code && err.code.startsWith('P2')) {
        error = handlePrismaError(err);
    } else if (
        err.name === 'TokenExpiredError' ||
        err.name === 'JsonWebTokenError' ||
        err.name === 'NotBeforeError'
    ) {
        error = handleJWTError(err);
    } else if (err.type === 'entity.parse.failed') {
        // Malformed JSON body
        error = AppError.badRequest('Invalid JSON in request body.', 'INVALID_JSON');
    } else if (err.code === 'EBADCSRFTOKEN') {
        error = AppError.forbidden('Invalid or missing CSRF token.', 'INVALID_CSRF');
    }

    // Send appropriate error format
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, res);
    } else {
        sendErrorProd(error, res);
    }
};

// ─────────────────────────────────────────────
// notFoundHandler
//
// Catches any request that falls through all routes.
// Register this AFTER all routes, BEFORE globalErrorHandler.
// ─────────────────────────────────────────────
const notFoundHandler = (req, res, next) => {
    next(
        AppError.notFound(
            `Route [${req.method}] ${req.originalUrl} not found.`,
            'ROUTE_NOT_FOUND'
        )
    );
};

module.exports = { globalErrorHandler, notFoundHandler };
