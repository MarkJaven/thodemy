const express = require("express");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const courseRoutes = require("./courses");
const learningPathRoutes = require("./learningPaths");
const topicRoutes = require("./topics");
const activityRoutes = require("./activities");
const submissionRoutes = require("./submissions");
const healthRoutes = require("./health");
const statsRoutes = require("./stats");
const sessionRoutes = require("./session");
const formRoutes = require("./forms");
const mfaRoutes = require("./mfa");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/api/stats", statsRoutes);
router.use("/api/mfa", mfaRoutes);
router.use("/api/admin", adminRoutes);
router.use("/api/courses", courseRoutes);
router.use("/api/learning-paths", learningPathRoutes);
router.use("/api/topics", topicRoutes);
router.use("/api/activities", activityRoutes);
router.use("/api/submissions", submissionRoutes);
router.use("/api/session", sessionRoutes);
router.use("/api/forms", formRoutes);
router.use("/", authRoutes);

module.exports = router;
