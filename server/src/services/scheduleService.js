const { supabaseAdmin } = require("../config/supabase");
const { BadRequestError, ExternalServiceError } = require("../utils/errors");
const { calculateCourseEndDate } = require("../utils/courseUtils");

const dedupeIds = (ids) =>
  Array.from(
    new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean))
  );

const normalizeRelationMap = (value, keepSet) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [key, list]) => {
    const id = String(key);
    if (keepSet && !keepSet.has(id)) return acc;
    const filtered = Array.isArray(list)
      ? list.map(String).filter((entry) => (keepSet ? keepSet.has(entry) : true))
      : [];
    const unique = Array.from(new Set(filtered));
    if (unique.length > 0) {
      acc[id] = unique;
    }
    return acc;
  }, {});
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const WORK_HOURS_PER_DAY = 8;
const CURSOR_EPSILON = 1e-6;

const toTopicHours = (topic) => {
  const time = Number(topic?.time_allocated) || 0;
  if (time <= 0) return 0;
  if (topic?.time_unit === "days") {
    return time * WORK_HOURS_PER_DAY;
  }
  return time;
};

const ensureWorkingDay = (date) => calculateCourseEndDate(date, 1);

const nextWorkingDay = (date) => {
  if (!date) return null;
  const candidate = new Date(date.getTime());
  candidate.setDate(candidate.getDate() + 1);
  return calculateCourseEndDate(candidate, 1);
};

const normalizeCursor = (cursor) => {
  let workingDate = ensureWorkingDay(cursor.date);
  let remainingHours = cursor.remainingHours;
  if (workingDate.getTime() !== cursor.date.getTime()) {
    remainingHours = WORK_HOURS_PER_DAY;
  }
  if (remainingHours <= CURSOR_EPSILON) {
    workingDate = nextWorkingDay(workingDate);
    remainingHours = WORK_HOURS_PER_DAY;
  }
  return { date: workingDate, remainingHours };
};

const compareCursor = (left, right) => {
  const leftTime = left.date.getTime();
  const rightTime = right.date.getTime();
  if (leftTime > rightTime) return left;
  if (rightTime > leftTime) return right;
  return left.remainingHours <= right.remainingHours ? left : right;
};

const addWorkingHours = (cursor, hours) => {
  let remainingToAllocate = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  let { date, remainingHours } = normalizeCursor(cursor);
  if (remainingToAllocate <= CURSOR_EPSILON) {
    return { endDate: new Date(date.getTime()), cursor: { date, remainingHours } };
  }

  while (remainingToAllocate > CURSOR_EPSILON) {
    if (remainingHours <= CURSOR_EPSILON) {
      date = nextWorkingDay(date);
      remainingHours = WORK_HOURS_PER_DAY;
    }
    const chunk = Math.min(remainingHours, remainingToAllocate);
    remainingHours -= chunk;
    remainingToAllocate -= chunk;
    if (remainingToAllocate <= CURSOR_EPSILON) {
      return { endDate: new Date(date.getTime()), cursor: { date, remainingHours } };
    }
  }

  return { endDate: new Date(date.getTime()), cursor: { date, remainingHours } };
};

const buildEffectivePrereqs = (topicIds, prereqMap, coreqMap) => {
  const { groupList, groupByTopic } = buildCoreqGroups(topicIds, coreqMap);
  const groupIndexById = new Map(groupList.map((group, index) => [group.id, index]));
  const effective = {};
  topicIds.forEach((topicId, index) => {
    if (Object.prototype.hasOwnProperty.call(prereqMap, topicId)) {
      effective[topicId] = prereqMap[topicId];
      return;
    }
    const groupId = groupByTopic.get(topicId);
    const groupIndex = groupId ? groupIndexById.get(groupId) ?? -1 : -1;
    if (groupIndex > 0) {
      effective[topicId] = [...groupList[groupIndex - 1].topics];
      return;
    }
    if (groupIndex === -1 && index > 0) {
      effective[topicId] = [topicIds[index - 1]];
      return;
    }
    effective[topicId] = [];
  });
  return effective;
};

const buildEffectiveCoreqs = (topicIds, coreqMap) => {
  const effective = {};
  topicIds.forEach((topicId) => {
    if (Object.prototype.hasOwnProperty.call(coreqMap, topicId)) {
      effective[topicId] = coreqMap[topicId];
      return;
    }
    effective[topicId] = [];
  });
  return effective;
};

const buildCoreqGroups = (topicIds, coreqMap) => {
  const parent = new Map();
  topicIds.forEach((id) => parent.set(id, id));

  const find = (id) => {
    const current = parent.get(id);
    if (!current) return id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (left, right) => {
    const rootLeft = find(left);
    const rootRight = find(right);
    if (rootLeft === rootRight) return;
    parent.set(rootRight, rootLeft);
  };

  topicIds.forEach((id) => {
    const coreqs = coreqMap[id] || [];
    coreqs.forEach((coreqId) => {
      if (!parent.has(coreqId)) return;
      union(id, coreqId);
    });
  });

  const groupsByRoot = new Map();
  topicIds.forEach((id, index) => {
    const root = find(id);
    const existing = groupsByRoot.get(root);
    if (!existing) {
      groupsByRoot.set(root, { id: root, topics: [id], firstIndex: index });
      return;
    }
    existing.topics.push(id);
    existing.firstIndex = Math.min(existing.firstIndex, index);
  });

  const groupList = Array.from(groupsByRoot.values()).sort(
    (left, right) => left.firstIndex - right.firstIndex
  );
  const groupById = new Map(groupList.map((group) => [group.id, group]));
  const groupByTopic = new Map();
  groupList.forEach((group) => {
    group.topics.forEach((topicId) => {
      groupByTopic.set(topicId, group.id);
    });
  });

  return { groupList, groupById, groupByTopic };
};

const buildSchedule = ({ startDate, topicIds, topicsById, effectivePrereqs, effectiveCoreqs }) => {
  if (!startDate) {
    return { schedule: new Map(), courseStart: null, courseEnd: null, endCursor: null };
  }

  const normalizedStart = normalizeCursor({
    date: startDate,
    remainingHours: WORK_HOURS_PER_DAY,
  });

  const { groupList, groupById, groupByTopic } = buildCoreqGroups(topicIds, effectiveCoreqs);

  const groupPrereqs = new Map();
  groupList.forEach((group) => groupPrereqs.set(group.id, new Set()));

  topicIds.forEach((topicId) => {
    const groupId = groupByTopic.get(topicId);
    const prereqs = effectivePrereqs[topicId] || [];
    prereqs.forEach((prereqId) => {
      const prereqGroup = groupByTopic.get(prereqId);
      if (!prereqGroup || prereqGroup === groupId) return;
      groupPrereqs.get(groupId).add(prereqGroup);
    });
  });

  const schedule = new Map();
  const groupEnd = new Map();
  const pending = new Set(groupList.map((group) => group.id));
  const orderedGroupIds = groupList.map((group) => group.id);

  const scheduleGroup = (groupId, groupStart) => {
    const group = groupById.get(groupId);
    if (!group || !groupStart) return;
    let topicCursor = groupStart;
    group.topics.forEach((topicId) => {
      const topic = topicsById.get(topicId);
      if (!topic) return;
      const hours = toTopicHours(topic);
      const result = addWorkingHours(topicCursor, hours);
      schedule.set(topicId, { start: topicCursor.date, end: result.endDate });
      topicCursor = result.cursor;
    });
    groupEnd.set(groupId, topicCursor);
  };

  let progressed = true;
  while (pending.size > 0 && progressed) {
    progressed = false;
    for (const groupId of orderedGroupIds) {
      if (!pending.has(groupId)) continue;
      const prereqGroups = groupPrereqs.get(groupId) || new Set();
      let latestPrereqEnd = null;
      let ready = true;
      prereqGroups.forEach((prereqGroup) => {
        if (!groupEnd.has(prereqGroup)) {
          ready = false;
          return;
        }
        latestPrereqEnd = latestPrereqEnd
          ? compareCursor(latestPrereqEnd, groupEnd.get(prereqGroup))
          : groupEnd.get(prereqGroup);
      });
      if (!ready) continue;

      let start = normalizedStart;
      if (latestPrereqEnd) {
        start = normalizeCursor(latestPrereqEnd);
      }
      scheduleGroup(groupId, start);
      pending.delete(groupId);
      progressed = true;
    }
  }

  if (pending.size > 0) {
    let cursor = null;
    for (const groupId of orderedGroupIds) {
      if (!pending.has(groupId)) {
        const knownEnd = groupEnd.get(groupId) || null;
        if (knownEnd) {
          cursor = cursor ? compareCursor(cursor, knownEnd) : knownEnd;
        }
        continue;
      }
      const prereqGroups = groupPrereqs.get(groupId) || new Set();
      let latestPrereqEnd = null;
      prereqGroups.forEach((prereqGroup) => {
        const prereqEnd = groupEnd.get(prereqGroup) || null;
        if (!prereqEnd) return;
        latestPrereqEnd = latestPrereqEnd
          ? compareCursor(latestPrereqEnd, prereqEnd)
          : prereqEnd;
      });

      let start = normalizedStart;
      if (cursor) {
        start = normalizeCursor(cursor);
      }
      if (latestPrereqEnd) {
        const candidate = normalizeCursor(latestPrereqEnd);
        start = compareCursor(start, candidate);
      }

      scheduleGroup(groupId, start);
      pending.delete(groupId);
      const newEnd = groupEnd.get(groupId) || null;
      if (newEnd) {
        cursor = cursor ? compareCursor(cursor, newEnd) : newEnd;
      }
    }
  }

  let endCursor = normalizedStart;
  groupEnd.forEach((cursor) => {
    endCursor = compareCursor(endCursor, cursor);
  });

  let courseStart = null;
  let courseEnd = null;
  schedule.forEach((entry) => {
    courseStart = courseStart ? (entry.start < courseStart ? entry.start : courseStart) : entry.start;
    courseEnd = courseEnd ? (entry.end > courseEnd ? entry.end : courseEnd) : entry.end;
  });
  if (!courseStart) {
    courseStart = normalizedStart.date;
  }
  if (endCursor && endCursor.date) {
    courseEnd = courseEnd
      ? (endCursor.date > courseEnd ? endCursor.date : courseEnd)
      : endCursor.date;
  }

  return { schedule, courseStart, courseEnd, endCursor };
};

const resolveLearningPathStartForCourse = async (courseId) => {
  if (!courseId) return null;
  const { data, error } = await supabaseAdmin
    .from("learning_paths")
    .select("id, start_at")
    .contains("course_ids", [String(courseId)]);
  if (error) {
    throw new ExternalServiceError("Unable to load learning path start dates", {
      code: error.code,
      details: error.message,
    });
  }
  const starts = (data ?? [])
    .map((entry) => parseDate(entry.start_at))
    .filter(Boolean);

  if (starts.length === 0) return null;
  return starts.reduce((earliest, current) =>
    current.getTime() < earliest.getTime() ? current : earliest
  );
};

const scheduleCourseTopics = async ({
  courseId,
  topicIds,
  topicPrerequisites,
  topicCorequisites,
  startAtOverride,
  fallbackStartAt,
  updatedBy,
}) => {
  const orderedTopicIds = dedupeIds(topicIds);
  if (orderedTopicIds.length === 0) {
    return { scheduled: false, courseStart: null, courseEnd: null };
  }

  const startDate =
    parseDate(startAtOverride) ||
    (courseId ? await resolveLearningPathStartForCourse(courseId) : null) ||
    parseDate(fallbackStartAt);

  if (!startDate) {
    return { scheduled: false, courseStart: null, courseEnd: null };
  }

  const { data: topics, error: topicError } = await supabaseAdmin
    .from("topics")
    .select("id, time_allocated, time_unit")
    .in("id", orderedTopicIds);
  if (topicError) {
    throw new ExternalServiceError("Unable to load topics for scheduling", {
      code: topicError.code,
      details: topicError.message,
    });
  }
  if ((topics ?? []).length !== orderedTopicIds.length) {
    throw new BadRequestError("One or more topics could not be scheduled.");
  }

  const topicsById = new Map((topics ?? []).map((topic) => [String(topic.id), topic]));
  const keepSet = new Set(orderedTopicIds);
  const normalizedPrereqs = normalizeRelationMap(topicPrerequisites, keepSet);
  const normalizedCoreqs = normalizeRelationMap(topicCorequisites, keepSet);

  const effectiveCoreqs = buildEffectiveCoreqs(orderedTopicIds, normalizedCoreqs);
  const effectivePrereqs = buildEffectivePrereqs(
    orderedTopicIds,
    normalizedPrereqs,
    effectiveCoreqs
  );

  const { schedule, courseStart, courseEnd } = buildSchedule({
    startDate,
    topicIds: orderedTopicIds,
    topicsById,
    effectivePrereqs,
    effectiveCoreqs,
  });

  if (schedule.size === 0) {
    return { scheduled: false, courseStart: null, courseEnd: null };
  }

  const topicUpdates = orderedTopicIds
    .map((topicId) => {
      const entry = schedule.get(topicId);
      if (!entry) return null;
      const update = {
        id: topicId,
        start_date: entry.start.toISOString(),
        end_date: entry.end.toISOString(),
        pre_requisites: effectivePrereqs[topicId] ?? [],
        co_requisites: effectiveCoreqs[topicId] ?? [],
      };
      if (updatedBy) {
        update.updated_by = updatedBy;
      }
      return update;
    })
    .filter(Boolean);

  if (topicUpdates.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("topics")
      .upsert(topicUpdates, { onConflict: "id" });
    if (updateError) {
      throw new ExternalServiceError("Unable to update topic schedules", {
        code: updateError.code,
        details: updateError.message,
      });
    }
  }

  if (courseId && (courseStart || courseEnd)) {
    const courseUpdate = {};
    if (courseStart) courseUpdate.start_at = courseStart.toISOString();
    if (courseEnd) courseUpdate.end_at = courseEnd.toISOString();
    if (updatedBy) courseUpdate.updated_by = updatedBy;

    const { error: courseError } = await supabaseAdmin
      .from("courses")
      .update(courseUpdate)
      .eq("id", courseId);

    if (courseError) {
      throw new ExternalServiceError("Unable to update course schedule", {
        code: courseError.code,
        details: courseError.message,
      });
    }
  }

  return {
    scheduled: true,
    courseStart: courseStart ? courseStart.toISOString() : null,
    courseEnd: courseEnd ? courseEnd.toISOString() : null,
  };
};

const scheduleLearningPathCourses = async ({ learningPathId, updatedBy }) => {
  if (!learningPathId) return;
  const { data: learningPath, error: lpError } = await supabaseAdmin
    .from("learning_paths")
    .select("id, start_at, course_ids")
    .eq("id", learningPathId)
    .maybeSingle();

  if (lpError) {
    throw new ExternalServiceError("Unable to load learning path for scheduling", {
      code: lpError.code,
      details: lpError.message,
    });
  }

  if (!learningPath || !learningPath.start_at) return;
  const courseIds = Array.isArray(learningPath.course_ids)
    ? learningPath.course_ids.map((id) => String(id))
    : [];

  if (courseIds.length === 0) return;

  const { data: courses, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, topic_ids, topic_prerequisites, start_at")
    .in("id", courseIds);

  if (courseError) {
    throw new ExternalServiceError("Unable to load courses for scheduling", {
      code: courseError.code,
      details: courseError.message,
    });
  }

  for (const course of courses ?? []) {
    await scheduleCourseTopics({
      courseId: course.id,
      topicIds: course.topic_ids ?? [],
      topicPrerequisites: course.topic_prerequisites ?? {},
      topicCorequisites: {},
      startAtOverride: learningPath.start_at,
      fallbackStartAt: course.start_at ?? null,
      updatedBy,
    });
  }
};

const scheduleCoursesForTopic = async ({ topicId, updatedBy }) => {
  if (!topicId) return;
  const { data: courses, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, topic_ids, topic_prerequisites, start_at")
    .contains("topic_ids", [String(topicId)]);

  if (courseError) {
    throw new ExternalServiceError("Unable to load courses for topic scheduling", {
      code: courseError.code,
      details: courseError.message,
    });
  }

  for (const course of courses ?? []) {
    await scheduleCourseTopics({
      courseId: course.id,
      topicIds: course.topic_ids ?? [],
      topicPrerequisites: course.topic_prerequisites ?? {},
      topicCorequisites: {},
      fallbackStartAt: course.start_at ?? null,
      updatedBy,
    });
  }
};

module.exports = {
  scheduleService: { scheduleCourseTopics, scheduleLearningPathCourses, scheduleCoursesForTopic },
};
