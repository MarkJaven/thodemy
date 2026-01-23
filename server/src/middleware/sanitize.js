/**
 * Recursively sanitize input values and keys.
 * @param {any} value
 * @returns {any}
 */
const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return value.replace(/\0/g, "").trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value).reduce((acc, key) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) {
        return acc;
      }
      const safeKey = key.replace(/\0/g, "").trim();
      acc[safeKey] = sanitizeValue(value[key]);
      return acc;
    }, {});
  }
  return value;
};

/**
 * Sanitize request payloads and parameters.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const sanitizeRequest = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

module.exports = { sanitizeRequest };
