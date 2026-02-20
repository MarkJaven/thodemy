const express = require("express");
const { sessionLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const {
  announceSession,
  deactivateCurrentSession,
  deactivateAllSessions,
  requestDeviceApproval,
  resolveDeviceApproval,
  getDeviceApprovalStatus,
  getPendingDeviceApproval,
} = require("../controllers/sessionController");

const router = express.Router();

router.post("/announce", sessionLimiter, requireAuth, requireActiveUser, announceSession);
router.post("/deactivate/current", sessionLimiter, requireAuth, deactivateCurrentSession);
router.post("/deactivate/all", sessionLimiter, requireAuth, deactivateAllSessions);
router.post("/approval/request", sessionLimiter, requireAuth, requireActiveUser, requestDeviceApproval);
router.post("/approval/resolve", sessionLimiter, requireAuth, requireActiveUser, resolveDeviceApproval);
router.get("/approval/status/:requestId", sessionLimiter, requireAuth, requireActiveUser, getDeviceApprovalStatus);
router.get("/approval/pending", sessionLimiter, requireAuth, requireActiveUser, getPendingDeviceApproval);

module.exports = router;
