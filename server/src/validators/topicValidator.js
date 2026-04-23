const { body, param, query } = require("express-validator");

const validateTopicIdParam = [param("topicId").isUUID().withMessage("Invalid topic id.")];

const validateSubmissionIdParam = [
  param("submissionId").isUUID().withMessage("Invalid submission id."),
];

const validateResourceIdParam = [
  param("resourceId").isUUID().withMessage("Invalid resource id."),
];

const validateCreateTopicResource = [
  body("title").optional().isString().isLength({ max: 200 }),
];

const validateUpdateTopicResourceStatus = [
  body("status")
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive."),
];

const MAX_TOPIC_DESCRIPTION_LENGTH = 5000;

const validateCreateTopic = [
  body("title").isString().notEmpty().withMessage("Title is required."),
  body("description")
    .optional()
    .isString()
    .isLength({ max: MAX_TOPIC_DESCRIPTION_LENGTH })
    .withMessage(`Description must be ${MAX_TOPIC_DESCRIPTION_LENGTH} characters or fewer.`),
  body("link_url").optional().isString(),
  body("time_allocated")
    .isNumeric()
    .custom((value) => Number(value) > 0)
    .withMessage("Time allocated must be a positive number."),
  body("time_unit")
    .isIn(["hours", "days"])
    .withMessage("Time unit must be hours or days."),
  body("status").optional().isIn(["active", "inactive"]),
  body("certificate_file_url").optional().isString(),
  body("start_date").optional().isISO8601(),
  body("end_date").optional().isISO8601(),
  body("author_id").optional().isUUID(),
];

const validateUpdateTopic = [
  body("title").optional().isString(),
  body("description")
    .optional()
    .isString()
    .isLength({ max: MAX_TOPIC_DESCRIPTION_LENGTH })
    .withMessage(`Description must be ${MAX_TOPIC_DESCRIPTION_LENGTH} characters or fewer.`),
  body("link_url").optional().isString(),
  body("time_allocated")
    .optional()
    .isNumeric()
    .custom((value) => Number(value) > 0)
    .withMessage("Time allocated must be a positive number."),
  body("time_unit")
    .optional()
    .isIn(["hours", "days"])
    .withMessage("Time unit must be hours or days."),
  body("status").optional().isIn(["active", "inactive"]),
  body("certificate_file_url").optional().isString(),
  body("start_date").optional().isISO8601(),
  body("end_date").optional().isISO8601(),
  body("author_id").optional().isUUID(),
];

const validateSubmissionStatus = [
  body("status")
    .isIn(["pending", "in_progress", "completed", "rejected"])
    .withMessage("Invalid submission status."),
  body("review_notes").optional().isString().isLength({ max: 2000 }),
];

const validateSubmissionQuery = [
  query("status").optional().isString(),
  query("user_id").optional().isUUID(),
  query("topic_id").optional().isUUID(),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be 1 or greater."),
  query("page_size")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Page size must be between 1 and 100."),
];

module.exports = {
  validateTopicIdParam,
  validateSubmissionIdParam,
  validateResourceIdParam,
  validateCreateTopic,
  validateUpdateTopic,
  validateCreateTopicResource,
  validateUpdateTopicResourceStatus,
  validateSubmissionStatus,
  validateSubmissionQuery,
};
