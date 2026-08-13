const { verifyAccessToken } = require('../utils/jwt.utils');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(
                AppError.unauthorized(
                    'No authentication token provided. Please log in.',
                    'NO_TOKEN'
                )
            );
        }

        const token = authHeader.split(' ')[1];

        if (!token || token.trim() === '') {
            return next(
                AppError.unauthorized('Malformed authorization header.', 'MALFORMED_TOKEN')
            );
        }

        const decoded = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                // Password is security-sensitive and not needed in req.user
                createdAt: true,
            },
        });

        if (!user) {
            return next(
                AppError.unauthorized(
                    'The user associated with this token no longer exists.',
                    'USER_NOT_FOUND'
                )
            );
        }

        req.user = user;
        req.token = token;

        logger.debug(`Authenticated: ${user.email} [${user.role}] -> ${req.method} ${req.originalUrl}`);

        next();
    } catch (error) {
        next(error);
    }
};

const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) return next();

        const decoded = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
        });

        if (user) {
            req.user = user;
            req.token = token;
        }

        next();
    } catch {
        // Silently ignore token errors for optional auth
        next();
    }
};

module.exports = { authenticate, optionalAuthenticate };
