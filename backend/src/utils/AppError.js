

class AppError extends Error {
    /**
     * @param {string} message     - Human-readable error message (safe to send to client)
     * @param {number} statusCode  - HTTP status code (400, 401, 403, 404, 409, 422, 500)
     * @param {string} [errorCode] - Machine-readable error code for frontend handling
     * @param {object} [details]   - Optional field-level validation details
     */
    constructor(message, statusCode, errorCode = null, details = null) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.errorCode = errorCode;
        this.details = details;

        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

AppError.badRequest = (message, errorCode = 'BAD_REQUEST', details = null) =>
    new AppError(message, 400, errorCode, details);

AppError.unauthorized = (message = 'Authentication required', errorCode = 'UNAUTHORIZED') =>
    new AppError(message, 401, errorCode);

AppError.forbidden = (message = 'You do not have permission to perform this action', errorCode = 'FORBIDDEN') =>
    new AppError(message, 403, errorCode);

AppError.notFound = (message = 'Resource not found', errorCode = 'NOT_FOUND') =>
    new AppError(message, 404, errorCode);

AppError.conflict = (message, errorCode = 'CONFLICT') =>
    new AppError(message, 409, errorCode);

AppError.unprocessable = (message, errorCode = 'VALIDATION_ERROR', details = null) =>
    new AppError(message, 422, errorCode, details);

AppError.internal = (message = 'Internal server error', errorCode = 'INTERNAL_ERROR') =>
    new AppError(message, 500, errorCode);

module.exports = AppError;
