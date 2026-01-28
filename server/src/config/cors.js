const { env } = require("./env");

/**
 * Validate origins against the allowed frontend list.
 * In development, allow all localhost origins.
 * @param {string|undefined} origin
 * @param {import("cors").CorsOptionsCallback} callback
 * @returns {void}
 */
const validateOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true);
  }
  // Allow all localhost origins in development
  if (env.nodeEnv === "development" && origin.includes("localhost")) {
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
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

module.exports = { buildCorsOptions };
