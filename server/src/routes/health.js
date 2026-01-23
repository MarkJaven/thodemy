const express = require("express");
const { validateRequest } = require("../middleware/validation");
const { validateNoBody } = require("../validators/authValidator");
const { MESSAGES } = require("../constants/messages");
const { sendSuccess } = require("../utils/responses");

const router = express.Router();

/**
 * Return service health diagnostics.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @returns {import("express").Response}
 */
const getHealth = (_req, res) => {
  const uptimeSeconds = Math.round(process.uptime());
  return sendSuccess(res, {
    message: MESSAGES.HEALTH_OK,
    data: {
      status: "ok",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    },
  });
};

router.get("/", validateNoBody, validateRequest, getHealth);

module.exports = router;
