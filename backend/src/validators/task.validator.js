// ===== backend/src/validators/task.validator.js =====

const Joi = require('joi');

// ─────────────────────────────────────────────
// Allowed task statuses — mirrors Prisma enum.
// Defined here to keep validators self-contained
// and avoid importing Prisma client into validators.
// ─────────────────────────────────────────────
const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

// ─────────────────────────────────────────────
// createTaskSchema
// POST /api/v1/tasks
// ─────────────────────────────────────────────
const createTaskSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .trim()
        .required()
        .messages({
            'string.min': 'Task title must be at least 3 characters long.',
            'string.max': 'Task title must not exceed 255 characters.',
            'any.required': 'Task title is required.',
            'string.empty': 'Task title cannot be empty.',
        }),

    description: Joi.string()
        .max(2000)
        .trim()
        .optional()
        .allow('')
        .messages({
            'string.max': 'Description must not exceed 2000 characters.',
        }),

    status: Joi.string()
        .valid(...TASK_STATUSES)
        .default('PENDING')
        .messages({
            'any.only': `Status must be one of: ${TASK_STATUSES.join(', ')}.`,
        }),
});

// ─────────────────────────────────────────────
// updateTaskSchema
// PUT /api/v1/tasks/:id
//
// All fields optional — supports partial updates.
// At least one field must be provided.
// ─────────────────────────────────────────────
const updateTaskSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(255)
        .trim()
        .optional()
        .messages({
            'string.min': 'Task title must be at least 3 characters long.',
            'string.max': 'Task title must not exceed 255 characters.',
            'string.empty': 'Task title cannot be empty.',
        }),

    description: Joi.string()
        .max(2000)
        .trim()
        .optional()
        .allow('')
        .messages({
            'string.max': 'Description must not exceed 2000 characters.',
        }),

    status: Joi.string()
        .valid(...TASK_STATUSES)
        .optional()
        .messages({
            'any.only': `Status must be one of: ${TASK_STATUSES.join(', ')}.`,
        }),
})
    .min(1) // Reject empty update bodies — at least one field required
    .messages({
        'object.min': 'At least one field must be provided for update.',
    });

// ─────────────────────────────────────────────
// taskIdSchema
// Validates :id param for GET/:id, PUT/:id, DELETE/:id
// UUID v4 format validation prevents invalid DB lookups.
// ─────────────────────────────────────────────
const taskIdSchema = Joi.object({
    id: Joi.string()
        .uuid({ version: ['uuidv4'] })
        .required()
        .messages({
            'string.guid': 'Task ID must be a valid UUID.',
            'any.required': 'Task ID is required.',
        }),
});

// ─────────────────────────────────────────────
// listTasksQuerySchema
// GET /api/v1/tasks
// Supports filtering, pagination, and sorting via
// query parameters.
// ─────────────────────────────────────────────
const listTasksQuerySchema = Joi.object({
    // Filtering
    status: Joi.string()
        .valid(...TASK_STATUSES)
        .optional()
        .messages({
            'any.only': `Status filter must be one of: ${TASK_STATUSES.join(', ')}.`,
        }),

    // Pagination
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.min': 'Page must be at least 1.',
            'number.integer': 'Page must be an integer.',
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .messages({
            'number.min': 'Limit must be at least 1.',
            'number.max': 'Limit cannot exceed 100 per page.',
            'number.integer': 'Limit must be an integer.',
        }),

    // Sorting
    sortBy: Joi.string()
        .valid('createdAt', 'updatedAt', 'title', 'status')
        .default('createdAt')
        .messages({
            'any.only': 'sortBy must be one of: createdAt, updatedAt, title, status.',
        }),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
            'any.only': 'sortOrder must be either asc or desc.',
        }),

    // Search
    search: Joi.string()
        .max(100)
        .trim()
        .optional()
        .messages({
            'string.max': 'Search query must not exceed 100 characters.',
        }),
});

module.exports = {
    createTaskSchema,
    updateTaskSchema,
    taskIdSchema,
    listTasksQuerySchema,
    TASK_STATUSES,
};
