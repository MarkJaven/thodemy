const { supabaseAdmin } = require("../config/supabase");
const { ForbiddenError, ExternalServiceError } = require("../utils/errors");

/**
 * Require the authenticated user to have an active account.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const requireActiveUser = async (req, _res, next) => {
  try {
    const userId = req.auth.sub;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", userId)
      .single();

    if (error) {
      throw new AuthError("Unable to verify account status");
    }

    if (!data || data.is_active === false) {
      throw new ForbiddenError("Account is deactivated. Please contact your trainer.");
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { requireActiveUser };