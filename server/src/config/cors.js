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
  // Allow all local origins in development (localhost, 127.0.0.1, LAN IPs)
  if (env.nodeEnv === "development") {
    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      /^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(origin)
    ) {
      return callback(null, true);
    }
  }
  if (env.frontendOrigins.includes("*")) {
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
  exposedHeaders: ["Content-Disposition"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

module.exports = { buildCorsOptions };
