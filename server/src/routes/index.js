const express = require("express");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const courseRoutes = require("./courses");
const learningPathRoutes = require("./learningPaths");
const topicRoutes = require("./topics");
const submissionRoutes = require("./submissions");
const healthRoutes = require("./health");
const sessionRoutes = require("./session");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/courses", courseRoutes);
router.use("/api/learning-paths", learningPathRoutes);
router.use("/api/topics", topicRoutes);
router.use("/api/submissions", submissionRoutes);
router.use("/api/session", sessionRoutes);
router.use("/", authRoutes);

module.exports = router;
