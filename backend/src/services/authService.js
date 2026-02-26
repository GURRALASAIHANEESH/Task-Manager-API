// ===== backend/src/services/authService.js =====

const bcrypt = require('bcrypt');
const { prisma } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// ─────────────────────────────────────────────
// register
//
// Creates a new user account.
// Flow:
//   1. Check email uniqueness
//   2. Hash password with bcrypt
//   3. Create user record
//   4. Return sanitized user + tokens
// ─────────────────────────────────────────────
const register = async ({ email, password }) => {
    // 1. Check if email already exists
    // We do this explicitly rather than relying solely on the
    // DB unique constraint so we can return a clean 409 error.
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw AppError.conflict(
            'An account with this email address already exists.',
            'EMAIL_ALREADY_EXISTS'
        );
    }

    // 2. Hash password
    // saltRounds from env — defaults to 12 (production standard).
    // Each increment doubles the compute time.
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Create user in DB
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role: 'USER', // Role is always USER on self-registration
        },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            // password deliberately excluded
        },
    });

    // 4. Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info(`New user registered: ${user.email} [${user.id}]`);

    return {
        user,
        accessToken,
        refreshToken,
    };
};

// ─────────────────────────────────────────────
// login
//
// Authenticates a user with email + password.
// Flow:
//   1. Find user by email
//   2. Compare password against bcrypt hash
//   3. Return tokens on success
//
// Security note: We use a GENERIC error message for both
// "user not found" and "wrong password" cases to prevent
// user enumeration attacks.
// ─────────────────────────────────────────────
const login = async ({ email, password }) => {
    // 1. Find user — include password for comparison
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            password: true, // Needed for bcrypt.compare only
            role: true,
            createdAt: true,
        },
    });

    // 2. Validate credentials
    // Always run bcrypt.compare even if user is null to prevent
    // timing attacks that could reveal whether an email exists.
    const dummyHash = '$2b$12$invalidhashfortimingnormalizationxxxxxxxxxxxxxxxxxxxxxxx';
    const isPasswordValid = user
        ? await bcrypt.compare(password, user.password)
        : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!user || !isPasswordValid) {
        throw AppError.unauthorized(
            'Invalid email or password.',
            'INVALID_CREDENTIALS'
        );
    }

    // 3. Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Strip password before returning
    const { password: _removed, ...safeUser } = user;

    logger.info(`User logged in: ${user.email} [${user.id}]`);

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};

// ─────────────────────────────────────────────
// refreshAccessToken
//
// Issues a new access token using a valid refresh token.
// In a full implementation, refresh tokens should be
// stored in DB/Redis to support token rotation and
// revocation. See SCALABILITY.md for details.
// ─────────────────────────────────────────────
const refreshAccessToken = async ({ refreshToken }) => {
    // Verify the refresh token — throws AppError on failure
    const decoded = verifyRefreshToken(refreshToken);

    // Confirm user still exists
    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, role: true },
    });

    if (!user) {
        throw AppError.unauthorized(
            'User associated with this token no longer exists.',
            'USER_NOT_FOUND'
        );
    }

    // Issue new access token
    const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    logger.info(`Access token refreshed for user: ${user.email}`);

    return { accessToken };
};

// ─────────────────────────────────────────────
// changePassword
//
// Allows an authenticated user to update their password.
// ─────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
    // Fetch user with password
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
        throw AppError.unauthorized(
            'Current password is incorrect.',
            'INCORRECT_CURRENT_PASSWORD'
        );
    }

    // Prevent reuse of same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw AppError.badRequest(
            'New password must be different from your current password.',
            'SAME_PASSWORD'
        );
    }

    // Hash and save new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    logger.info(`Password changed for user: ${user.email}`);
};

// ─────────────────────────────────────────────
// getProfile
//
// Returns the authenticated user's profile data.
// ─────────────────────────────────────────────
const getProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
                select: { tasks: true }, // Include task count as useful profile metadata
            },
        },
    });

    if (!user) {
        throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    return user;
};

module.exports = {
    register,
    login,
    refreshAccessToken,
    changePassword,
    getProfile,
};
