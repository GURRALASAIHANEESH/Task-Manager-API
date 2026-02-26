// ===== backend/src/controllers/taskController.js =====

const taskService = require('../services/taskService');
const { sendOk, sendCreated, sendNoContent } = require('../utils/apiResponse');

// ─────────────────────────────────────────────
// createTask
// POST /api/v1/tasks
// Access: USER, ADMIN
// ─────────────────────────────────────────────
const createTask = async (req, res, next) => {
    try {
        const { title, description, status } = req.body;

        const task = await taskService.createTask(req.user.id, {
            title,
            description,
            status,
        });

        return sendCreated(res, 'Task created successfully.', { task });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// getAllTasks
// GET /api/v1/tasks
// Access: USER (own tasks), ADMIN (all tasks)
//
// Supports query params:
//   ?status=PENDING
//   ?page=1&limit=10
//   ?sortBy=createdAt&sortOrder=desc
//   ?search=keyword
// ─────────────────────────────────────────────
const getAllTasks = async (req, res, next) => {
    try {
        const { status, page, limit, sortBy, sortOrder, search } = req.query;

        const result = await taskService.getAllTasks(req.user, {
            status,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 10,
            sortBy: sortBy || 'createdAt',
            sortOrder: sortOrder || 'desc',
            search,
        });

        return sendOk(
            res,
            'Tasks retrieved successfully.',
            { tasks: result.tasks },
            result.meta  // Pagination metadata in response envelope
        );
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// getTaskById
// GET /api/v1/tasks/:id
// Access: USER (own task), ADMIN (any task)
//
// Two-step pattern:
//   1. Fetch task (throws 404 if not found)
//   2. Set req.resourceOwnerId for ownership middleware
//   3. authorizeOwnerOrAdmin runs after this in the route
//
// NOTE: The ownership check middleware (authorizeOwnerOrAdmin)
// is placed AFTER this controller in the route definition
// by using a route-level pre-fetch approach. See routes file.
// Here we attach resourceOwnerId directly in the handler
// for simplicity.
// ─────────────────────────────────────────────
const getTaskById = async (req, res, next) => {
    try {
        const task = await taskService.getTaskById(req.params.id);

        // Ownership check — USER can only read their own tasks
        if (req.user.role !== 'ADMIN' && task.userId !== req.user.id) {
            const AppError = require('../utils/AppError');
            return next(
                AppError.forbidden(
                    'You do not have permission to access this task.',
                    'NOT_RESOURCE_OWNER'
                )
            );
        }

        return sendOk(res, 'Task retrieved successfully.', { task });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// updateTask
// PUT /api/v1/tasks/:id
// Access: USER (own task), ADMIN (any task)
// ─────────────────────────────────────────────
const updateTask = async (req, res, next) => {
    try {
        // Fetch task first to perform ownership check
        const existingTask = await taskService.getTaskById(req.params.id);

        if (req.user.role !== 'ADMIN' && existingTask.userId !== req.user.id) {
            const AppError = require('../utils/AppError');
            return next(
                AppError.forbidden(
                    'You do not have permission to update this task.',
                    'NOT_RESOURCE_OWNER'
                )
            );
        }

        const { title, description, status } = req.body;

        const updatedTask = await taskService.updateTask(req.params.id, {
            title,
            description,
            status,
        });

        return sendOk(res, 'Task updated successfully.', { task: updatedTask });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// deleteTask
// DELETE /api/v1/tasks/:id
// Access: USER (own task), ADMIN (any task)
// ─────────────────────────────────────────────
const deleteTask = async (req, res, next) => {
    try {
        // Fetch task first to perform ownership check
        const existingTask = await taskService.getTaskById(req.params.id);

        if (req.user.role !== 'ADMIN' && existingTask.userId !== req.user.id) {
            const AppError = require('../utils/AppError');
            return next(
                AppError.forbidden(
                    'You do not have permission to delete this task.',
                    'NOT_RESOURCE_OWNER'
                )
            );
        }

        await taskService.deleteTask(req.params.id);

        return sendNoContent(res);
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────
// getTaskStats
// GET /api/v1/tasks/stats
// Access: ADMIN only
// ─────────────────────────────────────────────
const getTaskStats = async (req, res, next) => {
    try {
        const stats = await taskService.getTaskStats();

        return sendOk(res, 'Task statistics retrieved successfully.', { stats });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask,
    getTaskStats,
};
