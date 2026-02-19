const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Determine whether a log level should be emitted.
 * @param {"error"|"warn"|"info"|"debug"} level
 * @returns {boolean}
 */
const shouldLog = (level) => {
  const configured = levels[env.logLevel] ?? levels.info;
  return levels[level] <= configured;
};

/**
 * Build a structured log entry.
 * @param {string} level
 * @param {string} message
 * @param {object} context
 * @returns {object}
 */
const buildEntry = (level, message, context) => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  ...context,
});

/**
 * Resolve an absolute log file path, confined to the project directory.
 * @returns {string}
 */
const LOG_BASE_DIR = path.resolve(process.cwd());
const resolveLogPath = () => {
  const resolved = path.resolve(LOG_BASE_DIR, env.logFilePath);
  if (!resolved.startsWith(LOG_BASE_DIR + path.sep) && resolved !== LOG_BASE_DIR) {
    throw new Error(`Log file path escapes base directory: ${env.logFilePath}`);
  }
  return resolved;
};

/**
 * Ensure the log directory exists.
 * @param {string} filePath
 * @returns {void}
 */
const ensureLogDirectory = (filePath) => {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
};

/**
 * Determine the current size of a log file.
 * @param {string} filePath
 * @returns {number}
 */
const getLogSize = (filePath) => {
  try {
    return fs.statSync(filePath).size;
  } catch (error) {
    if (error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }
};

/**
 * Rotate log files when the maximum size is reached.
 * @param {string} filePath
 * @returns {void}
 */
const rotateLogs = (filePath) => {
  const maxFiles = env.logMaxFiles;
  if (maxFiles < 1) {
    return;
  }

  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    const source = `${filePath}.${index}`;
    const target = `${filePath}.${index + 1}`;
    if (fs.existsSync(source)) {
      fs.renameSync(source, target);
    }
  }

  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, `${filePath}.1`);
  }
};

/**
 * Append a log entry to the rotating log file.
 * @param {object} entry
 * @returns {void}
 */
const writeToFile = (entry) => {
  const filePath = resolveLogPath();
  try {
    ensureLogDirectory(filePath);
    if (getLogSize(filePath) >= env.logMaxBytes) {
      rotateLogs(filePath);
    }
    fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, (error) => {
      if (error) {
        console.error(JSON.stringify({ message: "log_write_failed", error: error.message }));
      }
    });
  } catch (error) {
    console.error(JSON.stringify({ message: "log_rotation_failed", error: error.message }));
  }
};

/**
 * Write a log entry to the appropriate stream.
 * @param {string} level
 * @param {object} entry
 * @returns {void}
 */
const write = (level, entry) => {
  const payload = JSON.stringify(entry);
  writeToFile(entry);
  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.log(payload);
};

/**
 * Emit a structured log event.
 * @param {"error"|"warn"|"info"|"debug"} level
 * @param {string} message
 * @param {object} context
 * @returns {void}
 */
const log = (level, message, context = {}) => {
  if (!shouldLog(level)) {
    return;
  }
  write(level, buildEntry(level, message, context));
};

/**
 * Log an informational event.
 * @param {string} message
 * @param {object} context
 * @returns {void}
 */
const info = (message, context) => log("info", message, context);

/**
 * Log a warning event.
 * @param {string} message
 * @param {object} context
 * @returns {void}
 */
const warn = (message, context) => log("warn", message, context);

/**
 * Log an error event.
 * @param {string} message
 * @param {object} context
 * @returns {void}
 */
const error = (message, context) => log("error", message, context);

/**
 * Log a debug event.
 * @param {string} message
 * @param {object} context
 * @returns {void}
 */
const debug = (message, context) => log("debug", message, context);

module.exports = {
  info,
  warn,
  error,
  debug,
};
