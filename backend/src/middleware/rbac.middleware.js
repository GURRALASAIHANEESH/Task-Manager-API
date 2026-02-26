// ===== backend/src/middleware/rbac.middleware.js =====

const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// ─────────────────────────────────────────────
// authorize
//
// Role-Based Access Control (RBAC) middleware factory.
// Takes an array of allowed roles and returns a middleware
// function that enforces the restriction.
//
// Usage in routes:
//   router.get('/admin/users', authenticate, authorize('ADMIN'), handler)
//   router.get('/tasks',       authenticate, authorize('USER', 'ADMIN'), handler)
//
// Must always be used AFTER authenticate middleware since
// it depends on req.user being populated.
// ─────────────────────────────────────────────
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // Guard: authenticate must run first
        if (!req.user) {
            return next(
                AppError.unauthorized(
                    'Authentication required before authorization check.',
                    'NOT_AUTHENTICATED'
                )
            );
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            logger.warn(
                `Access denied: User ${req.user.email} with role [${userRole}] attempted ` +
                `to access [${req.method} ${req.originalUrl}] which requires [${allowedRoles.join(', ')}]`
            );

            return next(
                AppError.forbidden(
                    'You do not have sufficient permissions to perform this action.',
                    'INSUFFICIENT_ROLE'
                )
            );
        }

        logger.debug(
            `Authorized: ${req.user.email} [${userRole}] -> ${req.method} ${req.originalUrl}`
        );

        next();
    };
};

// ─────────────────────────────────────────────
// authorizeOwnerOrAdmin
//
// A specialized guard for resource ownership checks.
// Passes if:
//   - The requesting user is an ADMIN (can access anything), OR
//   - The requesting user owns the resource (userId matches)
//
// Usage:
//   router.delete('/tasks/:id', authenticate, authorizeOwnerOrAdmin, handler)
//
// The controller is responsible for setting req.resourceOwnerId
// BEFORE this middleware runs — typically done by a prior
// "fetch resource" step in the controller or a separate
// resource loader middleware.
//
// Example in controller:
//   const task = await taskService.getTaskById(id);
//   req.resourceOwnerId = task.userId;
//   next();
// ─────────────────────────────────────────────
const authorizeOwnerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return next(AppError.unauthorized('Authentication required.', 'NOT_AUTHENTICATED'));
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = req.resourceOwnerId && req.resourceOwnerId === req.user.id;

    if (!isAdmin && !isOwner) {
        logger.warn(
            `Ownership check failed: User ${req.user.id} attempted to access resource ` +
            `owned by ${req.resourceOwnerId} at [${req.method} ${req.originalUrl}]`
        );

        return next(
            AppError.forbidden(
                'You can only access your own resources.',
                'NOT_RESOURCE_OWNER'
            )
        );
    }

    next();
};

module.exports = { authorize, authorizeOwnerOrAdmin };
