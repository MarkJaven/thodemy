const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { validateRequest } = require("../middleware/validation");
const { uploadTopicSubmission, uploadTopicResource } = require("../middleware/upload");
const { topicController } = require("../controllers/topicController");
const { submissionController } = require("../controllers/submissionController");
const { topicResourceController } = require("../controllers/topicResourceController");
const {
  validateCreateTopic,
  validateTopicIdParam,
  validateUpdateTopic,
  validateSubmissionQuery,
  validateResourceIdParam,
  validateCreateTopicResource,
  validateUpdateTopicResourceStatus,
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

router.get(
  "/:topicId/resources",
  generalLimiter,
  requireAuth,
  validateTopicIdParam,
  validateRequest,
  topicResourceController.listTopicResources
);

router.post(
  "/:topicId/resources",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTopicIdParam,
  validateRequest,
  uploadTopicResource,
  validateCreateTopicResource,
  validateRequest,
  topicResourceController.createTopicResource
);

router.patch(
  "/resources/:resourceId/status",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateResourceIdParam,
  validateUpdateTopicResourceStatus,
  validateRequest,
  topicResourceController.updateTopicResourceStatus
);

router.delete(
  "/resources/:resourceId",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateResourceIdParam,
  validateRequest,
  topicResourceController.deleteTopicResource
);

router.get(
  "/resources/:resourceId/file",
  generalLimiter,
  requireAuth,
  validateResourceIdParam,
  validateRequest,
  topicResourceController.getTopicResourceFile
);

module.exports = router;
