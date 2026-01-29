const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { buildCorsOptions } = require("./config/cors");
const { requestLogger } = require("./middleware/logger");
const { sanitizeRequest } = require("./middleware/sanitize");
const routes = require("./routes");
const { NotFoundError } = require("./utils/errors");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "100kb" }));
app.use(requestLogger);
app.use(sanitizeRequest);
app.use(routes);

/**
 * Handle unmatched routes with a standardized error.
 * @param {import("express").Request} _req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {void}
 */
const handleNotFound = (_req, _res, next) =>
  next(new NotFoundError("Route not found"));

app.use(handleNotFound);
app.use(errorHandler);

module.exports = { app };
