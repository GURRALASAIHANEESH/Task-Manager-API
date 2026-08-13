const bcrypt = require('bcrypt');
const { prisma } = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const register = async ({ email, password }) => {
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        throw AppError.conflict(
            'An account with this email address already exists.',
            'EMAIL_ALREADY_EXISTS'
        );
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in DB
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role: 'USER',
        },
        select: {
            id: true,
            email: true,
            role: true,
            // password deliberately excluded
        },
    });

    // Generate tokens
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

const login = async ({ email, password }) => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            password: true,
            role: true,
            createdAt: true,
        },
    });

    // Validate credentials (timing attack prevention: always run bcrypt.compare)
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

    // Generate tokens
    const tokenPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const { password: _removed, ...safeUser } = user;

    logger.info(`User logged in: ${user.email} [${user.id}]`);

    return {
        user: safeUser,
        accessToken,
        refreshToken,
    };
};

const refreshAccessToken = async ({ refreshToken }) => {
    const decoded = verifyRefreshToken(refreshToken);

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

    // Generate new access token
    const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    logger.info(`Access token refreshed for user: ${user.email}`);

    return { accessToken };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw AppError.notFound('User not found.', 'USER_NOT_FOUND');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
        throw AppError.unauthorized(
            'Current password is incorrect.',
            'INCORRECT_CURRENT_PASSWORD'
        );
    }

    // Prevent reusing current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
        throw AppError.badRequest(
            'New password must be different from your current password.',
            'SAME_PASSWORD'
        );
    }

    // Hash and update password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    logger.info(`Password changed for user: ${user.email}`);
};

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
                select: { tasks: true },
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
