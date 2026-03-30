const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireActiveUser } = require("../middleware/requireActiveUser");
const { formController } = require("../controllers/formController");

const router = express.Router();

router.get(
  "/",
  generalLimiter,
  requireAuth,
  requireActiveUser,
  formController.listUserForms
);

router.post(
  "/:formId/open",
  generalLimiter,
  requireAuth,
  requireActiveUser,
  formController.getFormLink
);

module.exports = router;
