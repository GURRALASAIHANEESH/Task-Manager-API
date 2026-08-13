const logger = require('../config/logger');
const AppError = require('../utils/AppError');

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

const handleJWTError = (error) => {
    if (error.name === 'TokenExpiredError') {
        return AppError.unauthorized('Access token has expired.', 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
        return AppError.unauthorized('Invalid access token.', 'TOKEN_INVALID');
    }
    return AppError.unauthorized('Token verification failed.', 'TOKEN_VERIFICATION_FAILED');
};

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

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errorCode: err.errorCode || null,
            details: err.details || null,
        });
    } else {
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

const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    logger.error(`[${req.method}] ${req.originalUrl} - ${err.statusCode} - ${err.message}`, {
        userId: req.user?.id || 'unauthenticated',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        stack: err.stack,
    });

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

const notFoundHandler = (req, res, next) => {
    next(
        AppError.notFound(
            `Route [${req.method}] ${req.originalUrl} not found.`,
            'ROUTE_NOT_FOUND'
        )
    );
};

module.exports = { globalErrorHandler, notFoundHandler };
