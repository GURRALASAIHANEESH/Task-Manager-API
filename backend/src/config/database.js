const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

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


if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Prisma Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}


prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});


if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected via Prisma');
    } catch (error) {
        logger.error(`❌ Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

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
