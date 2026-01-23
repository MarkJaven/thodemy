const dotenv = require("dotenv");

dotenv.config();

/**
 * Parse a comma-delimited list into a trimmed array.
 * @param {string} value
 * @returns {string[]}
 */
const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Parse a numeric environment variable with validation.
 * @param {string|number|undefined|null} value
 * @param {number} fallback
 * @param {string} name
 * @returns {number}
 */
const parseNumber = (value, fallback, name) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name} value.`);
  }
  return parsed;
};

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FRONTEND_ORIGIN"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

/**
 * Normalized and validated environment configuration.
 * @type {{
 *  nodeEnv: string,
 *  port: number,
 *  supabaseUrl: string,
 *  supabaseServiceRoleKey: string,
 *  supabaseJwtAudience: string,
 *  frontendOrigins: string[],
 *  logLevel: string,
 *  logFilePath: string,
 *  logMaxBytes: number,
 *  logMaxFiles: number,
 *  rateLimitWindowMs: number,
 *  rateLimitMax: number,
 *  authRateLimitMax: number
 * }}
 */
const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseNumber(process.env.PORT, 5000, "PORT"),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE || "authenticated",
  frontendOrigins: parseList(process.env.FRONTEND_ORIGIN),
  logLevel: process.env.LOG_LEVEL || "info",
  logFilePath: process.env.LOG_FILE_PATH || "logs/app.log",
  logMaxBytes: parseNumber(process.env.LOG_MAX_BYTES, 5 * 1024 * 1024, "LOG_MAX_BYTES"),
  logMaxFiles: parseNumber(process.env.LOG_MAX_FILES, 5, "LOG_MAX_FILES"),
  rateLimitWindowMs: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
    "RATE_LIMIT_WINDOW_MS"
  ),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 200, "RATE_LIMIT_MAX"),
  authRateLimitMax: parseNumber(
    process.env.RATE_LIMIT_AUTH_MAX,
    20,
    "RATE_LIMIT_AUTH_MAX"
  ),
};

if (env.frontendOrigins.length === 0) {
  throw new Error("FRONTEND_ORIGIN must include at least one allowed origin.");
}

module.exports = { env };
