const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

const baseConfig = {
  windowMs: env.rateLimitWindowMs,
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Rate limiter for general traffic.
 * @returns {import("express").RequestHandler}
 */
const generalLimiter = rateLimit({
  ...baseConfig,
  limit: env.rateLimitMax,
});

/**
 * Rate limiter for authentication endpoints.
 * @returns {import("express").RequestHandler}
 */
const authLimiter = rateLimit({
  ...baseConfig,
  limit: env.authRateLimitMax,
});

module.exports = { generalLimiter, authLimiter };
