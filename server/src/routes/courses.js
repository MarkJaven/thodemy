const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { courseController } = require("../controllers/courseController");

const router = express.Router();

router.post("/enroll", authLimiter, requireAuth, requireActiveUser, courseController.enrollByCode);

module.exports = router;
