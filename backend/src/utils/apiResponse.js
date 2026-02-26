// ===== backend/src/utils/apiResponse.js =====

// ─────────────────────────────────────────────
// apiResponse — Standardized HTTP response helpers
//
// Enforces a consistent response envelope across all
// endpoints so the frontend always gets a predictable shape:
//
// Success:
// {
//   "success": true,
//   "message": "...",
//   "data": { ... },
//   "meta": { ... }      <- optional pagination/context
// }
//
// Error (handled by error.middleware.js):
// {
//   "success": false,
//   "message": "...",
//   "errorCode": "...",
//   "details": [ ... ]   <- optional validation field errors
// }
// ─────────────────────────────────────────────

/**
 * Send a successful response
 *
 * @param {object} res          - Express response object
 * @param {number} statusCode   - HTTP status code (200, 201, etc.)
 * @param {string} message      - Human-readable success message
 * @param {*}      [data]       - Payload to return to client
 * @param {object} [meta]       - Optional metadata (pagination, counts, etc.)
 */
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
    const response = {
        success: true,
        message,
    };

    if (data !== null && data !== undefined) {
        response.data = data;
    }

    if (meta !== null && meta !== undefined) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send an error response
 * NOTE: Prefer using AppError + the centralized error middleware.
 * Use this only when you need to send an error without throwing.
 *
 * @param {object} res          - Express response object
 * @param {number} statusCode   - HTTP status code
 * @param {string} message      - Error message
 * @param {string} [errorCode]  - Machine-readable error code
 * @param {*}      [details]    - Field-level validation errors
 */
const sendError = (res, statusCode, message, errorCode = null, details = null) => {
    const response = {
        success: false,
        message,
    };

    if (errorCode) {
        response.errorCode = errorCode;
    }

    if (details) {
        response.details = details;
    }

    return res.status(statusCode).json(response);
};

// ─────────────────────────────────────────────
// Shorthand helpers for the most common responses
// ─────────────────────────────────────────────

const sendCreated = (res, message, data = null) =>
    sendSuccess(res, 201, message, data);

const sendOk = (res, message, data = null, meta = null) =>
    sendSuccess(res, 200, message, data, meta);

const sendNoContent = (res) =>
    res.status(204).send();

module.exports = {
    sendSuccess,
    sendError,
    sendCreated,
    sendOk,
    sendNoContent,
};
