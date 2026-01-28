const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { validateRequest } = require("../middleware/validation");
const { adminController } = require("../controllers/adminController");
const { courseController } = require("../controllers/courseController");
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserIdParam,
} = require("../validators/adminValidator");

const router = express.Router();

router.post(
  "/users",
  authLimiter,
  requireAuth,
  requireSuperAdmin,
  validateCreateUser,
  validateRequest,
  adminController.createUser
);

router.delete(
  "/users/:userId",
  authLimiter,
  requireAuth,
  requireSuperAdmin,
  validateUserIdParam,
  validateRequest,
  adminController.deleteUser
);

router.patch(
  "/users/:userId",
  authLimiter,
  requireAuth,
  requireSuperAdmin,
  validateUserIdParam,
  validateUpdateUser,
  validateRequest,
  adminController.updateUser
);

router.get("/courses", authLimiter, requireAuth, requireAdmin, courseController.listCourses);

router.get(
  "/courses/:courseId",
  authLimiter,
  requireAuth,
  requireAdmin,
  courseController.getCourseDetail
);

router.post("/courses", authLimiter, requireAuth, requireAdmin, courseController.upsertCourse);

router.patch(
  "/courses/:courseId",
  authLimiter,
  requireAuth,
  requireAdmin,
  courseController.upsertCourse
);

router.delete(
  "/courses/:courseId",
  authLimiter,
  requireAuth,
  requireAdmin,
  courseController.deleteCourse
);

router.delete(
  "/enrollments/:enrollmentId",
  authLimiter,
  requireAuth,
  requireAdmin,
  courseController.deleteEnrollment
);

module.exports = router;
