const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate, validateMultiple } = require('../middleware/validate.middleware');
const {
    createTaskSchema,
    updateTaskSchema,
    taskIdSchema,
    listTasksQuerySchema,
} = require('../validators/task.validator');

router.use(authenticate);

// ─────────────────────────────────────────────
// Admin-only routes
// Must be defined BEFORE /:id routes to prevent
// Express matching 'stats' as a task UUID param.
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/tasks/stats
 * @desc    Get aggregate task statistics (admin dashboard)
 * @access  Private — ADMIN only
 */
router.get(
    '/stats',
    authorize('ADMIN'),
    taskController.getTaskStats
);

// ─────────────────────────────────────────────
// Collection routes
// ─────────────────────────────────────────────

/**
 * @route   POST /api/v1/tasks
 * @desc    Create a new task
 * @access  Private — USER, ADMIN
 */
router.post(
    '/',
    authorize('USER', 'ADMIN'),
    validate(createTaskSchema, 'body'),
    taskController.createTask
);

/**
 * @route   GET /api/v1/tasks
 * @desc    Get all tasks
 *          USER: returns own tasks only
 *          ADMIN: returns all tasks with user info
 * @access  Private — USER, ADMIN
 * @query   status, page, limit, sortBy, sortOrder, search
 */
router.get(
    '/',
    authorize('USER', 'ADMIN'),
    validate(listTasksQuerySchema, 'query'),
    taskController.getAllTasks
);

// ─────────────────────────────────────────────
// Resource routes — operate on single task by ID
// ─────────────────────────────────────────────

/**
 * @route   GET /api/v1/tasks/:id
 * @desc    Get a single task by ID
 *          USER: own task only
 *          ADMIN: any task
 * @access  Private — USER, ADMIN
 */
router.get(
    '/:id',
    authorize('USER', 'ADMIN'),
    validate(taskIdSchema, 'params'),
    taskController.getTaskById
);

/**
 * @route   PUT /api/v1/tasks/:id
 * @desc    Update a task by ID (partial update supported)
 *          USER: own task only
 *          ADMIN: any task
 * @access  Private — USER, ADMIN
 */
router.put(
    '/:id',
    authorize('USER', 'ADMIN'),
    validateMultiple({
        params: taskIdSchema,
        body: updateTaskSchema,
    }),
    taskController.updateTask
);

/**
 * @route   DELETE /api/v1/tasks/:id
 * @desc    Delete a task by ID
 *          USER: own task only
 *          ADMIN: any task
 * @access  Private — USER, ADMIN
 */
router.delete(
    '/:id',
    authorize('USER', 'ADMIN'),
    validate(taskIdSchema, 'params'),
    taskController.deleteTask
);

module.exports = router;
