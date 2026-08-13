const taskService = require('../services/taskService');
const { sendOk, sendCreated, sendNoContent } = require('../utils/apiResponse');

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
            result.meta
        );
    } catch (error) {
        next(error);
    }
};

const getTaskById = async (req, res, next) => {
    try {
        const task = await taskService.getTaskById(req.params.id);

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

const updateTask = async (req, res, next) => {
    try {
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

const deleteTask = async (req, res, next) => {
    try {
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
