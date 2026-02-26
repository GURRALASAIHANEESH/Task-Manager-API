// ===== backend/app.js =====

'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const logger = require('./src/config/logger');
const { connectDB } = require('./src/config/database');
const routes = require('./src/routes/index');
const { globalErrorHandler, notFoundHandler } = require('./src/middleware/error.middleware');

// ─────────────────────────────────────────────
// Validate critical environment variables
// Fail fast at startup rather than at runtime.
// ─────────────────────────────────────────────
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BCRYPT_SALT_ROUNDS',
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

// ─────────────────────────────────────────────
// App initialization
// ─────────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// ─────────────────────────────────────────────
// Trust proxy
// Required when running behind a reverse proxy
// (Nginx, AWS ALB, etc.) so req.ip returns the
// real client IP instead of the proxy IP.
// ─────────────────────────────────────────────
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// Security middleware
// helmet sets secure HTTP headers:
//   - X-Content-Type-Options: nosniff
//   - X-Frame-Options: DENY
//   - Strict-Transport-Security (HSTS)
//   - Content-Security-Policy
//   - X-XSS-Protection
// ─────────────────────────────────────────────
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─────────────────────────────────────────────
// CORS configuration
// Reads allowed origins from env — supports
// multiple origins (comma-separated).
// ─────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            logger.warn(`CORS blocked request from origin: ${origin}`);
            return callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
        },
        credentials: true,         // Allow cookies (refresh token httpOnly cookie)
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count'],
    })
);

// ─────────────────────────────────────────────
// Request parsing
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));        // Limit body size — prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());                          // Parse httpOnly cookies for refresh token

// ─────────────────────────────────────────────
// Response compression
// Gzip compresses responses > 1kb.
// Significantly reduces bandwidth on list endpoints.
// ─────────────────────────────────────────────
app.use(compression());

// ─────────────────────────────────────────────
// HTTP request logging via Morgan + Winston
// Uses the stream defined in logger.js
// ─────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.use(
        morgan(
            process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
            { stream: logger.stream }
        )
    );
}

// ─────────────────────────────────────────────
// Global rate limiter
// Applied to all /api routes.
// Prevents brute-force and DDoS attacks.
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    standardHeaders: true,   // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    skip: (req) => process.env.NODE_ENV === 'test', // Skip during testing
});

// ─────────────────────────────────────────────
// Stricter rate limiter for auth endpoints
// Limits login/register attempts to prevent
// brute-force credential attacks.
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,                    // 20 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    skip: (req) => process.env.NODE_ENV === 'test',
});

// ─────────────────────────────────────────────
// Route mounting
// ─────────────────────────────────────────────
app.use(`/api/${API_VERSION}`, globalLimiter);
app.use(`/api/${API_VERSION}/auth`, authLimiter);
app.use(`/api/${API_VERSION}`, routes);

// ─────────────────────────────────────────────
// Root endpoint — API metadata
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'Task Manager API',
        version: API_VERSION,
        docs: `/api/${API_VERSION}/health`,
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────
// 404 handler — must come after all routes
// ─────────────────────────────────────────────
app.use(notFoundHandler);

// ─────────────────────────────────────────────
// Global error handler — must be last middleware
// 4-argument signature is required by Express
// ─────────────────────────────────────────────
app.use(globalErrorHandler);

// ─────────────────────────────────────────────
// Server startup
// ─────────────────────────────────────────────
const startServer = async () => {
    try {
        // Connect to DB before accepting traffic
        await connectDB();

        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
            logger.info(`API base URL: http://localhost:${PORT}/api/${API_VERSION}`);
        });

        // ── Graceful shutdown ──────────────────────
        // On SIGTERM (Docker stop / K8s pod eviction):
        //   1. Stop accepting new connections
        //   2. Let in-flight requests complete (30s timeout)
        //   3. Close DB connections
        //   4. Exit
        const gracefulShutdown = (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                logger.info('HTTP server closed. No longer accepting connections.');
                process.exit(0);
            });

            // Force exit after 30 seconds if shutdown hangs
            setTimeout(() => {
                logger.error('Graceful shutdown timed out after 30s. Forcing exit.');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // ── Unhandled rejection safety net ────────
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection:', { reason, promise });
            // Do NOT crash here in production — log and monitor instead
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
            // Uncaught exceptions leave the process in undefined state — exit safely
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        return server;
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

module.exports = app; // Export for testing
