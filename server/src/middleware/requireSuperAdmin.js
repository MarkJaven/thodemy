const { supabaseAdmin } = require("../config/supabase");
const { AuthError, ForbiddenError, ExternalServiceError } = require("../utils/errors");

/**
 * Ensure the current user is a superadmin.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const requireSuperAdmin = async (req, _res, next) => {
  const userId = req.auth?.sub;
  if (!userId) {
    return next(new AuthError("Unauthorized"));
  }

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return next(
      new ExternalServiceError("Unable to verify user role", {
        code: error.code,
        details: error.message,
      })
    );
  }

  if (data?.role !== "superadmin") {
    return next(new ForbiddenError("Superadmin access required."));
  }

  return next();
};

module.exports = { requireSuperAdmin };
