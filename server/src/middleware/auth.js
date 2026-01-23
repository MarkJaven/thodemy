const { authService } = require("../services/authService");
const { AuthError } = require("../utils/errors");

/**
 * Require a valid Supabase JWT and attach payload to the request.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new AuthError("Missing bearer token");
    }

    const payload = await authService.verifyToken(token);
    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireAuth };
