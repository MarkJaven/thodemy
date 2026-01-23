/**
 * Sanitize response payloads to avoid leaking non-serializable data.
 * @param {any} value
 * @returns {any}
 */
const sanitizePayload = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayload(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      if (typeof value[key] !== "undefined") {
        acc[key] = sanitizePayload(value[key]);
      }
      return acc;
    }, {});
  }
  return value;
};

/**
 * Send a standardized success response.
 * @param {import("express").Response} res
 * @param {{status?: number, message?: string, data?: any}} payload
 * @returns {import("express").Response}
 */
const sendSuccess = (res, { status = 200, message, data }) =>
  res.status(status).json(
    sanitizePayload({
      status: "success",
      message,
      data,
    })
  );

/**
 * Send a standardized error response.
 * @param {import("express").Response} res
 * @param {{status?: number, message?: string, code?: string, details?: any}} payload
 * @returns {import("express").Response}
 */
const sendError = (res, { status = 500, message, code, details }) =>
  res.status(status).json(
    sanitizePayload({
      status: "error",
      message,
      code,
      details,
    })
  );

module.exports = { sendSuccess, sendError };
