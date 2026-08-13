const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    changePasswordSchema,
} = require('../validators/auth.validator');

// Public routes

router.post(
    '/register',
    validate(registerSchema, 'body'),
    authController.register
);


router.post(
    '/login',
    validate(loginSchema, 'body'),
    authController.login
);


router.post(
    '/refresh',
    authController.refreshToken
);

// Protected routes

router.post(
    '/logout',
    authenticate,
    authController.logout
);


router.get(
    '/me',
    authenticate,
    authController.getProfile
);


router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema, 'body'),
    authController.changePassword
);

module.exports = router;
