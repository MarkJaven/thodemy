const express = require("express");
const authRoutes = require("./auth");
const healthRoutes = require("./health");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/", authRoutes);

module.exports = router;
