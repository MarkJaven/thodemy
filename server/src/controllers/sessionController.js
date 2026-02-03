const { pusherService } = require("../services/pusherService");
const { BadRequestError } = require("../utils/errors");
const { sendSuccess } = require("../utils/responses");

/**
 * Announce a new active session and force logout other devices.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const announceSession = async (req, res, next) => {
  try {
    const deviceId = req.body?.deviceId;
    const deviceInfo = req.body?.deviceInfo || "Unknown device";
    if (!deviceId) {
      throw new BadRequestError("deviceId is required");
    }
    await pusherService.sendForceLogout(req.auth.sub, deviceId, deviceInfo);
    return sendSuccess(res, { message: "force logout broadcasted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = { announceSession };
