const { env } = require("../config/env");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Extract the origin from a URL string.
 * @param {string} url
 * @returns {string|null}
 */
const extractOrigin = (url) => {
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
};

/**
 * Verify that the request origin matches an allowed frontend origin.
 * Uses the Origin header (preferred) or falls back to Referer.
 * Skips safe (read-only) HTTP methods.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const verifyCsrfOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin || extractOrigin(req.headers.referer || "");

  if (!origin) {
    return res.status(403).json({ error: "Forbidden – missing origin" });
  }

  const allowed =
    env.frontendOrigins.includes("*") || env.frontendOrigins.includes(origin);

  if (!allowed) {
    return res.status(403).json({ error: "Forbidden – origin not allowed" });
  }

  return next();
};

module.exports = { verifyCsrfOrigin };
