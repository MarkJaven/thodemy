/**
 * MFA Service
 * Core logic for multi-factor authentication: code generation, verification, and toggle.
 * Lockout is persisted in profiles.mfa_locked_until so it survives page reloads.
 * @module services/mfaService
 */

const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabase");
const { env } = require("../config/env");
const { emailService } = require("./emailService");
const { DatabaseError } = require("../utils/errors");

const MFA_LOCKOUT_SECONDS = 120; // 2 minutes

/**
 * Hash a code string with SHA-256.
 * @param {string} code
 * @returns {string} hex digest
 */
const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");

/**
 * Get the MFA profile fields for a user.
 * @param {string} userId
 * @returns {Promise<{mfa_enabled: boolean, mfa_locked_until: string|null}>}
 */
const getMfaProfile = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("mfa_enabled, mfa_locked_until")
    .eq("id", userId)
    .single();

  if (error) {
    throw new DatabaseError("Failed to check MFA status", { details: error.message });
  }
  return data;
};

/**
 * Check if MFA is enabled for a user.
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const isMfaEnabled = async (userId) => {
  const profile = await getMfaProfile(userId);
  return profile?.mfa_enabled ?? false;
};

/**
 * Check if the user is currently locked out and return remaining seconds.
 * @param {string} userId
 * @returns {Promise<{locked: boolean, retryAfterSeconds: number}>}
 */
const checkLockout = async (userId) => {
  const profile = await getMfaProfile(userId);
  if (!profile?.mfa_locked_until) return { locked: false, retryAfterSeconds: 0 };

  const lockedUntil = new Date(profile.mfa_locked_until);
  const now = new Date();
  if (now < lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };
  }

  // Lock expired — clear it
  await supabaseAdmin
    .from("profiles")
    .update({ mfa_locked_until: null })
    .eq("id", userId);

  return { locked: false, retryAfterSeconds: 0 };
};

/**
 * Set the lockout timestamp on the user profile.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const setLockout = async (userId) => {
  const lockedUntil = new Date(Date.now() + MFA_LOCKOUT_SECONDS * 1000).toISOString();
  await supabaseAdmin
    .from("profiles")
    .update({ mfa_locked_until: lockedUntil })
    .eq("id", userId);
};

/**
 * Clear the lockout on the user profile.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const clearLockout = async (userId) => {
  await supabaseAdmin
    .from("profiles")
    .update({ mfa_locked_until: null })
    .eq("id", userId);
};

/**
 * Invalidate all unused codes for a user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const invalidatePreviousCodes = async (userId) => {
  await supabaseAdmin
    .from("mfa_codes")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("used", false);
};

/**
 * Generate a 6-digit code, store its hash, and email it.
 * Blocks if user is currently locked out.
 * @param {string} userId
 * @param {string} email
 * @param {string|null} firstName
 * @returns {Promise<{sent: boolean, expiresInSeconds: number}>}
 */
const generateAndSendCode = async (userId, email, firstName) => {
  // Check lockout before sending
  const lockStatus = await checkLockout(userId);
  if (lockStatus.locked) {
    return { sent: false, locked: true, retryAfterSeconds: lockStatus.retryAfterSeconds };
  }

  const code = String(crypto.randomInt(100000, 999999));
  const codeHash = hashCode(code);
  const ttlMs = env.mfaCodeTtlMinutes * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  // Invalidate any previous unused codes
  await invalidatePreviousCodes(userId);

  // Insert the new code
  const { error } = await supabaseAdmin.from("mfa_codes").insert({
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
    max_attempts: env.mfaMaxAttempts,
  });

  if (error) {
    throw new DatabaseError("Failed to store MFA code", { details: error.message });
  }

  // Send the code via email
  await emailService.sendMfaCode({ to: email, code, firstName });

  return { sent: true, expiresInSeconds: env.mfaCodeTtlMinutes * 60 };
};

/**
 * Verify a submitted MFA code.
 * @param {string} userId
 * @param {string} code
 * @returns {Promise<{verified: boolean, locked?: boolean, retryAfterSeconds?: number, reason?: string}>}
 */
const verifyCode = async (userId, code) => {
  // Check server-side lockout first
  const lockStatus = await checkLockout(userId);
  if (lockStatus.locked) {
    return { verified: false, locked: true, retryAfterSeconds: lockStatus.retryAfterSeconds, reason: "Too many attempts. Please try again later." };
  }

  // Find the most recent non-used code for this user
  const { data: record, error } = await supabaseAdmin
    .from("mfa_codes")
    .select("*")
    .eq("user_id", userId)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !record) {
    return { verified: false, reason: "No active code found. Please request a new one." };
  }

  // Check expiry
  if (new Date(record.expires_at) < new Date()) {
    await supabaseAdmin.from("mfa_codes").update({ used: true }).eq("id", record.id);
    return { verified: false, reason: "Code has expired. Please request a new one." };
  }

  // Increment attempts
  const newAttempts = record.attempts + 1;
  await supabaseAdmin
    .from("mfa_codes")
    .update({ attempts: newAttempts })
    .eq("id", record.id);

  // Compare hashes using constant-time comparison
  const submittedHash = hashCode(code);
  const storedHashBuf = Buffer.from(record.code_hash, "hex");
  const submittedHashBuf = Buffer.from(submittedHash, "hex");

  if (
    storedHashBuf.length !== submittedHashBuf.length ||
    !crypto.timingSafeEqual(storedHashBuf, submittedHashBuf)
  ) {
    const remaining = record.max_attempts - newAttempts;

    // 5th wrong attempt — lock the user for 2 minutes
    if (remaining <= 0) {
      await setLockout(userId);
      await supabaseAdmin.from("mfa_codes").update({ used: true }).eq("id", record.id);
      return { verified: false, locked: true, retryAfterSeconds: MFA_LOCKOUT_SECONDS, reason: "Too many attempts. Please try again after 2 minutes." };
    }

    return {
      verified: false,
      reason: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // Correct — mark as used and clear any lockout
  await supabaseAdmin.from("mfa_codes").update({ used: true }).eq("id", record.id);
  await clearLockout(userId);

  return { verified: true };
};

/**
 * Enable MFA for a user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const enableMfa = async (userId) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ mfa_enabled: true })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError("Failed to enable MFA", { details: error.message });
  }
};

/**
 * Disable MFA for a user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const disableMfa = async (userId) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ mfa_enabled: false })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError("Failed to disable MFA", { details: error.message });
  }
};

module.exports = {
  mfaService: { isMfaEnabled, checkLockout, generateAndSendCode, verifyCode, enableMfa, disableMfa },
};
