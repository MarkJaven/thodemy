const { body } = require("express-validator");

const validateProfileUpdate = [
  body("first_name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("First name must be between 1 and 100 characters."),
  body("last_name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Last name must be between 1 and 100 characters."),
];

module.exports = { validateProfileUpdate };
