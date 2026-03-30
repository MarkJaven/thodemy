const express = require("express");
const { supabaseAdmin } = require("../config/supabase");
const { sendSuccess } = require("../utils/responses");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * Return public platform statistics (no auth required).
 */
const getStats = async (_req, res, next) => {
  try {
    const [usersResult, coursesResult] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
    ]);

    if (usersResult.error) {
      logger.warn("stats_users_error", { error: usersResult.error.message });
    }
    if (coursesResult.error) {
      logger.warn("stats_courses_error", { error: coursesResult.error.message });
    }

    return sendSuccess(res, {
      data: {
        activeUsers: usersResult.count ?? 0,
        activeCourses: coursesResult.count ?? 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

router.get("/", getStats);

module.exports = router;
