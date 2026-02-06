const express = require("express");
const { generalLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireSuperAdmin } = require("../middleware/requireSuperAdmin");
const { validateRequest } = require("../middleware/validation");
const { adminController } = require("../controllers/adminController");
const { adminTaskController } = require("../controllers/adminTaskController");
const { courseController } = require("../controllers/courseController");
const { learningPathController } = require("../controllers/learningPathController");
const {
  validateCreateUser,
  validateUpdateUser,
  validateUserIdParam,
} = require("../validators/adminValidator");
const {
  validateTaskIdParam,
  validateCreateTask,
  validateUpdateTask,
  validateTaskStatusQuery,
} = require("../validators/taskValidator");

const router = express.Router();

router.get("/users", generalLimiter, requireAuth, requireAdmin, adminController.listUsers);

router.post(
  "/users",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateCreateUser,
  validateRequest,
  adminController.createUser
);

router.delete(
  "/users/:userId",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateUserIdParam,
  validateRequest,
  adminController.deleteUser
);

router.patch(
  "/users/:userId",
  generalLimiter,
  requireAuth,
  requireSuperAdmin,
  validateUserIdParam,
  validateUpdateUser,
  validateRequest,
  adminController.updateUser
);

router.get(
  "/tasks",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTaskStatusQuery,
  validateRequest,
  adminTaskController.listTasks
);

router.post(
  "/tasks",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateCreateTask,
  validateRequest,
  adminTaskController.createTask
);

router.patch(
  "/tasks/:taskId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTaskIdParam,
  validateUpdateTask,
  validateRequest,
  adminTaskController.updateTask
);

router.post(
  "/tasks/:taskId/complete",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTaskIdParam,
  validateRequest,
  adminTaskController.completeTask
);

router.post(
  "/tasks/:taskId/reopen",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTaskIdParam,
  validateRequest,
  adminTaskController.reopenTask
);

router.delete(
  "/tasks/:taskId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  validateTaskIdParam,
  validateRequest,
  adminTaskController.deleteTask
);

router.get("/courses", generalLimiter, requireAuth, requireAdmin, courseController.listCourses);

router.get(
  "/courses/:courseId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  courseController.getCourseDetail
);

router.post("/courses", generalLimiter, requireAuth, requireAdmin, courseController.upsertCourse);

router.patch(
  "/courses/:courseId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  courseController.upsertCourse
);

router.delete(
  "/courses/:courseId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  courseController.deleteCourse
);

router.delete(
  "/enrollments/:enrollmentId",
  generalLimiter,
  requireAuth,
  requireAdmin,
  courseController.deleteEnrollment
);

router.get("/learning-paths", generalLimiter, requireAuth, requireAdmin, learningPathController.listLearningPaths);
router.get("/learning-paths/:learningPathId", generalLimiter, requireAuth, requireAdmin, learningPathController.getLearningPathDetail);
router.post("/learning-paths", generalLimiter, requireAuth, requireAdmin, learningPathController.upsertLearningPath);
router.patch("/learning-paths/:learningPathId", generalLimiter, requireAuth, requireAdmin, learningPathController.upsertLearningPath);
router.delete("/learning-paths/:learningPathId", generalLimiter, requireAuth, requireAdmin, learningPathController.deleteLearningPath);
router.delete("/lp-enrollments/:enrollmentId", generalLimiter, requireAuth, requireAdmin, learningPathController.deleteLPEnrollment);

module.exports = router;
