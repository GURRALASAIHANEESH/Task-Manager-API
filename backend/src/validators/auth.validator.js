// ===== backend/src/validators/auth.validator.js =====

const Joi = require('joi');

// ─────────────────────────────────────────────
// Reusable field definitions
// Centralizing these avoids duplication across
// schemas and ensures consistent rules everywhere.
// ─────────────────────────────────────────────

const emailField = Joi.string()
    .email({ tlds: { allow: false } }) // Disable TLD validation — works in all environments
    .max(255)
    .lowercase()                        // Normalize to lowercase before saving
    .trim()
    .required()
    .messages({
        'string.email': 'Please provide a valid email address.',
        'string.max': 'Email must not exceed 255 characters.',
        'any.required': 'Email is required.',
        'string.empty': 'Email cannot be empty.',
    });

const passwordField = Joi.string()
    .min(8)
    .max(128)
    .pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?])/
    )
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.max': 'Password must not exceed 128 characters.',
        'string.pattern.base':
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        'any.required': 'Password is required.',
        'string.empty': 'Password cannot be empty.',
    });

// ─────────────────────────────────────────────
// registerSchema
// POST /api/v1/auth/register
// ─────────────────────────────────────────────
const registerSchema = Joi.object({
    email: emailField,

    password: passwordField,

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match.',
            'any.required': 'Please confirm your password.',
            'string.empty': 'Confirm password cannot be empty.',
        }),

    // Role assignment via API is restricted —
    // only ADMIN can promote users via a separate admin endpoint.
    // This field is stripped by Joi's stripUnknown if included.
});

// ─────────────────────────────────────────────
// loginSchema
// POST /api/v1/auth/login
// ─────────────────────────────────────────────
const loginSchema = Joi.object({
    email: emailField,

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required.',
            'string.empty': 'Password cannot be empty.',
        }),
    // Note: No complex rules on login password — we don't want
    // to leak that a password is "wrong format" vs "wrong password".
    // Always return a generic message on login failure.
});

// ─────────────────────────────────────────────
// refreshTokenSchema
// POST /api/v1/auth/refresh
// ─────────────────────────────────────────────
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token is required.',
            'string.empty': 'Refresh token cannot be empty.',
        }),
});

// ─────────────────────────────────────────────
// changePasswordSchema
// POST /api/v1/auth/change-password
// ─────────────────────────────────────────────
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
        .required()
        .messages({
            'any.required': 'Current password is required.',
            'string.empty': 'Current password cannot be empty.',
        }),

    newPassword: passwordField,

    confirmNewPassword: Joi.string()
        .valid(Joi.ref('newPassword'))
        .required()
        .messages({
            'any.only': 'New passwords do not match.',
            'any.required': 'Please confirm your new password.',
        }),
});

module.exports = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    changePasswordSchema,
};
