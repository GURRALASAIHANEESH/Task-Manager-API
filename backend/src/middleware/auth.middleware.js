// ===== backend/src/middleware/auth.middleware.js =====

const { verifyAccessToken } = require('../utils/jwt.utils');
const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// ─────────────────────────────────────────────
// authenticate
//
// Extracts and verifies the JWT from the Authorization
// header (Bearer token). Attaches the full user object
// to req.user so downstream middleware and controllers
// can access it without querying the DB again.
//
// Flow:
//   1. Extract token from header
//   2. Verify signature + expiry
//   3. Fetch user from DB (confirms user still exists
//      and has not been deleted/suspended since token issue)
//   4. Attach user to req.user
// ─────────────────────────────────────────────
const authenticate = async (req, res, next) => {
    try {
        // 1. Check Authorization header presence
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(
                AppError.unauthorized(
                    'No authentication token provided. Please log in.',
                    'NO_TOKEN'
                )
            );
        }

        // 2. Extract raw token
        const token = authHeader.split(' ')[1];

        if (!token || token.trim() === '') {
            return next(
                AppError.unauthorized('Malformed authorization header.', 'MALFORMED_TOKEN')
            );
        }

        // 3. Verify token — throws AppError on failure
        const decoded = verifyAccessToken(token);

        // 4. Confirm user still exists in DB
        // This is critical: a deleted or suspended user with a
        // valid unexpired token should not gain access.
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                // Explicitly exclude password — never attach to req
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

        // 5. Attach user + raw token to request for downstream use
        req.user = user;
        req.token = token;

        logger.debug(`Authenticated: ${user.email} [${user.role}] -> ${req.method} ${req.originalUrl}`);

        next();
    } catch (error) {
        // AppError instances from verifyAccessToken flow here
        next(error);
    }
};

// ─────────────────────────────────────────────
// optionalAuthenticate
//
// Same as authenticate but does NOT reject unauthenticated
// requests. Useful for public routes that behave differently
// when a user is logged in (e.g. public task feeds).
// ─────────────────────────────────────────────
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // No token — continue as guest
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
