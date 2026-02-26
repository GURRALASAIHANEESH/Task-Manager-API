// ===== backend/src/services/taskService.js =====

const { prisma } = require('../config/database');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

// ─────────────────────────────────────────────
// createTask
//
// Creates a new task assigned to the requesting user.
// ─────────────────────────────────────────────
const createTask = async (userId, { title, description, status }) => {
    const task = await prisma.task.create({
        data: {
            title,
            description: description || null,
            status: status || 'PENDING',
            userId,
        },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: { id: true, email: true },
            },
        },
    });

    logger.info(`Task created: [${task.id}] by user [${userId}]`);

    return task;
};

// ─────────────────────────────────────────────
// getAllTasks
//
// Returns a paginated, filterable, sortable list of tasks.
//
// Role behavior:
//   USER  -> sees only their own tasks (userId filter enforced)
//   ADMIN -> sees all tasks across all users
//
// Supports:
//   - status filter
//   - title/description search (case-insensitive)
//   - pagination (page + limit)
//   - sorting (sortBy + sortOrder)
// ─────────────────────────────────────────────
const getAllTasks = async (requestingUser, { status, page, limit, sortBy, sortOrder, search }) => {
    const isAdmin = requestingUser.role === 'ADMIN';

    // Build dynamic where clause
    const where = {
        // Non-admins are always scoped to their own tasks
        ...(!isAdmin && { userId: requestingUser.id }),

        // Status filter (optional)
        ...(status && { status }),

        // Full-text search on title or description
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const skip = (page - 1) * limit;

    // Run count and data fetch in parallel for performance
    const [total, tasks] = await Promise.all([
        prisma.task.count({ where }),
        prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: { id: true, email: true },
                },
            },
        }),
    ]);

    return {
        tasks,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
        },
    };
};

// ─────────────────────────────────────────────
// getTaskById
//
// Fetches a single task by ID.
// Ownership check is performed here and the result
// is attached to req.resourceOwnerId for the
// authorizeOwnerOrAdmin middleware.
// ─────────────────────────────────────────────
const getTaskById = async (taskId) => {
    const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: { id: true, email: true },
            },
        },
    });

    if (!task) {
        throw AppError.notFound(
            'Task not found.',
            'TASK_NOT_FOUND'
        );
    }

    return task;
};

// ─────────────────────────────────────────────
// updateTask
//
// Partially updates a task.
// Only fields present in the payload are updated
// (Prisma ignores undefined fields automatically).
//
// Ownership must be verified before calling this
// service (handled by authorizeOwnerOrAdmin middleware).
// ─────────────────────────────────────────────
const updateTask = async (taskId, { title, description, status }) => {
    // Build update payload — only include defined fields
    const updateData = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
    };

    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: { id: true, email: true },
            },
        },
    });

    logger.info(`Task updated: [${taskId}]`);

    return updatedTask;
};

// ─────────────────────────────────────────────
// deleteTask
//
// Hard deletes a task by ID.
// Ownership must be verified before calling this
// service (handled by authorizeOwnerOrAdmin middleware).
// ─────────────────────────────────────────────
const deleteTask = async (taskId) => {
    await prisma.task.delete({
        where: { id: taskId },
    });

    logger.info(`Task deleted: [${taskId}]`);
};

// ─────────────────────────────────────────────
// getTaskStats (Admin only)
//
// Returns aggregate statistics across all tasks.
// Useful for admin dashboard metrics.
// ─────────────────────────────────────────────
const getTaskStats = async () => {
    const [total, byStatus, recentTasks] = await Promise.all([
        prisma.task.count(),

        prisma.task.groupBy({
            by: ['status'],
            _count: { status: true },
        }),

        prisma.task.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                user: { select: { email: true } },
            },
        }),
    ]);

    const statusBreakdown = byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
    }, {});

    return {
        total,
        statusBreakdown,
        recentTasks,
    };
};

module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
    getTaskStats,
};
