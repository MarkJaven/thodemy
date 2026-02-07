const { body, param } = require("express-validator");

const MAX_DESCRIPTION_LENGTH = 2000;

const validateActivityIdParam = [
  param("activityId").isUUID().withMessage("Invalid activity id."),
];

const validateActivitySubmission = [
  body("title").isString().notEmpty().withMessage("Title is required."),
  body("activity_id").optional().isUUID().withMessage("Invalid activity id."),
  body("description")
    .optional()
    .isString()
    .isLength({ max: MAX_DESCRIPTION_LENGTH })
    .withMessage(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`),
  body("github_url")
    .optional()
    .isURL({ require_protocol: false })
    .withMessage("GitHub link must be a valid URL."),
];

module.exports = {
  validateActivityIdParam,
  validateActivitySubmission,
};
