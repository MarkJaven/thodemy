const express = require("express");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const courseRoutes = require("./courses");
const learningPathRoutes = require("./learningPaths");
const healthRoutes = require("./health");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/courses", courseRoutes);
router.use("/api/learning-paths", learningPathRoutes);
router.use("/", authRoutes);

module.exports = router;
