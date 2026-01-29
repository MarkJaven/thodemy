const { supabaseAdmin } = require("../config/supabase");
const { AuthError, ForbiddenError, ExternalServiceError } = require("../utils/errors");

/**
 * Ensure the current user is an admin.
 * @param {import("express").Request} req
 * @param {import("express").Response} _res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
const requireAdmin = async (req, _res, next) => {
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

  if (!["admin", "superadmin"].includes(data?.role)) {
    return next(new ForbiddenError("Admin access required."));
  }

  req.userRole = data?.role;
  return next();
};

module.exports = { requireAdmin };
