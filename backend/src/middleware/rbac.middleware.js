const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
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
