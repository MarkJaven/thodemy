const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { learningPathController } = require("../controllers/learningPathController");

const router = express.Router();

router.post("/enroll", authLimiter, requireAuth, learningPathController.enrollByCode);

module.exports = router;
