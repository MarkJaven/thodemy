const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { validateRequest } = require("../middleware/validation");
const { uploadTopicSubmission } = require("../middleware/upload");
const { topicController } = require("../controllers/topicController");
const { submissionController } = require("../controllers/submissionController");
const {
  validateCreateTopic,
  validateTopicIdParam,
  validateUpdateTopic,
  validateSubmissionQuery,
} = require("../validators/topicValidator");

const router = express.Router();

router.get("/", generalLimiter, requireAuth, requireAdmin, topicController.listTopics);

router.post(
  "/",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateCreateTopic,
  validateRequest,
  topicController.createTopic
);

router.patch(
  "/:topicId",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateTopicIdParam,
  validateUpdateTopic,
  validateRequest,
  topicController.updateTopic
);

router.delete(
  "/:topicId",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateTopicIdParam,
  validateRequest,
  topicController.deleteTopic
);

router.post(
  "/:topicId/submissions",
  generalLimiter,
  requireAuth,
  validateTopicIdParam,
  validateRequest,
  uploadTopicSubmission,
  submissionController.createTopicSubmission
);

router.get(
  "/:topicId/submissions",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTopicIdParam,
  validateSubmissionQuery,
  validateRequest,
  submissionController.listTopicSubmissions
);

module.exports = router;
