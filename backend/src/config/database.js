// ===== backend/src/config/database.js =====

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// ─────────────────────────────────────────────
// Prisma Singleton Pattern
// In production, Next.js / Node hot-reload can create
// multiple PrismaClient instances causing connection pool
// exhaustion. This singleton prevents that.
// ─────────────────────────────────────────────

const globalForPrisma = global;

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
        ],
    });

// ─── Log all queries in development ───────────
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Prisma Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

// ─── Log Prisma-level errors ───────────────────
prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});

// ─── Assign to global in non-production ────────
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// ─────────────────────────────────────────────
// connectDB — call once at app startup to verify
// the DB connection is alive before accepting traffic
// ─────────────────────────────────────────────
const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected via Prisma');
    } catch (error) {
        logger.error(`❌ Database connection failed: ${error.message}`);
        process.exit(1); // Hard exit — no point running without a DB
    }
};

// ─────────────────────────────────────────────
// Graceful shutdown hooks
// Ensure Prisma disconnects cleanly on SIGINT / SIGTERM
// (important for Docker / K8s pod termination)
// ─────────────────────────────────────────────
const disconnectDB = async () => {
    await prisma.$disconnect();
    logger.info('🔌 PostgreSQL disconnected (graceful shutdown)');
};

process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});

module.exports = { prisma, connectDB };
