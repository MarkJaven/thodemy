/**
 * MFA Validators
 * Express-validator rules for MFA endpoints.
 * @module validators/mfaValidator
 */

const { body } = require("express-validator");

const validateVerifyCode = [
  body("code")
    .isString()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Code must be exactly 6 characters")
    .isNumeric()
    .withMessage("Code must contain only digits"),
];

const validateToggleMfa = [
  body("enabled")
    .isBoolean()
    .withMessage("enabled must be a boolean"),
];

module.exports = { validateVerifyCode, validateToggleMfa };
