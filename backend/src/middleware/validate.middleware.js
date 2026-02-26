// ===== backend/src/middleware/validate.middleware.js =====

const AppError = require('../utils/AppError');

// ─────────────────────────────────────────────
// validate
//
// Joi validation middleware factory.
// Accepts a Joi schema and a target location on the
// request object to validate against.
//
// Supported targets: 'body' | 'params' | 'query'
//
// Usage in routes:
//   router.post('/register', validate(registerSchema, 'body'), authController.register)
//   router.get('/tasks/:id', validate(taskIdSchema, 'params'), taskController.getOne)
//
// Joi options used:
//   abortEarly: false  -> collect ALL errors, not just the first
//   stripUnknown: true -> silently remove fields not in schema
//                        (prevents mass assignment / over-posting)
//   convert: true      -> coerce types where safe (string '1' -> number 1)
// ─────────────────────────────────────────────
const validate = (schema, target = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[target], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            // Format Joi's error details into a clean array of field errors
            const details = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/['"]/g, ''), // Remove Joi's quote wrapping
            }));

            return next(
                AppError.unprocessable(
                    'Validation failed. Please check the provided data.',
                    'VALIDATION_ERROR',
                    details
                )
            );
        }

        // Replace req[target] with the validated + sanitized value
        // This ensures controllers only ever work with clean data
        req[target] = value;

        next();
    };
};

// ─────────────────────────────────────────────
// validateMultiple
//
// Validates multiple parts of the request in one call.
// Usage:
//   router.put('/:id',
//     validateMultiple({ params: taskIdSchema, body: updateTaskSchema }),
//     taskController.update
//   )
// ─────────────────────────────────────────────
const validateMultiple = (schemas) => {
    return (req, res, next) => {
        const allErrors = [];

        for (const [target, schema] of Object.entries(schemas)) {
            const { error, value } = schema.validate(req[target], {
                abortEarly: false,
                stripUnknown: true,
                convert: true,
            });

            if (error) {
                const details = error.details.map((detail) => ({
                    field: `${target}.${detail.path.join('.')}`,
                    message: detail.message.replace(/['"]/g, ''),
                }));
                allErrors.push(...details);
            } else {
                req[target] = value;
            }
        }

        if (allErrors.length > 0) {
            return next(
                AppError.unprocessable(
                    'Validation failed. Please check the provided data.',
                    'VALIDATION_ERROR',
                    allErrors
                )
            );
        }

        next();
    };
};

module.exports = { validate, validateMultiple };
