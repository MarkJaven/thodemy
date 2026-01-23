const crypto = require("crypto");
const logger = require("../utils/logger");

/**
 * Log every request with timing metadata.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const requestLogger = (req, res, next) => {
  const requestId = crypto.randomUUID();
  const start = process.hrtime.bigint();
  req.id = requestId;

  res.on("finish", buildFinishHandler(req, res, start, requestId));

  next();
};

/**
 * Create a finish handler that logs request completion details.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {bigint} start
 * @param {string} requestId
 * @returns {() => void}
 */
const buildFinishHandler = (req, res, start, requestId) => () => {
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
  logger.info("request", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    durationMs: Number(durationMs.toFixed(2)),
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
};

module.exports = { requestLogger };
