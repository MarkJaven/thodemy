const { supabaseAdmin } = require("../config/supabase");
const { AppError, ExternalServiceError } = require("../utils/errors");
const { scheduleService } = require("./scheduleService");

let cachedExcelJs = null;

const getExcelJs = () => {
  if (cachedExcelJs) return cachedExcelJs;
  try {
    // Lazily load ExcelJS so the server can still start even if the dependency
    // isn't installed (only the XLSX export route depends on it).
    cachedExcelJs = require("exceljs");
    return cachedExcelJs;
  } catch (error) {
    throw new AppError(
      "Excel export is unavailable because the 'exceljs' dependency is missing.",
      500,
      "DEPENDENCY_MISSING",
      { dependency: "exceljs", originalError: error.message }
    );
  }
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatUserName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
  profile?.username ||
  profile?.email ||
  "";

const chunk = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const fetchInChunks = async (items, size, handler) => {
  const chunks = chunk(items, size);
  const results = [];
  for (const part of chunks) {
    if (part.length === 0) continue;
    const data = await handler(part);
    results.push(...(data ?? []));
  }
  return results;
};

const dedupeIds = (ids) =>
  Array.from(
    new Set((Array.isArray(ids) ? ids : []).map((id) => String(id)).filter(Boolean))
  );

const mergeRelationMaps = (...maps) => {
  const merged = new Map();
  maps.forEach((map) => {
    if (!map || typeof map !== "object") return;
    Object.entries(map).forEach(([topicId, linkedIds]) => {
      const values = Array.isArray(linkedIds)
        ? linkedIds.map(String).filter(Boolean)
        : [];
      if (values.length === 0) return;
      if (!merged.has(topicId)) merged.set(topicId, new Set());
      const bucket = merged.get(topicId);
      values.forEach((value) => bucket.add(value));
    });
  });

  return Array.from(merged.entries()).reduce((acc, [topicId, values]) => {
    const list = Array.from(values);
    if (list.length > 0) acc[topicId] = list;
    return acc;
  }, {});
};

const normalizeGroupName = (value, fallbackLabel) => {
  const normalized = String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallbackLabel;
};

const normalizeTopicGroups = (course) => {
  const orderedTopicIds = dedupeIds(course?.topic_ids);
  if (orderedTopicIds.length === 0) {
    return [];
  }

  if (!Array.isArray(course?.topic_groups) || course.topic_groups.length === 0) {
    return [];
  }

  const indexById = new Map(orderedTopicIds.map((id, index) => [id, index]));
  const claimed = new Set();
  let fallbackIndex = 1;
  const groups = [];
  course.topic_groups.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const topicIds = dedupeIds(entry.topic_ids)
      .filter((topicId) => indexById.has(topicId))
      .filter((topicId) => !claimed.has(topicId));
    if (topicIds.length < 2) return;

    topicIds.sort((left, right) => indexById.get(left) - indexById.get(right));
    topicIds.forEach((topicId) => claimed.add(topicId));

    groups.push({
      name: normalizeGroupName(entry.name, `Grouped Topics ${fallbackIndex}`),
      topic_ids: topicIds,
      firstIndex: indexById.get(topicIds[0]) ?? Number.MAX_SAFE_INTEGER,
    });
    fallbackIndex += 1;
  });

  groups.sort((left, right) => left.firstIndex - right.firstIndex);
  return groups.map((group, index) => ({
    name: normalizeGroupName(group.name, `Grouped Topics ${index + 1}`),
    topic_ids: group.topic_ids,
  }));
};

const buildGroupedTopicNameMap = (course) => {
  const groupedByTopic = new Map();
  normalizeTopicGroups(course).forEach((group) => {
    group.topic_ids.forEach((topicId) => {
      groupedByTopic.set(topicId, group.name);
    });
  });
  return groupedByTopic;
};

const buildPrereqMapFromTopicGroups = (topicIds, topicGroups) => {
  if (!Array.isArray(topicGroups) || topicGroups.length === 0) return {};
  const keepSet = new Set((Array.isArray(topicIds) ? topicIds : []).map(String));
  const indexById = new Map((Array.isArray(topicIds) ? topicIds : []).map((id, index) => [id, index]));
  const edges = new Map();

  topicGroups.forEach((group) => {
    const members = Array.from(
      new Set(
        (Array.isArray(group?.topic_ids) ? group.topic_ids : [])
          .map(String)
          .filter((topicId) => keepSet.has(topicId))
      )
    );
    if (members.length < 2) return;
    members.sort(
      (left, right) =>
        (indexById.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (indexById.get(right) ?? Number.MAX_SAFE_INTEGER)
    );
    for (let index = 1; index < members.length; index += 1) {
      const topicId = members[index];
      const prerequisiteId = members[index - 1];
      if (!topicId || !prerequisiteId || topicId === prerequisiteId) continue;
      if (!edges.has(topicId)) edges.set(topicId, new Set());
      edges.get(topicId).add(prerequisiteId);
    }
  });

  return Array.from(edges.entries()).reduce((acc, [topicId, prereqs]) => {
    const values = Array.from(prereqs);
    if (values.length > 0) acc[topicId] = values;
    return acc;
  }, {});
};

const buildTargetTopicScheduleForEnrollment = ({
  enrollment,
  learningPath,
  courseMap,
  topicsById,
}) => {
  const scheduled = new Map();
  if (!learningPath) return scheduled;

  const startDate =
    parseDate(enrollment?.target_start_date) ||
    parseDate(enrollment?.start_date) ||
    null;
  if (!startDate) return scheduled;

  let cursor = { date: startDate, remainingHours: 8 };

  (Array.isArray(learningPath.course_ids) ? learningPath.course_ids : []).forEach((courseId) => {
    const course = courseMap.get(String(courseId));
    if (!course) return;

    const topicIds = Array.isArray(course.topic_ids) ? course.topic_ids.map(String) : [];
    if (topicIds.length === 0) return;

    const groupPrereqMap = buildPrereqMapFromTopicGroups(topicIds, course.topic_groups);
    const mergedPrereqMap = mergeRelationMaps(
      course.topic_prerequisites ?? {},
      groupPrereqMap
    );
    const result = scheduleService.computeCourseTopicSchedule({
      startCursor: cursor,
      topicIds,
      topicsById,
      topicPrerequisites: mergedPrereqMap,
      topicCorequisites: {},
    });

    if (result?.topicSchedule) {
      result.topicSchedule.forEach((value, topicId) => {
        scheduled.set(String(topicId), value);
      });
    }
    if (result?.endCursor) {
      cursor = result.endCursor;
    }
  });

  return scheduled;
};

const loadChecklistUsers = async ({ userId } = {}) => {
  let profileQuery = supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, username, email, created_at");
  if (userId) {
    profileQuery = profileQuery.eq("id", userId);
  }
  const { data: profiles, error: profileError } = await profileQuery;
  if (profileError) {
    throw new ExternalServiceError("Unable to load user profiles for checklist export", {
      code: profileError.code,
      details: profileError.message,
    });
  }

  let roleQuery = supabaseAdmin.from("user_roles").select("user_id, role");
  if (userId) {
    roleQuery = roleQuery.eq("user_id", userId);
  }
  const { data: roles, error: roleError } = await roleQuery;
  if (roleError) {
    throw new ExternalServiceError("Unable to load user roles for checklist export", {
      code: roleError.code,
      details: roleError.message,
    });
  }

  const roleMap = new Map((roles ?? []).map((entry) => [entry.user_id, entry.role]));
  const normalized = (profiles ?? []).map((profile) => ({
    id: profile.id,
    role: roleMap.get(profile.id) || "user",
    userName: formatUserName(profile),
    userEmail: profile.email || "",
    createdAt: profile.created_at || "",
  }));

  const filtered = userId
    ? normalized
    : normalized.filter((entry) => entry.role === "user");

  return filtered.sort((left, right) => {
    const leftName = String(left.userName || left.userEmail || "").toLowerCase();
    const rightName = String(right.userName || right.userEmail || "").toLowerCase();
    if (leftName && rightName && leftName !== rightName) {
      return leftName.localeCompare(rightName);
    }
    return String(left.createdAt || "").localeCompare(String(right.createdAt || ""));
  });
};

const loadUserChecklistRows = async ({ userId } = {}) => {
  let enrollmentQuery = supabaseAdmin
    .from("learning_path_enrollments")
    .select(
      "id, user_id, learning_path_id, status, enrolled_at, start_date, end_date, target_start_date, target_end_date, actual_start_date, actual_end_date"
    )
    .order("enrolled_at", { ascending: false });
  if (userId) {
    enrollmentQuery = enrollmentQuery.eq("user_id", userId);
  }
  const { data: enrollments, error: enrollmentError } = await enrollmentQuery;
  if (enrollmentError) {
    throw new ExternalServiceError("Unable to load learning path enrollments", {
      code: enrollmentError.code,
      details: enrollmentError.message,
    });
  }

  const enrollmentRows = enrollments ?? [];
  if (enrollmentRows.length === 0) {
    return [];
  }

  const learningPathIds = Array.from(
    new Set(enrollmentRows.map((row) => row.learning_path_id).filter(Boolean))
  );
  const userIds = Array.from(new Set(enrollmentRows.map((row) => row.user_id).filter(Boolean)));

  const learningPaths = await fetchInChunks(learningPathIds, 200, async (ids) => {
    const { data, error } = await supabaseAdmin
      .from("learning_paths")
      .select("id, title, course_ids")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load learning paths", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const learningPathMap = new Map((learningPaths ?? []).map((lp) => [String(lp.id), lp]));

  const courseIds = Array.from(
    new Set(
      (learningPaths ?? [])
        .flatMap((lp) => lp.course_ids ?? [])
        .map((id) => String(id))
    )
  );

  const courses = await fetchInChunks(courseIds, 200, async (ids) => {
    const { data, error } = await supabaseAdmin
      .from("courses")
      .select("id, title, topic_ids, topic_prerequisites, topic_groups")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load courses", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const courseMap = new Map((courses ?? []).map((course) => [String(course.id), course]));

  const topicIds = Array.from(
    new Set(
      (courses ?? [])
        .flatMap((course) => course.topic_ids ?? [])
        .map((id) => String(id))
    )
  );

  const topics = await fetchInChunks(topicIds, 200, async (ids) => {
    const { data, error } = await supabaseAdmin
      .from("topics")
      .select("id, title, start_date, end_date, time_allocated, time_unit")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load topics", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const topicMap = new Map((topics ?? []).map((topic) => [String(topic.id), topic]));
  const scheduleTopicMap = new Map(
    (topics ?? []).map((topic) => [
      String(topic.id),
      {
        id: String(topic.id),
        time_allocated: topic.time_allocated,
        time_unit: topic.time_unit,
      },
    ])
  );

  const profiles = await fetchInChunks(userIds, 200, async (ids) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load profiles", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const topicProgress = await fetchInChunks(userIds, 200, async (ids) => {
    if (topicIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("topic_progress")
      .select("id, user_id, topic_id, status, start_date, end_date")
      .in("user_id", ids)
      .in("topic_id", topicIds);
    if (error) {
      throw new ExternalServiceError("Unable to load topic progress", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const progressMap = new Map(
    (topicProgress ?? []).map((entry) => [`${entry.user_id}:${entry.topic_id}`, entry])
  );

  const topicSubmissions = await fetchInChunks(userIds, 200, async (ids) => {
    if (topicIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("topic_submissions")
      .select("user_id, topic_id, review_notes, reviewed_at, updated_at")
      .in("user_id", ids)
      .in("topic_id", topicIds);
    if (error) {
      throw new ExternalServiceError("Unable to load topic submissions", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const notesMap = new Map();
  (topicSubmissions ?? []).forEach((submission) => {
    const key = `${submission.user_id}:${submission.topic_id}`;
    const existing = notesMap.get(key);
    const incomingDate = new Date(submission.reviewed_at || submission.updated_at || 0).getTime();
    const existingDate = existing
      ? new Date(existing.reviewed_at || existing.updated_at || 0).getTime()
      : 0;
    if (!existing || incomingDate >= existingDate) {
      notesMap.set(key, submission);
    }
  });

  const rows = [];

  for (const enrollment of enrollmentRows) {
    const profile = profileMap.get(enrollment.user_id) || {};
    const userName = formatUserName(profile);
    const userEmail = profile.email || "";
    const learningPath = learningPathMap.get(String(enrollment.learning_path_id));
    const learningPathTitle = learningPath?.title || "";
    const enrollmentStatus = enrollment.status || "";
    const pathCourseIds = Array.isArray(learningPath?.course_ids)
      ? learningPath.course_ids.map(String)
      : [];
    const targetTopicScheduleById = buildTargetTopicScheduleForEnrollment({
      enrollment,
      learningPath,
      courseMap,
      topicsById: scheduleTopicMap,
    });

    for (const courseId of pathCourseIds) {
      const course = courseMap.get(String(courseId));
      const courseTitle = course?.title || "";
      const courseTopicIds = Array.isArray(course?.topic_ids) ? course.topic_ids.map(String) : [];
      const groupedTopicNameMap = buildGroupedTopicNameMap(course);

      for (const topicId of courseTopicIds) {
        const topic = topicMap.get(String(topicId));
        const topicTitle = topic?.title || "";
        const groupedTopicName = groupedTopicNameMap.get(String(topicId)) || topicTitle;
        const progress = progressMap.get(`${enrollment.user_id}:${topicId}`);
        const status = progress?.status || "";
        const targetSchedule = targetTopicScheduleById.get(String(topicId));
        const topicTargetStartDate = formatDate(targetSchedule?.start);
        const topicTargetEndDate = formatDate(targetSchedule?.end);
        const topicActualStartDate = formatDate(progress?.start_date);
        const topicActualEndDate = formatDate(progress?.end_date);
        const notesEntry = notesMap.get(`${enrollment.user_id}:${topicId}`);
        const notes = notesEntry?.review_notes || "";
        rows.push({
          userId: enrollment.user_id,
          userName,
          userEmail,
          learningPathTitle,
          enrollmentStatus,
          courseTitle,
          groupedTopicName,
          topicTitle,
          status,
          topicTargetStartDate,
          topicTargetEndDate,
          topicActualStartDate,
          topicActualEndDate,
          notes,
        });
      }
    }
  }

  return rows;
};

const buildChecklistFileName = ({ rows, ext }) => {
  const dateToken = new Date().toISOString().slice(0, 10);
  const uniqueNames = Array.from(new Set(rows.map((row) => row.userName).filter(Boolean)));
  let baseName = "users";
  if (uniqueNames.length === 1) {
    baseName = uniqueNames[0];
  } else if (uniqueNames.length > 1) {
    baseName = "multiple_users";
  }
  const safeName = String(baseName)
    .replace(/[^A-Za-z0-9\s_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const nameToken = safeName || "users";
  return `${nameToken}_checklist_${dateToken}.${ext}`;
};

const buildUserChecklistCsv = async ({ userId } = {}) => {
  const rows = await loadUserChecklistRows({ userId });
  const includeUserColumns = !userId;
  const header = includeUserColumns
      ? [
          "Name",
          "Email",
          "Learning Path",
          "Status",
          "Course Name",
          "Grouped Topics",
          "Topic Name",
          "Topic Status",
          "Target Start Date",
          "Target End Date",
          "Actual Start Date",
          "Actual End Date",
          "Remarks",
        ]
      : [
          "Course Name",
          "Grouped Topics",
          "Topic Name",
          "Topic Status",
          "Target Start Date",
          "Target End Date",
          "Actual Start Date",
          "Actual End Date",
          "Remarks",
        ];
  const fileName = buildChecklistFileName({ rows, ext: "csv" });
  if (rows.length === 0) {
    return { csv: `\ufeff${header.map(csvEscape).join(",")}\n`, fileName };
  }

  const lines = [`\ufeff${header.map(csvEscape).join(",")}`];
  rows.forEach((row) => {
    const baseColumns = [
      row.courseTitle,
      row.groupedTopicName,
      row.topicTitle,
      row.status,
      row.topicTargetStartDate,
      row.topicTargetEndDate,
      row.topicActualStartDate,
      row.topicActualEndDate,
      row.notes,
    ];
    const columns = includeUserColumns
      ? [
          row.userName,
          row.userEmail,
          row.learningPathTitle,
          row.enrollmentStatus,
          ...baseColumns,
        ]
      : baseColumns;
    lines.push(columns.map(csvEscape).join(","));
  });

  return { csv: `${lines.join("\n")}\n`, fileName };
};

const CHECKLIST_HEADER_LABELS = [
  "Course Name",
  "Grouped Topics",
  "Topic Name",
  "Topic Status",
  "Target Start Date",
  "Target End Date",
  "Actual Start Date",
  "Actual End Date",
  "Remarks",
];

const CHECKLIST_COLUMNS = [
  { key: "courseTitle", width: 28 },
  { key: "groupedTopicName", width: 24 },
  { key: "topicTitle", width: 36 },
  { key: "status", width: 14 },
  { key: "topicTargetStartDate", width: 18 },
  { key: "topicTargetEndDate", width: 18 },
  { key: "topicActualStartDate", width: 18 },
  { key: "topicActualEndDate", width: 18 },
  { key: "notes", width: 30 },
];

const sanitizeSheetName = (value) => {
  const cleaned = String(value || "")
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "User Checklist";
};

const buildUniqueSheetName = (baseName, usedNames) => {
  const normalizedBase = sanitizeSheetName(baseName);
  const baseTrimmed = normalizedBase.slice(0, 31) || "User Checklist";
  const register = (name) => {
    usedNames.add(name.toLowerCase());
    return name;
  };
  if (!usedNames.has(baseTrimmed.toLowerCase())) {
    return register(baseTrimmed);
  }

  let suffix = 2;
  while (suffix < 10000) {
    const suffixText = ` (${suffix})`;
    const basePart = baseTrimmed.slice(0, Math.max(1, 31 - suffixText.length)).trim();
    const candidate = `${basePart}${suffixText}`;
    if (!usedNames.has(candidate.toLowerCase())) {
      return register(candidate);
    }
    suffix += 1;
  }
  return register(`User Checklist (${Date.now() % 1000})`.slice(0, 31));
};

const applyHeaderStyle = (row) => {
  row.eachCell((cell) => {
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4C9A2A" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
};

const applyAllBorders = (sheet) => {
  const rowCount = sheet.rowCount;
  const columnCount = sheet.columnCount;
  const border = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    for (let colIndex = 1; colIndex <= columnCount; colIndex += 1) {
      const cell = row.getCell(colIndex);
      cell.border = border;
    }
  }
};

const applyRowStyle = (row, fillColor) => {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
    cell.alignment = { vertical: "top", wrapText: true };
    if (fillColor) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    }
  });
};

const populateUserChecklistSheet = (sheet, rows, userSummary = {}) => {
  const summaryUserName = userSummary.userName || rows[0]?.userName || "";
  const summaryUserEmail = userSummary.userEmail || rows[0]?.userEmail || "";
  const uniqueLearningPaths = Array.from(
    new Set(rows.map((row) => row.learningPathTitle).filter(Boolean))
  );
  const uniqueStatuses = Array.from(
    new Set(rows.map((row) => row.enrollmentStatus).filter(Boolean))
  );
  const summaryLearningPath =
    uniqueLearningPaths.length === 1
      ? uniqueLearningPaths[0]
      : uniqueLearningPaths.length > 1
        ? "Multiple"
        : "";
  const summaryStatus =
    uniqueStatuses.length === 1
      ? uniqueStatuses[0]
      : uniqueStatuses.length > 1
        ? "Multiple"
        : "";

  sheet.columns = CHECKLIST_COLUMNS.map((column) => ({ ...column }));

  const infoRows = [
    ["Name", summaryUserName],
    ["Email", summaryUserEmail],
    ["Learning Path", summaryLearningPath],
    ["Status", summaryStatus],
  ];

  infoRows.forEach((entry, index) => {
    const rowIndex = 1 + index;
    const labelCell = sheet.getCell(rowIndex, 1);
    labelCell.value = entry[0];
    labelCell.font = { bold: true };
    labelCell.alignment = { vertical: "middle", horizontal: "left" };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE9F6E4" },
    };
    labelCell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };

    const valueCell = sheet.getCell(rowIndex, 2);
    valueCell.value = entry[1];
    valueCell.alignment = { vertical: "middle", horizontal: "left" };
    valueCell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  sheet.getRow(6).values = CHECKLIST_HEADER_LABELS;
  const headerRow = sheet.getRow(6);
  headerRow.height = 24;
  applyHeaderStyle(headerRow);

  const dataStartRow = 7;
  let currentCourse = null;
  let courseIndex = -1;

  rows.forEach((row) => {
    const rowData = {
      ...row,
      topicTargetStartDate: row.topicTargetStartDate ? new Date(row.topicTargetStartDate) : null,
      topicTargetEndDate: row.topicTargetEndDate ? new Date(row.topicTargetEndDate) : null,
      topicActualStartDate: row.topicActualStartDate ? new Date(row.topicActualStartDate) : null,
      topicActualEndDate: row.topicActualEndDate ? new Date(row.topicActualEndDate) : null,
    };
    const worksheetRow = sheet.addRow(rowData);
    const targetStartCell = worksheetRow.getCell("topicTargetStartDate");
    const targetEndCell = worksheetRow.getCell("topicTargetEndDate");
    const actualStartCell = worksheetRow.getCell("topicActualStartDate");
    const actualEndCell = worksheetRow.getCell("topicActualEndDate");
    if (rowData.topicTargetStartDate) {
      targetStartCell.numFmt = "mm/dd/yyyy";
    }
    if (rowData.topicTargetEndDate) {
      targetEndCell.numFmt = "mm/dd/yyyy";
    }
    if (rowData.topicActualStartDate) {
      actualStartCell.numFmt = "mm/dd/yyyy";
    }
    if (rowData.topicActualEndDate) {
      actualEndCell.numFmt = "mm/dd/yyyy";
    }
    const statusCell = worksheetRow.getCell("status");
    statusCell.font = { bold: true, underline: true };
    if (row.courseTitle !== currentCourse) {
      currentCourse = row.courseTitle;
      courseIndex += 1;
    }
    const fillColor = courseIndex % 2 === 1 ? "FFE4F5D7" : null;
    applyRowStyle(worksheetRow, fillColor);

    if (!rowData.topicTargetStartDate) {
      targetStartCell.value = "-";
      targetStartCell.font = { color: { argb: "FF64748B" } };
      targetStartCell.alignment = { vertical: "middle", horizontal: "center" };
    }
    if (!rowData.topicTargetEndDate) {
      targetEndCell.value = "-";
      targetEndCell.font = { color: { argb: "FF64748B" } };
      targetEndCell.alignment = { vertical: "middle", horizontal: "center" };
    }
    if (!rowData.topicActualStartDate) {
      actualStartCell.value = "-";
      actualStartCell.font = { color: { argb: "FF64748B" } };
      actualStartCell.alignment = { vertical: "middle", horizontal: "center" };
    }
    if (!rowData.topicActualEndDate) {
      actualEndCell.value = "-";
      actualEndCell.font = { color: { argb: "FF64748B" } };
      actualEndCell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  if (rows.length > 0) {
    const courseColumnIndex = sheet.columns.findIndex((col) => col.key === "courseTitle") + 1;
    const groupedColumnIndex = sheet.columns.findIndex((col) => col.key === "groupedTopicName") + 1;
    let mergeStart = dataStartRow;
    let currentValue = sheet.getCell(dataStartRow, courseColumnIndex).value;
    for (let rowIndex = dataStartRow + 1; rowIndex < dataStartRow + rows.length; rowIndex += 1) {
      const cellValue = sheet.getCell(rowIndex, courseColumnIndex).value;
      if (cellValue !== currentValue) {
        if (rowIndex - 1 > mergeStart) {
          sheet.mergeCells(mergeStart, courseColumnIndex, rowIndex - 1, courseColumnIndex);
          const mergedCell = sheet.getCell(mergeStart, courseColumnIndex);
          mergedCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }
        mergeStart = rowIndex;
        currentValue = cellValue;
      }
    }
    if (dataStartRow + rows.length - 1 > mergeStart) {
      sheet.mergeCells(
        mergeStart,
        courseColumnIndex,
        dataStartRow + rows.length - 1,
        courseColumnIndex
      );
      const mergedCell = sheet.getCell(mergeStart, courseColumnIndex);
      mergedCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    }

    if (groupedColumnIndex > 0) {
      let runStart = 0;
      while (runStart < rows.length) {
        const runValue = rows[runStart]?.groupedTopicName || "";
        const runCourse = rows[runStart]?.courseTitle || "";
        let runEnd = runStart;
        while (
          runEnd + 1 < rows.length &&
          (rows[runEnd + 1]?.groupedTopicName || "") === runValue &&
          (rows[runEnd + 1]?.courseTitle || "") === runCourse
        ) {
          runEnd += 1;
        }

        if (runValue && runEnd > runStart) {
          const startRow = dataStartRow + runStart;
          const endRow = dataStartRow + runEnd;
          sheet.mergeCells(startRow, groupedColumnIndex, endRow, groupedColumnIndex);
          const groupedCell = sheet.getCell(startRow, groupedColumnIndex);
          groupedCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }

        runStart = runEnd + 1;
      }
    }
  }

  applyAllBorders(sheet);
};

const buildUserChecklistWorkbook = async ({ userId } = {}) => {
  const [rows, users] = await Promise.all([
    loadUserChecklistRows({ userId }),
    loadChecklistUsers({ userId }),
  ]);
  const ExcelJS = getExcelJs();
  const workbook = new ExcelJS.Workbook();
  const rowsByUserId = new Map();

  rows.forEach((row, index) => {
    const fallbackKey = `${row.userName || ""}|${row.userEmail || ""}`;
    const key = row.userId
      ? String(row.userId)
      : fallbackKey !== "|"
        ? fallbackKey
        : `unknown-${index}`;
    if (!rowsByUserId.has(key)) {
      rowsByUserId.set(key, []);
    }
    rowsByUserId.get(key).push(row);
  });

  if (userId) {
    const summary = users[0] || { id: userId, userName: "", userEmail: "" };
    const scopedRows = rowsByUserId.get(String(summary.id)) || rows;
    const sheet = workbook.addWorksheet("User Checklist");
    populateUserChecklistSheet(sheet, scopedRows, summary);
  } else {
    const usedSheetNames = new Set();
    const renderedUserIds = new Set();

    users.forEach((user) => {
      const userKey = String(user.id);
      renderedUserIds.add(userKey);
      const userRows = rowsByUserId.get(userKey) || [];
      const displayName = user.userName || user.userEmail || userKey || "User Checklist";
      const sheetName = buildUniqueSheetName(displayName, usedSheetNames);
      const sheet = workbook.addWorksheet(sheetName);
      populateUserChecklistSheet(sheet, userRows, user);
    });

    rowsByUserId.forEach((userRows, key) => {
      if (renderedUserIds.has(key)) return;
      const userSummary = {
        id: key,
        userName: userRows[0]?.userName || "",
        userEmail: userRows[0]?.userEmail || "",
      };
      const displayName = userSummary.userName || userSummary.userEmail || key;
      const sheetName = buildUniqueSheetName(displayName, usedSheetNames);
      const sheet = workbook.addWorksheet(sheetName);
      populateUserChecklistSheet(sheet, userRows, userSummary);
    });

    if (workbook.worksheets.length === 0) {
      const emptySheet = workbook.addWorksheet("User Checklist");
      populateUserChecklistSheet(emptySheet, []);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = buildChecklistFileName({ rows, ext: "xlsx" });
  return { buffer, fileName };
};

const appendChecklistSheetToWorkbook = async (
  workbook,
  { userId, sheetName = "Checklist" } = {}
) => {
  if (!workbook) {
    throw new AppError("Unable to append checklist sheet without a workbook.", 500, "EXPORT_WORKBOOK_REQUIRED");
  }

  const [rows, users] = await Promise.all([
    loadUserChecklistRows({ userId }),
    loadChecklistUsers({ userId }),
  ]);

  const rowsByUserId = new Map();
  rows.forEach((row, index) => {
    const fallbackKey = `${row.userName || ""}|${row.userEmail || ""}`;
    const key = row.userId
      ? String(row.userId)
      : fallbackKey !== "|"
        ? fallbackKey
        : `unknown-${index}`;
    if (!rowsByUserId.has(key)) {
      rowsByUserId.set(key, []);
    }
    rowsByUserId.get(key).push(row);
  });

  const existingSheet = workbook.getWorksheet(sheetName);
  if (existingSheet) {
    workbook.removeWorksheet(existingSheet.id);
  }

  const summary = userId ? users[0] || { id: userId, userName: "", userEmail: "" } : users[0] || {};
  const scopedRows = userId ? rowsByUserId.get(String(summary.id)) || rows : rows;
  const sheet = workbook.addWorksheet(sheetName);
  populateUserChecklistSheet(sheet, scopedRows, summary);
  return sheet;
};

module.exports = {
  adminReportService: {
    buildUserChecklistCsv,
    buildUserChecklistWorkbook,
    appendChecklistSheetToWorkbook,
  },
};
