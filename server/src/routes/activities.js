const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { validateRequest } = require("../middleware/validation");
const { uploadActivitySubmission } = require("../middleware/upload");
const { activityController } = require("../controllers/activityController");
const {
  validateActivityIdParam,
  validateActivitySubmission,
} = require("../validators/activityValidator");

const router = express.Router();

router.post(
  "/",
  generalLimiter,
  requireAuth,
  requireActiveUser,
  uploadActivitySubmission,
  validateActivitySubmission,
  validateRequest,
  activityController.createActivitySubmission
);

router.delete(
  "/:activityId",
  generalLimiter,
  requireAuth,
  requireActiveUser,
  validateActivityIdParam,
  validateRequest,
  activityController.deleteActivitySubmission
);

module.exports = router;
