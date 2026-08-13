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

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

app.set('trust proxy', 1);

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

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
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Total-Count'],
    })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─────────────────────────────────────────────
// Response compression
// Gzip compresses responses > 1kb.
// Significantly reduces bandwidth on list endpoints.
// ─────────────────────────────────────────────
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
    app.use(
        morgan(
            process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
            { stream: logger.stream }
        )
    );
}

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
    skip: (req) => process.env.NODE_ENV === 'test',
});

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

app.use(`/api/${API_VERSION}`, globalLimiter);
app.use(`/api/${API_VERSION}/auth`, authLimiter);
app.use(`/api/${API_VERSION}`, routes);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        name: 'Task Manager API',
        version: API_VERSION,
        docs: `/api/${API_VERSION}/health`,
        timestamp: new Date().toISOString(),
    });
});

app.use(notFoundHandler);
app.use(globalErrorHandler);

const startServer = async () => {
    try {
        // Connect to DB before accepting traffic
        await connectDB();

        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
            logger.info(`API base URL: http://localhost:${PORT}/api/${API_VERSION}`);
        });

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
