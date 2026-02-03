const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { announceSession } = require("../controllers/sessionController");

const router = express.Router();

router.post("/announce", authLimiter, requireAuth, requireActiveUser, announceSession);

module.exports = router;
