const { body, validationResult } = require('express-validator');

/**
 * Validation rules for login endpoint.
 */
const validateLogin = [
  body('email')
    .isEmail({ require_tld: false })
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
 * Validation rules for register endpoint.
 */
const validateRegister = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),
  body('email')
    .isEmail({ require_tld: false })
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain a special character'),
  body('role')
    .optional()
    .isIn(['admin', 'viewer'])
    .withMessage('Role must be admin or viewer'),
];

/**
 * Validation rules for profile update endpoint.
 */
const validateUpdateProfile = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];

/**
 * Validation rules for profile preferences update endpoint.
 */
const validateUpdatePreferences = [
  body('emailAlerts')
    .optional()
    .isBoolean()
    .withMessage('emailAlerts must be a boolean')
    .toBoolean(),
  body('liveDashboard')
    .optional()
    .isBoolean()
    .withMessage('liveDashboard must be a boolean')
    .toBoolean(),
  body('compactTables')
    .optional()
    .isBoolean()
    .withMessage('compactTables must be a boolean')
    .toBoolean(),
];

/**
 * Validation rules for avatar upload endpoint.
 */
const validateUpdateAvatar = [
  body('clear')
    .optional()
    .isBoolean()
    .withMessage('clear must be a boolean')
    .toBoolean(),
  body('avatarDataUrl')
    .optional()
    .isString()
    .withMessage('avatarDataUrl must be a string')
    .bail()
    .custom((value) => {
      const ok = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
      if (!ok) {
        throw new Error('avatarDataUrl must be a valid PNG/JPEG/WEBP data URL');
      }
      if (value.length > 200000) {
        throw new Error('avatarDataUrl is too large');
      }
      return true;
    }),
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
  validateRegister,
  validateUpdateProfile,
  validateUpdatePreferences,
  validateUpdateAvatar,
  validateChangePassword,
  validateCreateApiKey,
  handleValidationErrors,
};
