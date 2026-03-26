/**
 * MFA Controller
 * Handles MFA status checks, code sending, verification, and toggle.
 * @module controllers/mfaController
 */

const { supabaseAdmin } = require("../config/supabase");
const { mfaService } = require("../services/mfaService");
const { sendSuccess, sendError } = require("../utils/responses");
const { DatabaseError } = require("../utils/errors");

/**
 * Check whether MFA is enabled and if the user is locked out.
 * Returns lockout info so the frontend can show the modal on page reload.
 */
const checkMfaStatus = async (req, res, next) => {
  try {
    const userId = req.auth.sub;
    const mfaEnabled = await mfaService.isMfaEnabled(userId);
    const lockStatus = await mfaService.checkLockout(userId);

    return sendSuccess(res, {
      data: {
        mfaEnabled,
        locked: lockStatus.locked,
        retryAfterSeconds: lockStatus.retryAfterSeconds,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Generate and email a new MFA code. Blocks if user is locked out.
 */
const sendMfaCode = async (req, res, next) => {
  try {
    const userId = req.auth.sub;

    // Get user email and name from profile
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (error || !profile?.email) {
      throw new DatabaseError("Could not retrieve user profile for MFA", {
        details: error?.message,
      });
    }

    const result = await mfaService.generateAndSendCode(
      userId,
      profile.email,
      profile.first_name
    );

    // If locked, return 429 instead of success
    if (result.locked) {
      return sendError(res, {
        status: 429,
        message: "Too many attempts. Please try again later.",
        code: "MFA_LOCKED",
        details: { retryAfterSeconds: result.retryAfterSeconds },
      });
    }

    return sendSuccess(res, { data: result });
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify a submitted MFA code.
 */
const verifyMfaCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const result = await mfaService.verifyCode(req.auth.sub, code);

    if (!result.verified) {
      return sendError(res, {
        status: result.locked ? 429 : 400,
        message: result.reason,
        code: result.locked ? "MFA_LOCKED" : "MFA_INVALID",
        details: result.locked ? { retryAfterSeconds: result.retryAfterSeconds } : null,
      });
    }

    return sendSuccess(res, { data: { verified: true } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Enable or disable MFA for the authenticated user.
 */
const toggleMfa = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const userId = req.auth.sub;

    if (enabled) {
      await mfaService.enableMfa(userId);
    } else {
      await mfaService.disableMfa(userId);
    }

    return sendSuccess(res, {
      data: { mfaEnabled: enabled },
      message: enabled ? "MFA has been enabled." : "MFA has been disabled.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { checkMfaStatus, sendMfaCode, verifyMfaCode, toggleMfa };
