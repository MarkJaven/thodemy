const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { courseController } = require("../controllers/courseController");

const router = express.Router();

router.post("/enroll", authLimiter, requireAuth, courseController.enrollByCode);

module.exports = router;
