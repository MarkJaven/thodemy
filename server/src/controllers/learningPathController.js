const { supabaseAdmin } = require("../config/supabase");
const {
  BadRequestError,
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const { auditLogService } = require("../services/auditLogService");
const { scheduleService } = require("../services/scheduleService");
const { calculateCourseEndDate, generateCourseCode } = require("../utils/courseUtils");

const ensureUniqueLPCode = async (attempts = 6) => {
  for (let i = 0; i < attempts; i += 1) {
    const code = generateCourseCode("LP");
    const { data, error } = await supabaseAdmin
      .from("learning_paths")
      .select("id")
      .eq("enrollment_code", code)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw new ExternalServiceError("Unable to validate enrollment code", {
        code: error.code,
        details: error.message,
      });
    }
    if (!data) return code;
  }
  throw new ConflictError("Unable to generate a unique enrollment code.");
};

const resolveLPTotals = async (courseIds) => {
  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return { totalHours: 0, totalDays: 0 };
  }
  const { data: courses, error } = await supabaseAdmin
    .from("courses")
    .select("id, total_hours")
    .in("id", courseIds);
  if (error) {
    throw new ExternalServiceError("Unable to load courses", {
      code: error.code,
      details: error.message,
    });
  }
  const totalHours = (courses ?? []).reduce(
    (sum, course) => sum + (Number(course.total_hours) || 0),
    0
  );
  const totalDays = totalHours > 0 ? Math.ceil(totalHours / 8) : 0;
  return { totalHours, totalDays };
};

const areSameIdSet = (left, right) => {
  const leftSet = new Set((Array.isArray(left) ? left : []).map((id) => String(id)));
  const rightSet = new Set((Array.isArray(right) ? right : []).map((id) => String(id)));
  if (leftSet.size !== rightSet.size) return false;
  for (const id of leftSet) {
    if (!rightSet.has(id)) return false;
  }
  return true;
};

const listLearningPaths = async (_req, res, next) => {
  try {
    const { data: paths, error } = await supabaseAdmin
      .from("learning_paths")
      .select(
        "id, title, description, course_ids, total_hours, total_days, enrollment_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at, created_by"
      )
      .order("created_at", { ascending: false });
    if (error) {
      throw new ExternalServiceError("Unable to load learning paths", {
        code: error.code,
        details: error.message,
      });
    }

    const { data: enrollments, error: enrollmentError } = await supabaseAdmin
      .from("learning_path_enrollments")
      .select("learning_path_id, user_id");
    if (enrollmentError) {
      throw new ExternalServiceError("Unable to load enrollments", {
        code: enrollmentError.code,
        details: enrollmentError.message,
      });
    }

    const counts = new Map();
    (enrollments ?? []).forEach((entry) => {
      if (!entry?.learning_path_id) return;
      const key = entry.learning_path_id;
      if (!counts.has(key)) {
        counts.set(key, new Set());
      }
      counts.get(key).add(entry.user_id);
    });

    const payload = (paths ?? []).map((path) => ({
      ...path,
      enrollment_count: counts.get(path.id)?.size ?? 0,
    }));

    return res.json({ learningPaths: payload });
  } catch (error) {
    return next(error);
  }
};

const getLearningPathDetail = async (req, res, next) => {
  try {
    const { learningPathId } = req.params;
    const { data: lp, error } = await supabaseAdmin
      .from("learning_paths")
      .select(
        "id, title, description, course_ids, total_hours, total_days, enrollment_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at, created_by"
      )
      .eq("id", learningPathId)
      .single();
    if (error) {
      throw new NotFoundError("Learning path not found.");
    }

    const courseIds = lp.course_ids ?? [];
    let courses = [];
    if (courseIds.length > 0) {
      const { data: courseData, error: courseError } = await supabaseAdmin
        .from("courses")
        .select(
          "id, title, description, topic_ids, total_hours, total_days, status, created_at"
        )
        .in("id", courseIds);
      if (courseError) {
        throw new ExternalServiceError("Unable to load courses", {
          code: courseError.code,
          details: courseError.message,
        });
      }
      courses = courseData ?? [];
    }

    const allTopicIds = courses.flatMap((c) => c.topic_ids ?? []);
    let topics = [];
    if (allTopicIds.length > 0) {
      const { data: topicData, error: topicError } = await supabaseAdmin
        .from("topics")
        .select("id, title, description, time_allocated, time_unit")
        .in("id", allTopicIds);
      if (topicError) {
        throw new ExternalServiceError("Unable to load topics", {
          code: topicError.code,
          details: topicError.message,
        });
      }
      topics = topicData ?? [];
    }

    const { data: enrollments, error: enrollmentError } = await supabaseAdmin
      .from("learning_path_enrollments")
      .select("id, user_id, status, enrolled_at")
      .eq("learning_path_id", learningPathId);
    if (enrollmentError) {
      throw new ExternalServiceError("Unable to load enrollments", {
        code: enrollmentError.code,
        details: enrollmentError.message,
      });
    }

    const userIds = Array.from(
      new Set((enrollments ?? []).map((e) => e.user_id).filter(Boolean))
    );

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    if (profileError && userIds.length) {
      throw new ExternalServiceError("Unable to load profiles", {
        code: profileError.code,
        details: profileError.message,
      });
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    let topicProgress = [];
    if (userIds.length > 0 && allTopicIds.length > 0) {
      const { data: progressData, error: progressError } = await supabaseAdmin
        .from("topic_progress")
        .select("id, user_id, topic_id, status, start_date, end_date")
        .in("user_id", userIds)
        .in("topic_id", allTopicIds);
      if (progressError) {
        throw new ExternalServiceError("Unable to load topic progress", {
          code: progressError.code,
          details: progressError.message,
        });
      }
      topicProgress = progressData ?? [];
    }

    const enrichedEnrollments = (enrollments ?? []).map((entry) => ({
      ...entry,
      user: profileMap.get(entry.user_id) ?? null,
    }));

    return res.json({
      learningPath: lp,
      courses,
      topics,
      enrollments: enrichedEnrollments,
      topicProgress,
    });
  } catch (error) {
    return next(error);
  }
};

const upsertLearningPath = async (req, res, next) => {
  try {
    const userId = req.auth?.sub;
    const payload = req.body || {};
    const {
      title,
      description = "",
      course_ids: courseIds,
      status = "draft",
      enrollment_enabled = true,
      enrollment_limit,
      start_at,
      regenerate_code,
    } = payload;

    if (!title || typeof title !== "string") {
      throw new BadRequestError("Learning path title is required.");
    }
    if (!Array.isArray(courseIds)) {
      throw new BadRequestError("Courses list is required.");
    }
    if (!["draft", "published", "archived"].includes(status)) {
      throw new BadRequestError("Status must be draft, published, or archived.");
    }

    let parsedEnrollmentLimit = null;
    if (enrollment_limit !== null && enrollment_limit !== undefined) {
      const limitValue = Number(enrollment_limit);
      if (!Number.isFinite(limitValue) || limitValue <= 0) {
        throw new BadRequestError("Enrollment limit must be a positive number.");
      }
      parsedEnrollmentLimit = limitValue;
    }

    const { totalHours, totalDays } = await resolveLPTotals(courseIds);

    const startDate = start_at ? new Date(start_at) : null;
    const endDate =
      startDate && totalDays > 0 ? calculateCourseEndDate(startDate, totalDays) : null;

    const lpPayload = {
      title: title.trim(),
      description: (description || "").trim(),
      course_ids: courseIds,
      total_hours: totalHours,
      total_days: totalDays,
      status,
      enrollment_enabled: Boolean(enrollment_enabled),
      enrollment_limit: parsedEnrollmentLimit,
      start_at: startDate ? startDate.toISOString() : null,
      end_at: endDate ? endDate.toISOString() : null,
    };

    const { learningPathId } = req.params;
    let existingPath = null;
    if (learningPathId) {
      const { data, error: existingError } = await supabaseAdmin
        .from("learning_paths")
        .select("id, title, status, start_at, course_ids")
        .eq("id", learningPathId)
        .maybeSingle();
      if (existingError) {
        throw new ExternalServiceError("Unable to load learning path", {
          code: existingError.code,
          details: existingError.message,
        });
      }
      existingPath = data ?? null;
    }
    if (learningPathId) {
      if (userId) {
        lpPayload.updated_by = userId;
      }
      if (regenerate_code) {
        lpPayload.enrollment_code = await ensureUniqueLPCode();
      }
      const { error } = await supabaseAdmin
        .from("learning_paths")
        .update(lpPayload)
        .eq("id", learningPathId);
      if (error) {
        throw new ExternalServiceError("Unable to update learning path", {
          code: error.code,
          details: error.message,
        });
      }
      const previousStatus = existingPath?.status ?? null;
      const nextStatus = lpPayload.status ?? previousStatus;
      const action =
        previousStatus && nextStatus && previousStatus !== nextStatus
          ? "status_changed"
          : "updated";
      await auditLogService.recordAuditLog({
        entityType: "learning_path",
        entityId: learningPathId,
        action,
        actorId: userId,
        details: {
          title: lpPayload.title,
          from: previousStatus,
          to: nextStatus,
        },
      });
      const previousStartAt = existingPath?.start_at ?? null;
      const nextStartAt = lpPayload.start_at ?? null;
      const startAtChanged = previousStartAt !== nextStartAt;
      const courseIdsChanged = !areSameIdSet(courseIds, existingPath?.course_ids ?? []);

      if (nextStartAt && (startAtChanged || courseIdsChanged)) {
        await scheduleService.scheduleLearningPathCourses({
          learningPathId,
          updatedBy: userId,
        });
      }
      return res.json({ learningPathId });
    }

    lpPayload.enrollment_code = await ensureUniqueLPCode();
    if (userId) {
      lpPayload.created_by = userId;
      lpPayload.updated_by = userId;
    }
    const { data, error } = await supabaseAdmin
      .from("learning_paths")
      .insert(lpPayload)
      .select(
        "id, title, description, course_ids, total_hours, total_days, enrollment_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at"
      )
      .single();
    if (error) {
      throw new ExternalServiceError("Unable to create learning path", {
        code: error.code,
        details: error.message,
      });
    }
    await auditLogService.recordAuditLog({
      entityType: "learning_path",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: {
        title: data.title,
        status: data.status,
        courses: data.course_ids?.length ?? 0,
      },
    });
    if (data.start_at) {
      await scheduleService.scheduleLearningPathCourses({
        learningPathId: data.id,
        updatedBy: userId,
      });
    }
    return res.status(201).json({ learningPath: data });
  } catch (error) {
    return next(error);
  }
};

const deleteLearningPath = async (req, res, next) => {
  try {
    const { learningPathId } = req.params;
    const userId = req.auth?.sub;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("learning_paths")
      .select("id, title, status")
      .eq("id", learningPathId)
      .maybeSingle();
    if (existingError) {
      throw new ExternalServiceError("Unable to load learning path", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    const { error } = await supabaseAdmin
      .from("learning_paths")
      .delete()
      .eq("id", learningPathId);
    if (error) {
      throw new ExternalServiceError("Unable to delete learning path", {
        code: error.code,
        details: error.message,
      });
    }
    await auditLogService.recordAuditLog({
      entityType: "learning_path",
      entityId: learningPathId,
      action: "deleted",
      actorId: userId,
      details: {
        title: existing?.title ?? null,
        status: existing?.status ?? null,
      },
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const deleteLPEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.auth?.sub;
    const { error } = await supabaseAdmin
      .from("learning_path_enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) {
      throw new ExternalServiceError("Unable to remove enrollment", {
        code: error.code,
        details: error.message,
      });
    }
    await auditLogService.recordAuditLog({
      entityType: "learning_path_enrollment",
      entityId: enrollmentId,
      action: "removed",
      actorId: userId,
    });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const enrollByCode = async (req, res, next) => {
  try {
    const userId = req.auth?.sub;
    if (!userId) {
      throw new BadRequestError("User session required to enroll.");
    }
    const { enrollmentCode } = req.body || {};
    if (!enrollmentCode || typeof enrollmentCode !== "string") {
      throw new BadRequestError("Enrollment code is required.");
    }

    const { data: lp, error } = await supabaseAdmin
      .from("learning_paths")
      .select("id, status, enrollment_enabled, enrollment_limit")
      .eq("enrollment_code", enrollmentCode.trim())
      .maybeSingle();
    if (error) {
      throw new ExternalServiceError("Unable to validate enrollment code", {
        code: error.code,
        details: error.message,
      });
    }
    if (!lp) {
      throw new NotFoundError("Learning path not found.");
    }
    if (lp.status !== "published") {
      throw new BadRequestError("Learning path is not open for enrollment.");
    }
    if (lp.enrollment_enabled === false) {
      throw new BadRequestError("Enrollment is currently disabled.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("learning_path_enrollments")
      .select("id")
      .eq("learning_path_id", lp.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      throw new ExternalServiceError("Unable to validate enrollment", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (existing) {
      throw new ConflictError("You are already enrolled in this learning path.");
    }

    if (lp.enrollment_limit) {
      const { count, error: countError } = await supabaseAdmin
        .from("learning_path_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("learning_path_id", lp.id);
      if (countError) {
        throw new ExternalServiceError("Unable to validate enrollment limit", {
          code: countError.code,
          details: countError.message,
        });
      }
      if ((count ?? 0) >= lp.enrollment_limit) {
        throw new ConflictError("Enrollment limit has been reached.");
      }
    }

    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("learning_path_enrollments")
      .insert({
        learning_path_id: lp.id,
        user_id: userId,
        status: "pending",
        created_by: userId,
        updated_by: userId,
      })
      .select("id, learning_path_id, user_id, status, enrolled_at, created_at")
      .single();
    if (enrollError) {
      throw new ExternalServiceError("Unable to enroll in learning path", {
        code: enrollError.code,
        details: enrollError.message,
      });
    }
    return res.status(201).json({ enrollment, learningPathId: lp.id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  learningPathController: {
    listLearningPaths,
    getLearningPathDetail,
    upsertLearningPath,
    deleteLearningPath,
    deleteLPEnrollment,
    enrollByCode,
  },
};
