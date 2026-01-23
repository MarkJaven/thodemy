const { authService } = require("../services/authService");
const { profileService } = require("../services/profileService");
const { sendSuccess } = require("../utils/responses");

/**
 * Handle the authenticated profile request.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<import("express").Response|void>}
 */
const getMe = async (req, res, next) => {
  try {
    const profile = await profileService.getProfileForUser(req.auth);
    const tokenInfo = authService.buildUserFromToken(req.auth);
    return sendSuccess(res, {
      message: "Profile loaded",
      data: { user: tokenInfo, profile },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMe };
