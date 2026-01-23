const { sendSuccess } = require("../utils/responses");

/**
 * Placeholder profile handler for future expansion.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 * @returns {import("express").Response}
 */
const getProfile = (_req, res) =>
  sendSuccess(res, {
    message: "Profile endpoint not implemented",
    data: null,
  });

module.exports = { getProfile };
