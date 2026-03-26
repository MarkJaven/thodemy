/**
 * MFA Routes
 * Endpoints for multi-factor authentication management.
 * @module routes/mfa
 */

const express = require("express");
const { mfaSendLimiter, mfaVerifyLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { validateRequest } = require("../middleware/validation");
const { validateVerifyCode, validateToggleMfa } = require("../validators/mfaValidator");
const {
  checkMfaStatus,
  sendMfaCode,
  verifyMfaCode,
  toggleMfa,
} = require("../controllers/mfaController");

const router = express.Router();

router.get("/status", requireAuth, requireActiveUser, checkMfaStatus);
router.post("/send-code", mfaSendLimiter, requireAuth, requireActiveUser, sendMfaCode);
router.post(
  "/verify-code",
  mfaVerifyLimiter,
  requireAuth,
  requireActiveUser,
  validateVerifyCode,
  validateRequest,
  verifyMfaCode
);
router.post(
  "/toggle",
  requireAuth,
  requireActiveUser,
  validateToggleMfa,
  validateRequest,
  toggleMfa
);

module.exports = router;
