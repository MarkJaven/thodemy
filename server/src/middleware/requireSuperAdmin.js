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

  // Check user role
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError) {
    return next(
      new ExternalServiceError("Unable to verify user role", {
        code: roleError.code,
        details: roleError.message,
      })
    );
  }

  if (roleData?.role !== "superadmin") {
    return next(new ForbiddenError("Superadmin access required."));
  }

  // Check if user is active
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .single();

  if (profileError) {
    return next(new ExternalServiceError("Unable to verify account status"));
  }

  if (!profileData || profileData.is_active === false) {
    return next(new ForbiddenError("Account is deactivated. Please contact your trainer."));
  }

  req.userRole = "superadmin";
  return next();
};

module.exports = { requireSuperAdmin };
