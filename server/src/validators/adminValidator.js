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
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean."),
  body().custom((value) => {
    if (!value || (!value.username && !value.password && !value.role && value.is_active === undefined)) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const validateUpdateUserProfile = [
  body("first_name")
    .optional({ nullable: true })
    .custom((val) => val === null || typeof val === "string")
    .withMessage("first_name must be a string or null.")
    .bail()
    .if((val) => val !== null)
    .trim()
    .isLength({ max: 50 })
    .withMessage("First name must be at most 50 characters."),
  body("last_name")
    .optional({ nullable: true })
    .custom((val) => val === null || typeof val === "string")
    .withMessage("last_name must be a string or null.")
    .bail()
    .if((val) => val !== null)
    .trim()
    .isLength({ max: 50 })
    .withMessage("Last name must be at most 50 characters."),
  body("username")
    .optional({ nullable: true })
    .custom((val) => val === null || typeof val === "string")
    .withMessage("username must be a string or null.")
    .bail()
    .if((val) => val !== null)
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Username must be between 1 and 30 characters."),
  body().custom((value) => {
    if (!value || (value.first_name === undefined && value.last_name === undefined && value.username === undefined)) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const validateUserIdParam = [
  param("userId").isUUID().withMessage("User id must be a valid UUID."),
];

module.exports = { validateCreateUser, validateUpdateUser, validateUpdateUserProfile, validateUserIdParam };
