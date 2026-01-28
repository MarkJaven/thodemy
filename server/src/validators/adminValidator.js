const { body, param } = require("express-validator");

const validateCreateUser = [
  body("email").isEmail().withMessage("Email must be valid."),
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters."),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters."),
  body("role")
    .isIn(["user", "admin", "superadmin"])
    .withMessage("Role must be user, admin, or superadmin."),
];

const validateUpdateUser = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters."),
  body("password")
    .optional()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters."),
  body("role")
    .optional()
    .isIn(["user", "admin", "superadmin"])
    .withMessage("Role must be user, admin, or superadmin."),
  body().custom((value) => {
    if (!value || (!value.username && !value.password && !value.role)) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const validateUserIdParam = [
  param("userId").isUUID().withMessage("User id must be a valid UUID."),
];

module.exports = { validateCreateUser, validateUpdateUser, validateUserIdParam };
