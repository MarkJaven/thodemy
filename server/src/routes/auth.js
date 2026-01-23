const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const { validateMe } = require("../validators/authValidator");
const { getMe } = require("../controllers/authController");

const router = express.Router();

router.get("/me", authLimiter, validateMe, validateRequest, requireAuth, getMe);

module.exports = router;
