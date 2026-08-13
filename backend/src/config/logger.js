const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logDir = path.resolve(process.cwd(), process.env.LOG_FILE_PATH
    ? path.dirname(process.env.LOG_FILE_PATH)
    : 'logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const consoleFormat = format.combine(
    format.colorize({ all: true }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
    })
);

const fileFormat = format.combine(
    format.timestamp(),
    format.errors({ stack: true }), // Include stack traces in file logs
    format.json()
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
        service: 'taskmanager-api',
        environment: process.env.NODE_ENV || 'development',
    },
    transports: [
        new transports.Console({
            format: consoleFormat,
            silent: process.env.NODE_ENV === 'test',
        }),

        new transports.File({
            filename: path.resolve(process.cwd(), process.env.LOG_FILE_PATH || 'logs/app.log'),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),

        new transports.File({
            filename: path.resolve(logDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
            tailable: true,
        }),
    ],


    exceptionHandlers: [
        new transports.File({
            filename: path.resolve(logDir, 'exceptions.log'),
            format: fileFormat,
        }),
    ],
    rejectionHandlers: [
        new transports.File({
            filename: path.resolve(logDir, 'rejections.log'),
            format: fileFormat,
        }),
    ],

    // Don't exit on unhandled exceptions (let our handler decide)
    exitOnError: false,
});

// ─────────────────────────────────────────────
// HTTP request logger stream
// Used by Morgan middleware in app.js
// ─────────────────────────────────────────────
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger;
