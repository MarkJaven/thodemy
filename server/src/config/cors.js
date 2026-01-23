const { env } = require("./env");

/**
 * Validate origins against the allowed frontend list.
 * @param {string|undefined} origin
 * @param {import("cors").CorsOptionsCallback} callback
 * @returns {void}
 */
const validateOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }
  if (env.frontendOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Not allowed by CORS"));
};

/**
 * Build CORS options with strict origin validation.
 * @returns {import("cors").CorsOptions}
 */
const buildCorsOptions = () => ({
  origin: validateOrigin,
  credentials: true,
});

module.exports = { buildCorsOptions };
