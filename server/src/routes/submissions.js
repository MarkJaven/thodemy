const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { validateRequest } = require("../middleware/validation");
const { submissionController } = require("../controllers/submissionController");
const {
  validateSubmissionIdParam,
  validateSubmissionStatus,
  validateSubmissionQuery,
} = require("../validators/topicValidator");

const router = express.Router();

router.get(
  "/",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateSubmissionQuery,
  validateRequest,
  submissionController.listSubmissions
);

router.patch(
  "/:submissionId/status",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateSubmissionIdParam,
  validateSubmissionStatus,
  validateRequest,
  submissionController.updateSubmissionStatus
);

router.get(
  "/:submissionId/file",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateSubmissionIdParam,
  validateRequest,
  submissionController.getSubmissionFile
);

module.exports = router;
