const { body, param, query } = require("express-validator");

const PRIORITY_VALUES = ["low", "medium", "high"];
const STATUS_VALUES = ["pending", "completed"];

const validateTaskIdParam = [
  param("taskId").isUUID().withMessage("Task id must be a valid UUID."),
];

const validateCreateTask = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title is required and must be 200 characters or fewer."),
  body("description")
    .optional({ nullable: true })
    .isLength({ max: 1000 })
    .withMessage("Description must be 1000 characters or fewer."),
  body("priority")
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage("Priority must be low, medium, or high."),
];

const validateUpdateTask = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be 200 characters or fewer."),
  body("description")
    .optional({ nullable: true })
    .isLength({ max: 1000 })
    .withMessage("Description must be 1000 characters or fewer."),
  body("priority")
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage("Priority must be low, medium, or high."),
  body().custom((value) => {
    if (
      !value ||
      (value.title === undefined &&
        value.description === undefined &&
        value.priority === undefined)
    ) {
      throw new Error("Provide at least one field to update.");
    }
    return true;
  }),
];

const validateTaskStatusQuery = [
  query("status")
    .optional()
    .isIn(STATUS_VALUES)
    .withMessage("Status must be pending or completed."),
];

module.exports = {
  validateTaskIdParam,
  validateCreateTask,
  validateUpdateTask,
  validateTaskStatusQuery,
};
