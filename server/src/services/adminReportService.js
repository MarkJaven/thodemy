const { supabaseAdmin } = require("../config/supabase");
const { AppError, ExternalServiceError } = require("../utils/errors");

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
    .select("id, user_id, learning_path_id, status, enrolled_at, start_date, end_date")
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

  const learningPathMap = new Map((learningPaths ?? []).map((lp) => [lp.id, lp]));

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
      .select("id, title, topic_ids")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load courses", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const courseMap = new Map((courses ?? []).map((course) => [course.id, course]));

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
      .select("id, title, start_date, end_date")
      .in("id", ids);
    if (error) {
      throw new ExternalServiceError("Unable to load topics", {
        code: error.code,
        details: error.message,
      });
    }
    return data;
  });

  const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic]));

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
    const learningPath = learningPathMap.get(enrollment.learning_path_id);
    const learningPathTitle = learningPath?.title || "";
    const enrollmentStatus = enrollment.status || "";
    const pathCourseIds = learningPath?.course_ids ?? [];

    for (const courseId of pathCourseIds) {
      const course = courseMap.get(courseId);
      const courseTitle = course?.title || "";
      const courseTopicIds = course?.topic_ids ?? [];

      for (const topicId of courseTopicIds) {
        const topic = topicMap.get(topicId);
        const topicTitle = topic?.title || "";
        const progress = progressMap.get(`${enrollment.user_id}:${topicId}`);
        const status = progress?.status || "";
        const topicStartDate = formatDate(progress?.start_date);
        const topicEndDate = formatDate(progress?.end_date);
        const notesEntry = notesMap.get(`${enrollment.user_id}:${topicId}`);
        const notes = notesEntry?.review_notes || "";
        rows.push({
          userId: enrollment.user_id,
          userName,
          userEmail,
          learningPathTitle,
          enrollmentStatus,
          courseTitle,
          topicTitle,
          status,
          topicStartDate,
          topicEndDate,
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
        "Topic Name",
        "Topic Status",
        "Topic Start Date",
        "Topic End Date",
        "Remarks",
      ]
    : [
        "Course Name",
        "Topic Name",
        "Topic Status",
        "Topic Start Date",
        "Topic End Date",
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
      row.topicTitle,
      row.status,
      row.topicStartDate,
      row.topicEndDate,
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
  "Topic Name",
  "Topic Status",
  "Topic Start Date",
  "Topic End Date",
  "Remarks",
];

const CHECKLIST_COLUMNS = [
  { key: "courseTitle", width: 28 },
  { key: "topicTitle", width: 36 },
  { key: "status", width: 14 },
  { key: "topicStartDate", width: 16 },
  { key: "topicEndDate", width: 16 },
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
      topicStartDate: row.topicStartDate ? new Date(row.topicStartDate) : null,
      topicEndDate: row.topicEndDate ? new Date(row.topicEndDate) : null,
    };
    const worksheetRow = sheet.addRow(rowData);
    const startCell = worksheetRow.getCell("topicStartDate");
    const endCell = worksheetRow.getCell("topicEndDate");
    if (rowData.topicStartDate) {
      startCell.numFmt = "mm/dd/yyyy";
    }
    if (rowData.topicEndDate) {
      endCell.numFmt = "mm/dd/yyyy";
    }
    const statusCell = worksheetRow.getCell("status");
    statusCell.font = { bold: true, underline: true };
    if (row.courseTitle !== currentCourse) {
      currentCourse = row.courseTitle;
      courseIndex += 1;
    }
    const fillColor = courseIndex % 2 === 1 ? "FFE4F5D7" : null;
    applyRowStyle(worksheetRow, fillColor);

    if (!rowData.topicStartDate) {
      startCell.value = "-";
      startCell.font = { color: { argb: "FF64748B" } };
      startCell.alignment = { vertical: "middle", horizontal: "center" };
    }
    if (!rowData.topicEndDate) {
      endCell.value = "-";
      endCell.font = { color: { argb: "FF64748B" } };
      endCell.alignment = { vertical: "middle", horizontal: "center" };
    }
  });

  if (rows.length > 0) {
    const courseColumnIndex = sheet.columns.findIndex((col) => col.key === "courseTitle") + 1;
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

module.exports = {
  adminReportService: { buildUserChecklistCsv, buildUserChecklistWorkbook },
};
