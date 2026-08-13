const AppError = require('../utils/AppError');

const validate = (schema, target = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[target], {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const details = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/['"]/g, ''),
            }));

            return next(
                AppError.unprocessable(
                    'Validation failed. Please check the provided data.',
                    'VALIDATION_ERROR',
                    details
                )
            );
        }

        req[target] = value;

        next();
    };
};


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
