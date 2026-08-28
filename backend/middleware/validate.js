/**
 * Request Validation Middleware
 * Reusable validation chains using express-validator
 */
const { body, validationResult } = require('express-validator');

// Process validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Auth validations
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidation,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

// Chat validations
const validateChat = [
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message must not exceed 2000 characters'),
  handleValidation,
];

// Drug check validations
const validateDrugCheck = [
  body('drugs').isArray({ min: 2 }).withMessage('At least 2 drugs are required for interaction check'),
  body('drugs.*').trim().notEmpty().withMessage('Drug name cannot be empty'),
  handleValidation,
];

// Medical record validations
const validateMedicalRecord = [
  body('type').isIn(['diagnosis', 'prescription', 'lab_result', 'vaccination', 'allergy', 'surgery'])
    .withMessage('Invalid record type'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  handleValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateChat,
  validateDrugCheck,
  validateMedicalRecord,
  handleValidation,
};
