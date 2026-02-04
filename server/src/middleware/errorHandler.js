const {
  AppError,
  RateLimitError,
  ForbiddenError,
  BadRequestError,
} = require("../utils/errors");
const { sendError } = require("../utils/responses");
const logger = require("../utils/logger");
const { env } = require("../config/env");

/**
 * Centralized error handling middleware.
 * @param {Error} err
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 * @returns {import("express").Response}
 */
const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (err && err.type === "rate_limit") {
    error = new RateLimitError(err.message);
  }
  if (err && err.message === "Not allowed by CORS") {
    error = new ForbiddenError("CORS origin denied");
  }
  if (err && err.type === "entity.too.large") {
    error = new BadRequestError("Request body too large.");
  }
  if (err && err.type === "entity.parse.failed") {
    error = new BadRequestError("Invalid JSON payload");
  }

  const isOperational = error instanceof AppError;
  const status = isOperational ? error.statusCode : 500;
  const payload = {
    status,
    message: isOperational ? error.message : "Unexpected server error",
    code: isOperational ? error.code : "INTERNAL_ERROR",
    details: isOperational ? error.details : null,
  };

  logger.error("request_error", {
    requestId: req.id,
    path: req.originalUrl,
    method: req.method,
    status,
    error: {
      message: error.message,
      code: error.code || "UNKNOWN",
      stack: env.nodeEnv === "development" ? error.stack : undefined,
    },
  });

  return sendError(res, payload);
};

module.exports = { errorHandler };
