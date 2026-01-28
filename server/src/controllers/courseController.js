const { supabaseAdmin } = require("../config/supabase");
const {
  BadRequestError,
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const {
  calculateCourseTotals,
  calculateCourseEndDate,
  generateCourseCode,
} = require("../utils/courseUtils");

const normalizeRelationMap = (value) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [key, list]) => {
    if (Array.isArray(list)) {
      acc[key] = Array.from(new Set(list.map(String)));
    }
    return acc;
  }, {});
};

const resolveCourseTotals = async (topicIds) => {
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    return { totalHours: 0, totalDays: 0, topics: [] };
  }
  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, time_allocated, time_unit")
    .in("id", topicIds);
  if (error) {
    throw new ExternalServiceError("Unable to load topics", {
      code: error.code,
      details: error.message,
    });
  }
  const topics = data ?? [];
  if (topics.length !== topicIds.length) {
    throw new BadRequestError("One or more selected topics could not be found.");
  }
  const totals = calculateCourseTotals(topics);
  return { ...totals, topics };
};

const ensureUniqueCourseCode = async (attempts = 6) => {
  for (let i = 0; i < attempts; i += 1) {
    const code = generateCourseCode();
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id")
      .eq("course_code", code)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw new ExternalServiceError("Unable to validate course code", {
        code: error.code,
        details: error.message,
      });
    }
    if (!data) return code;
  }
  throw new ConflictError("Unable to generate a unique course code.");
};

const listCourses = async (_req, res, next) => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id, title, description, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at, created_by"
      )
      .order("created_at", { ascending: false });
    if (error) {
      throw new ExternalServiceError("Unable to load courses", {
        code: error.code,
        details: error.message,
      });
    }

    const { data: enrollments, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("course_id, user_id");
    if (enrollmentError) {
      throw new ExternalServiceError("Unable to load enrollments", {
        code: enrollmentError.code,
        details: enrollmentError.message,
      });
    }

    const counts = new Map();
    (enrollments ?? []).forEach((entry) => {
      if (!entry?.course_id) return;
      const key = entry.course_id;
      if (!counts.has(key)) {
        counts.set(key, new Set());
      }
      counts.get(key).add(entry.user_id);
    });

    const payload = (courses ?? []).map((course) => ({
      ...course,
      enrollment_count: counts.get(course.id)?.size ?? 0,
    }));

    return res.json({ courses: payload });
  } catch (error) {
    return next(error);
  }
};

const getCourseDetail = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select(
        "id, title, description, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at, created_by"
      )
      .eq("id", courseId)
      .single();
    if (error) {
      throw new NotFoundError("Course not found.");
    }

    const topicIds = course.topic_ids ?? [];
    const { data: topics, error: topicError } = await supabaseAdmin
      .from("topics")
      .select("id, title, description, time_allocated, time_unit")
      .in("id", topicIds);
    if (topicError) {
      throw new ExternalServiceError("Unable to load topics", {
        code: topicError.code,
        details: topicError.message,
      });
    }

    const { data: enrollments, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("id, user_id, status, enrolled_at")
      .eq("course_id", courseId);
    if (enrollmentError) {
      throw new ExternalServiceError("Unable to load enrollments", {
        code: enrollmentError.code,
        details: enrollmentError.message,
      });
    }

    const userIds = Array.from(
      new Set((enrollments ?? []).map((entry) => entry.user_id).filter(Boolean))
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

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

    const { data: topicProgress, error: progressError } = await supabaseAdmin
      .from("topic_progress")
      .select("id, user_id, topic_id, status, start_date, end_date")
      .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .in("topic_id", topicIds.length ? topicIds : ["00000000-0000-0000-0000-000000000000"]);
    if (progressError && userIds.length && topicIds.length) {
      throw new ExternalServiceError("Unable to load topic progress", {
        code: progressError.code,
        details: progressError.message,
      });
    }

    const enrichedEnrollments = (enrollments ?? []).map((entry) => ({
      ...entry,
      user: profileMap.get(entry.user_id) ?? null,
    }));

    return res.json({
      course,
      topics: topics ?? [],
      enrollments: enrichedEnrollments,
      topicProgress: topicProgress ?? [],
    });
  } catch (error) {
    return next(error);
  }
};

const upsertCourse = async (req, res, next) => {
  try {
    const userId = req.auth?.sub;
    const payload = req.body || {};
    const {
      title,
      description,
      topic_ids: topicIds,
      topic_prerequisites,
      topic_corequisites,
      status = "draft",
      enrollment_enabled = true,
      enrollment_limit,
      start_at,
      regenerate_code,
    } = payload;

    if (!title || typeof title !== "string") {
      throw new BadRequestError("Course title is required.");
    }
    if (!description || typeof description !== "string") {
      throw new BadRequestError("Course description is required.");
    }
    if (!Array.isArray(topicIds)) {
      throw new BadRequestError("Topics list is required.");
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

    const { totalHours, totalDays } = await resolveCourseTotals(topicIds);
    const normalizedPrereqs = normalizeRelationMap(topic_prerequisites);
    const normalizedCoreqs = normalizeRelationMap(topic_corequisites);

    const startDate = start_at ? new Date(start_at) : null;
    const endDate =
      startDate && totalDays > 0 ? calculateCourseEndDate(startDate, totalDays) : null;

    const coursePayload = {
      title: title.trim(),
      description: description.trim(),
      topic_ids: topicIds,
      topic_prerequisites: normalizedPrereqs,
      topic_corequisites: normalizedCoreqs,
      total_hours: totalHours,
      total_days: totalDays,
      status,
      enrollment_enabled: Boolean(enrollment_enabled),
      enrollment_limit: parsedEnrollmentLimit,
      start_at: startDate ? startDate.toISOString() : null,
      end_at: endDate ? endDate.toISOString() : null,
    };

    const { courseId } = req.params;
    if (courseId) {
      if (userId) {
        coursePayload.updated_by = userId;
      }
      if (regenerate_code) {
        coursePayload.course_code = await ensureUniqueCourseCode();
      }
      const { error } = await supabaseAdmin.from("courses").update(coursePayload).eq("id", courseId);
      if (error) {
        throw new ExternalServiceError("Unable to update course", {
          code: error.code,
          details: error.message,
        });
      }
      return res.json({ courseId });
    }

    coursePayload.course_code = await ensureUniqueCourseCode();
    if (userId) {
      coursePayload.created_by = userId;
      coursePayload.updated_by = userId;
    }
    const { data, error } = await supabaseAdmin
      .from("courses")
      .insert(coursePayload)
      .select(
        "id, title, description, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at"
      )
      .single();
    if (error) {
      throw new ExternalServiceError("Unable to create course", {
        code: error.code,
        details: error.message,
      });
    }
    return res.status(201).json({ course: data });
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", courseId);
    if (error) {
      throw new ExternalServiceError("Unable to delete course", {
        code: error.code,
        details: error.message,
      });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const deleteEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", enrollmentId);
    if (error) {
      throw new ExternalServiceError("Unable to remove enrollment", {
        code: error.code,
        details: error.message,
      });
    }
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
    const { courseCode } = req.body || {};
    if (!courseCode || typeof courseCode !== "string") {
      throw new BadRequestError("Course code is required.");
    }

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("id, status, enrollment_enabled, enrollment_limit")
      .eq("course_code", courseCode.trim())
      .maybeSingle();
    if (error) {
      throw new ExternalServiceError("Unable to validate course code", {
        code: error.code,
        details: error.message,
      });
    }
    if (!course) {
      throw new NotFoundError("Course not found.");
    }
    if (course.status !== "published") {
      throw new BadRequestError("Course is not open for enrollment.");
    }
    if (course.enrollment_enabled === false) {
      throw new BadRequestError("Enrollment is currently disabled.");
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      throw new ExternalServiceError("Unable to validate enrollment", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    if (existing) {
      throw new ConflictError("You are already enrolled in this course.");
    }

    if (course.enrollment_limit) {
      const { count, error: countError } = await supabaseAdmin
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id);
      if (countError) {
        throw new ExternalServiceError("Unable to validate enrollment limit", {
          code: countError.code,
          details: countError.message,
        });
      }
      if ((count ?? 0) >= course.enrollment_limit) {
        throw new ConflictError("Enrollment limit has been reached.");
      }
    }

    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        course_id: course.id,
        user_id: userId,
        status: "pending",
        created_by: userId,
        updated_by: userId,
      })
      .select("id, course_id, user_id, status, enrolled_at, created_at")
      .single();
    if (enrollError) {
      throw new ExternalServiceError("Unable to enroll in course", {
        code: enrollError.code,
        details: enrollError.message,
      });
    }
    return res.status(201).json({ enrollment, courseId: course.id });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  courseController: {
    listCourses,
    getCourseDetail,
    upsertCourse,
    deleteCourse,
    deleteEnrollment,
    enrollByCode,
  },
};
