const { validationResult } = require("express-validator");
const { ValidationError } = require("../utils/errors");

/**
 * Convert validation errors into a standardized error response.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const validateRequest = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const details = errors.array().map((error) => ({
    field: error.param,
    message: error.msg,
  }));
  return next(new ValidationError("Validation failed", details));
};

module.exports = { validateRequest };
