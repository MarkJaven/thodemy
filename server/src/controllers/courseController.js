const { supabaseAdmin } = require("../config/supabase");
const {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");
const { auditLogService } = require("../services/auditLogService");
const { scheduleService } = require("../services/scheduleService");
const {
  calculateCourseTotals,
  calculateCourseEndDate,
} = require("../utils/courseUtils");

const dedupeIds = (ids) =>
  Array.from(
    new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean))
  );

const normalizeRelationMap = (value, keepIds) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [key, list]) => {
    if (keepIds && !keepIds.has(String(key))) return acc;
    const filtered = Array.isArray(list)
      ? list.map(String).filter((id) => (keepIds ? keepIds.has(id) : true))
      : [];
    const unique = Array.from(new Set(filtered));
    if (unique.length > 0) {
      acc[key] = unique;
    }
    return acc;
  }, {});
};

const normalizeTopicTitle = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeTopicIdsByTitle = (topicIds, topicsById) => {
  const seenIds = new Set();
  const seenTitles = new Set();
  const orderedIds = [];
  const orderedTopics = [];

  topicIds.forEach((id) => {
    if (seenIds.has(id)) return;
    const topic = topicsById.get(id);
    if (!topic) return;
    const titleKey = normalizeTopicTitle(topic.title);
    if (titleKey && seenTitles.has(titleKey)) return;
    if (titleKey) {
      seenTitles.add(titleKey);
    }
    seenIds.add(id);
    orderedIds.push(id);
    orderedTopics.push(topic);
  });

  return { topicIds: orderedIds, topics: orderedTopics };
};

const resolveCourseTotals = async (topicIds) => {
  const uniqueIds = dedupeIds(topicIds);
  if (!Array.isArray(uniqueIds) || uniqueIds.length === 0) {
    return { totalHours: 0, totalDays: 0, topics: [], topicIds: [] };
  }
  const { data, error } = await supabaseAdmin
    .from("topics")
    .select("id, title, time_allocated, time_unit")
    .in("id", uniqueIds);
  if (error) {
    throw new ExternalServiceError("Unable to load topics", {
      code: error.code,
      details: error.message,
    });
  }
  const topics = data ?? [];
  if (topics.length !== uniqueIds.length) {
    throw new BadRequestError("One or more selected topics could not be found.");
  }
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
  const normalized = normalizeTopicIdsByTitle(uniqueIds, topicsById);
  const totals = calculateCourseTotals(normalized.topics);
  return { ...totals, topics: normalized.topics, topicIds: normalized.topicIds };
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

    const topicsById = new Map((topics ?? []).map((topic) => [topic.id, topic]));
    const normalized = normalizeTopicIdsByTitle(dedupeIds(topicIds), topicsById);
    const normalizedTopicIds = normalized.topicIds;

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
      .in(
        "topic_id",
        normalizedTopicIds.length
          ? normalizedTopicIds
          : ["00000000-0000-0000-0000-000000000000"]
      );
    if (progressError && userIds.length && normalizedTopicIds.length) {
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
      course: { ...course, topic_ids: normalizedTopicIds },
      topics: normalized.topics,
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
    } = payload;

    if (!title || typeof title !== "string") {
      throw new BadRequestError("Course title is required.");
    }
    if (!description || typeof description !== "string") {
      throw new BadRequestError("Course description is required.");
    }
    if (description.trim().length > 5000) {
      throw new BadRequestError("Course description must be 5000 characters or fewer.");
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

    const uniqueTopicIds = dedupeIds(topicIds);
    const { totalHours, totalDays, topicIds: normalizedTopicIds } =
      await resolveCourseTotals(uniqueTopicIds);
    const keepIds = new Set(normalizedTopicIds);
    const normalizedPrereqs = normalizeRelationMap(topic_prerequisites, keepIds);
    const normalizedCoreqs = normalizeRelationMap(topic_corequisites, keepIds);

    const startDate = start_at ? new Date(start_at) : null;
    const endDate =
      startDate && totalDays > 0 ? calculateCourseEndDate(startDate, totalDays) : null;

    const coursePayload = {
      title: title.trim(),
      description: description.trim(),
      topic_ids: normalizedTopicIds,
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
    let existingCourse = null;
    if (courseId) {
      const { data, error: existingError } = await supabaseAdmin
        .from("courses")
        .select("id, title, status")
        .eq("id", courseId)
        .maybeSingle();
      if (existingError) {
        throw new ExternalServiceError("Unable to load course", {
          code: existingError.code,
          details: existingError.message,
        });
      }
      existingCourse = data ?? null;
    }
    if (courseId) {
      if (userId) {
        coursePayload.updated_by = userId;
      }
      const { error } = await supabaseAdmin.from("courses").update(coursePayload).eq("id", courseId);
      if (error) {
        throw new ExternalServiceError("Unable to update course", {
          code: error.code,
          details: error.message,
        });
      }
      const previousStatus = existingCourse?.status ?? null;
      const nextStatus = coursePayload.status ?? previousStatus;
      const action =
        previousStatus && nextStatus && previousStatus !== nextStatus
          ? "status_changed"
          : "updated";
      await auditLogService.recordAuditLog({
        entityType: "course",
        entityId: courseId,
        action,
        actorId: userId,
        details: {
          title: coursePayload.title,
          from: previousStatus,
          to: nextStatus,
        },
      });
      await scheduleService.scheduleCourseTopics({
        courseId,
        topicIds: normalizedTopicIds,
        topicPrerequisites: normalizedPrereqs,
        topicCorequisites: normalizedCoreqs,
        fallbackStartAt: coursePayload.start_at,
        updatedBy: userId,
      });
      return res.json({ courseId });
    }

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
    await auditLogService.recordAuditLog({
      entityType: "course",
      entityId: data.id,
      action: "created",
      actorId: userId,
      details: {
        title: data.title,
        status: data.status,
        topics: data.topic_ids?.length ?? 0,
      },
    });
    const scheduleResult = await scheduleService.scheduleCourseTopics({
      courseId: data.id,
      topicIds: normalizedTopicIds,
      topicPrerequisites: normalizedPrereqs,
      topicCorequisites: normalizedCoreqs,
      fallbackStartAt: coursePayload.start_at,
      updatedBy: userId,
    });

    const scheduledCourse =
      scheduleResult?.scheduled
        ? {
            ...data,
            start_at: scheduleResult.courseStart ?? data.start_at,
            end_at: scheduleResult.courseEnd ?? data.end_at,
          }
        : data;

    return res.status(201).json({ course: scheduledCourse });
  } catch (error) {
    return next(error);
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.sub;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("courses")
      .select("id, title, status")
      .eq("id", courseId)
      .maybeSingle();
    if (existingError) {
      throw new ExternalServiceError("Unable to load course", {
        code: existingError.code,
        details: existingError.message,
      });
    }
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", courseId);
    if (error) {
      throw new ExternalServiceError("Unable to delete course", {
        code: error.code,
        details: error.message,
      });
    }
    await auditLogService.recordAuditLog({
      entityType: "course",
      entityId: courseId,
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

const deleteEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const userId = req.auth?.sub;
    const { error } = await supabaseAdmin.from("enrollments").delete().eq("id", enrollmentId);
    if (error) {
      throw new ExternalServiceError("Unable to remove enrollment", {
        code: error.code,
        details: error.message,
      });
    }
    await auditLogService.recordAuditLog({
      entityType: "enrollment",
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
    throw new BadRequestError("Course enrollment is disabled. Use a learning path code.");
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
