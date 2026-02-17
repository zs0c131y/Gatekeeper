const { body, validationResult } = require('express-validator');

/**
 * Validation rules for login endpoint.
 */
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Validation rules for change-password endpoint.
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must contain an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('New password must contain a special character'),
];

/**
 * Validation rules for creating an API key.
 */
const validateCreateApiKey = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim(),
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .trim(),
  body('scopes')
    .optional()
    .isArray()
    .withMessage('Scopes must be an array'),
  body('scopes.*')
    .optional()
    .isString()
    .withMessage('Each scope must be a string'),
];

/**
 * Middleware to handle validation errors from express-validator.
 * Returns 400 with structured error list if validation fails.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = {
  validateLogin,
  validateChangePassword,
  validateCreateApiKey,
  handleValidationErrors,
};
