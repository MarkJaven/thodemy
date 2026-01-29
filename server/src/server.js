const { env } = require("./config/env");
const logger = require("./utils/logger");
const { app } = require("./app");

/**
 * Log when the server starts listening.
 * @returns {void}
 */
const onServerListening = () => {
  logger.info("server_started", { port: env.port, env: env.nodeEnv });
};

app.listen(env.port, onServerListening);
