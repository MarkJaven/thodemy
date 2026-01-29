const rateLimit = require("express-rate-limit");
const { env } = require("../config/env");

const baseConfig = {
  windowMs: env.rateLimitWindowMs,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  keyGenerator: (req) => {
    const scope = req.baseUrl || req.path || "";
    return `${req.ip}:${scope}`;
  },
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
