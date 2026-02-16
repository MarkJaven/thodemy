/**
 * Admin Report Service
 *
 * This service handles the generation of comprehensive learning progress reports for administrators.
 * It exports detailed user checklist data showing course enrollments, learning path progress,
 * topic completion status, and review notes in both CSV and Excel formats.
 *
 * Key Features:
 * - Aggregates data from multiple database tables (profiles, enrollments, courses, topics, progress)
 * - Supports single-user and multi-user report exports
 * - CSV exports with UTF-8 BOM for proper Excel compatibility
 * - Excel workbooks with formatted sheets, merged cells, and alternating row colors
 * - Efficient batch processing to handle large datasets without hitting query limits
 *
 * @module services/adminReportService
 */

const { supabaseAdmin } = require("../config/supabase");
const { AppError, ExternalServiceError } = require("../utils/errors");

let cachedExcelJs = null;

/**
 * Lazy-loads and caches the ExcelJS library to optimize server startup time.
 *
 * This function only loads the ExcelJS dependency when Excel export functionality is needed,
 * allowing the server to start successfully even if the library isn't installed.
 * The library is cached after first load to avoid repeated require() calls.
 *
 * @returns {Object} The ExcelJS library instance
 * @throws {AppError} Throws a DEPENDENCY_MISSING error if the exceljs package is not installed
 *
 * @example
 * const ExcelJS = getExcelJs();
 * const workbook = new ExcelJS.Workbook();
 */
const getExcelJs = () => {
  if (cachedExcelJs) return cachedExcelJs;
  try {
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

/**
 * Escapes a value for safe inclusion in CSV files according to RFC 4180 standards.
 *
 * This function handles special characters that could break CSV formatting:
 * - Wraps values containing commas, quotes, or newlines in double quotes
 * - Escapes internal double quotes by doubling them (" becomes "")
 * - Converts null/undefined to empty strings
 *
 * @param {*} value - The value to escape (can be any type, will be converted to string)
 * @returns {string} The escaped CSV-safe string
 *
 * @example
 * csvEscape('Hello, World')  // Returns: "Hello, World"
 * csvEscape('He said "Hi"')  // Returns: "He said ""Hi"""
 * csvEscape('Simple text')   // Returns: Simple text
 * csvEscape(null)            // Returns: ""
 */
const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

/**
 * Formats a date value into an ISO 8601 string for consistent date representation.
 *
 * This function safely converts various date inputs (Date objects, timestamps, date strings)
 * into a standardized ISO format (YYYY-MM-DDTHH:mm:ss.sssZ). Invalid dates return an empty string
 * to prevent errors in reports.
 *
 * @param {Date|string|number|null|undefined} value - The date to format
 * @returns {string} ISO 8601 formatted date string, or empty string if invalid/missing
 *
 * @example
 * formatDate('2024-01-15')           // Returns: "2024-01-15T00:00:00.000Z"
 * formatDate(new Date('2024-01-15')) // Returns: "2024-01-15T00:00:00.000Z"
 * formatDate(null)                   // Returns: ""
 * formatDate('invalid')              // Returns: ""
 */
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

/**
 * Creates a human-readable display name from a user profile with graceful fallbacks.
 *
 * The function tries multiple strategies to generate a meaningful name:
 * 1. First name + Last name (if both exist)
 * 2. Username (if name fields are missing)
 * 3. Email address (as last resort)
 * 4. Empty string (if no identifying information exists)
 *
 * @param {Object} profile - User profile object from the database
 * @param {string} [profile.first_name] - User's first name
 * @param {string} [profile.last_name] - User's last name
 * @param {string} [profile.username] - User's username
 * @param {string} [profile.email] - User's email address
 * @returns {string} The formatted display name
 *
 * @example
 * formatUserName({ first_name: 'John', last_name: 'Doe' })  // Returns: "John Doe"
 * formatUserName({ username: 'jdoe' })                      // Returns: "jdoe"
 * formatUserName({ email: 'john@example.com' })             // Returns: "john@example.com"
 */
const formatUserName = (profile) =>
  [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
  profile?.username ||
  profile?.email ||
  "";

/**
 * Splits an array into smaller chunks of a specified size for batch processing.
 *
 * This utility is essential for working with database query limits. Many databases have
 * restrictions on the number of items in an IN clause (e.g., "WHERE id IN (...)").
 * By chunking large arrays, we can process them in multiple smaller queries.
 *
 * @param {Array} items - The array to split into chunks
 * @param {number} size - Maximum number of items per chunk
 * @returns {Array<Array>} Array of chunks, where each chunk is an array of up to 'size' items
 *
 * @example
 * chunk([1, 2, 3, 4, 5], 2)  // Returns: [[1, 2], [3, 4], [5]]
 * chunk(['a', 'b', 'c'], 10) // Returns: [['a', 'b', 'c']]
 * chunk([], 5)               // Returns: []
 */
const chunk = (items, size) => {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

/**
 * Processes an array of items in batches using a custom handler function.
 *
 * This function is critical for efficiently querying large datasets without hitting database
 * query limits or causing performance issues. It splits the items into chunks, processes each
 * chunk sequentially (to avoid overwhelming the database), and aggregates all results.
 *
 * @param {Array} items - The items to process (typically IDs for database queries)
 * @param {number} size - Maximum number of items to process per batch
 * @param {Function} handler - Async function that processes one chunk and returns results
 * @returns {Promise<Array>} Combined results from all chunks
 *
 * @example
 * // Fetch user profiles in batches of 200
 * const profiles = await fetchInChunks(userIds, 200, async (ids) => {
 *   const { data } = await supabase.from('profiles').select('*').in('id', ids);
 *   return data;
 * });
 */
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

/**
 * Loads and prepares user profile data for checklist reports.
 *
 * This function fetches user profiles and their associated roles, then normalizes the data
 * for report generation. When exporting all users, it filters to show only regular users
 * (excluding admins/superadmins). The results are sorted alphabetically by name or email,
 * with creation date as a secondary sort key.
 *
 * @param {Object} [options={}] - Query options
 * @param {string} [options.userId] - Optional user ID to fetch a single user's data
 * @returns {Promise<Array<Object>>} Array of normalized user objects with profile and role data
 * @returns {string} return[].id - User's unique identifier
 * @returns {string} return[].role - User's role (user, admin, superadmin)
 * @returns {string} return[].userName - Formatted display name
 * @returns {string} return[].userEmail - User's email address
 * @returns {string} return[].createdAt - Account creation timestamp
 * @throws {ExternalServiceError} If database queries fail
 *
 * @example
 * // Get all regular users
 * const users = await loadChecklistUsers();
 *
 * // Get a specific user
 * const user = await loadChecklistUsers({ userId: '123' });
 */
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

/**
 * Aggregates comprehensive learning progress data for user checklist reports.
 *
 * This is the main data loading function that orchestrates fetching and combining data from
 * multiple database tables to create a complete picture of user learning progress. It performs
 * the following operations:
 *
 * 1. Fetches learning path enrollments for users
 * 2. Loads all related learning paths, courses, and topics
 * 3. Retrieves topic-level progress and submission data
 * 4. Joins all data into flattened rows (one row per user-topic combination)
 * 5. Uses batch processing to efficiently handle large datasets
 *
 * The resulting data structure shows every topic within every course within every learning path
 * that users are enrolled in, along with their progress status and review notes.
 *
 * @param {Object} [options={}] - Query options
 * @param {string} [options.userId] - Optional user ID to filter data for a single user
 * @returns {Promise<Array<Object>>} Flattened array of user-topic progress rows
 * @returns {string} return[].userId - User's unique identifier
 * @returns {string} return[].userName - Formatted user display name
 * @returns {string} return[].userEmail - User's email address
 * @returns {string} return[].learningPathTitle - Name of the learning path
 * @returns {string} return[].enrollmentStatus - User's enrollment status in the path
 * @returns {string} return[].courseTitle - Name of the course
 * @returns {string} return[].topicTitle - Name of the topic
 * @returns {string} return[].status - Topic completion status
 * @returns {string} return[].topicStartDate - When user started the topic (ISO format)
 * @returns {string} return[].topicEndDate - When user completed the topic (ISO format)
 * @returns {string} return[].notes - Review notes/feedback from instructors
 * @throws {ExternalServiceError} If any database query fails
 *
 * @example
 * // Get all user progress data
 * const allProgress = await loadUserChecklistRows();
 *
 * // Get progress for a specific user
 * const userProgress = await loadUserChecklistRows({ userId: '123' });
 */
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

/**
 * Generates a descriptive filename for checklist exports with date and user information.
 *
 * The filename follows the pattern: {user_identifier}_checklist_{date}.{ext}
 * - For single user: Uses their name (e.g., "john_doe_checklist_2024-01-15.csv")
 * - For multiple users: Uses "multiple_users" (e.g., "multiple_users_checklist_2024-01-15.xlsx")
 * - For no users: Uses "users" as default
 *
 * Special characters are sanitized to ensure filesystem compatibility across platforms.
 *
 * @param {Object} options - Filename generation options
 * @param {Array<Object>} options.rows - The data rows containing user information
 * @param {string} options.ext - File extension without the dot (e.g., "csv", "xlsx")
 * @returns {string} The generated filename
 *
 * @example
 * buildChecklistFileName({ rows: [{ userName: 'John Doe' }], ext: 'csv' })
 * // Returns: "John_Doe_checklist_2024-01-15.csv"
 *
 * buildChecklistFileName({ rows: multipleUsers, ext: 'xlsx' })
 * // Returns: "multiple_users_checklist_2024-01-15.xlsx"
 */
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

/**
 * Generates a CSV file containing user learning progress checklist data.
 *
 * This function creates a RFC 4180 compliant CSV file with UTF-8 BOM (Byte Order Mark)
 * to ensure proper character encoding when opened in Excel. The column structure adapts
 * based on whether the export is for a single user or multiple users:
 *
 * - Single user: Excludes user identification columns (name, email, etc.)
 * - All users: Includes full user identification for each row
 *
 * The UTF-8 BOM (\ufeff) is critical for Excel to correctly interpret special characters
 * in names, notes, and other text fields.
 *
 * @param {Object} [options={}] - Export options
 * @param {string} [options.userId] - Optional user ID to export data for a single user
 * @returns {Promise<Object>} CSV export result
 * @returns {string} return.csv - The complete CSV content with headers and data rows
 * @returns {string} return.fileName - Generated filename based on user(s) and current date
 *
 * @example
 * // Export all users
 * const { csv, fileName } = await buildUserChecklistCsv();
 * // csv contains: Name, Email, Learning Path, Status, Course, Topic, ...
 *
 * // Export single user
 * const { csv, fileName } = await buildUserChecklistCsv({ userId: '123' });
 * // csv contains: Course Name, Topic Name, Topic Status, ...
 */
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

/**
 * Column headers displayed in Excel worksheets for checklist reports.
 * These labels appear in the header row with green background styling.
 * @constant {string[]}
 */
const CHECKLIST_HEADER_LABELS = [
  "Course Name",
  "Topic Name",
  "Topic Status",
  "Topic Start Date",
  "Topic End Date",
  "Remarks",
];

/**
 * Column configuration for Excel worksheets including property keys and column widths.
 * The widths are set to accommodate typical content without excessive wrapping.
 * @constant {Array<Object>}
 * @property {string} key - Property name from the data object
 * @property {number} width - Column width in Excel units (approximately characters)
 */
const CHECKLIST_COLUMNS = [
  { key: "courseTitle", width: 28 },
  { key: "topicTitle", width: 36 },
  { key: "status", width: 14 },
  { key: "topicStartDate", width: 16 },
  { key: "topicEndDate", width: 16 },
  { key: "notes", width: 30 },
];

/**
 * Sanitizes a string to be used as an Excel worksheet name.
 *
 * Excel has strict requirements for sheet names:
 * - Cannot contain these characters: \ / * ? : [ ]
 * - Maximum length is 31 characters (enforced elsewhere)
 * - Cannot be empty
 *
 * This function removes invalid characters and provides a safe default if the
 * result would be empty.
 *
 * @param {*} value - The value to sanitize (converted to string)
 * @returns {string} A valid Excel sheet name
 *
 * @example
 * sanitizeSheetName('John/Doe')      // Returns: "John Doe"
 * sanitizeSheetName('Test: Report')  // Returns: "Test  Report"
 * sanitizeSheetName('')              // Returns: "User Checklist"
 */
const sanitizeSheetName = (value) => {
  const cleaned = String(value || "")
    .replace(/[\\/*?:[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "User Checklist";
};

/**
 * Generates a unique worksheet name within an Excel workbook.
 *
 * Excel doesn't allow duplicate sheet names (case-insensitive) and enforces a 31-character
 * limit. This function ensures uniqueness by:
 * 1. Starting with the sanitized base name
 * 2. Adding numeric suffixes (2), (3), etc. if duplicates exist
 * 3. Truncating to fit within the 31-character limit while preserving the suffix
 * 4. Maintaining a registry of used names (case-insensitive) to prevent collisions
 *
 * @param {string} baseName - The desired sheet name (will be sanitized)
 * @param {Set<string>} usedNames - Set of lowercase sheet names already in use (mutated by this function)
 * @returns {string} A unique sheet name that's been added to the usedNames set
 *
 * @example
 * const used = new Set();
 * buildUniqueSheetName('John Doe', used)  // Returns: "John Doe"
 * buildUniqueSheetName('John Doe', used)  // Returns: "John Doe (2)"
 * buildUniqueSheetName('John Doe', used)  // Returns: "John Doe (3)"
 */
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

/**
 * Applies professional header styling to an Excel worksheet row.
 *
 * This creates a visually distinct header with:
 * - Green background color (#4C9A2A) for brand consistency
 * - White, bold text for readability
 * - Center alignment with text wrapping
 * - Black borders around all cells
 *
 * @param {Object} row - ExcelJS Row object to style
 *
 * @example
 * const headerRow = sheet.getRow(1);
 * headerRow.values = ['Name', 'Email', 'Status'];
 * applyHeaderStyle(headerRow);
 */
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

/**
 * Applies thin black borders to all cells in an Excel worksheet.
 *
 * This function ensures a consistent, professional table appearance by adding
 * borders to every cell in the used range of the worksheet. It's typically called
 * after all content and other styling has been applied to ensure borders are
 * uniform across the entire sheet.
 *
 * @param {Object} sheet - ExcelJS Worksheet object
 *
 * @example
 * // After populating and styling a worksheet
 * applyAllBorders(sheet);
 */
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

/**
 * Applies styling to a data row in an Excel worksheet with optional alternating colors.
 *
 * This function styles data rows with:
 * - Black borders around all cells for table structure
 * - Top-aligned text with wrapping enabled for multi-line content
 * - Optional background fill color for alternating row coloring (zebra striping)
 *
 * Alternating colors improve readability by visually separating rows, especially
 * when topics are grouped by course.
 *
 * @param {Object} row - ExcelJS Row object to style
 * @param {string} [fillColor] - Optional ARGB color code (e.g., "FFE4F5D7" for light green)
 *
 * @example
 * // Apply style without background color
 * applyRowStyle(row);
 *
 * // Apply style with light green background
 * applyRowStyle(row, "FFE4F5D7");
 */
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

/**
 * Populates an Excel worksheet with user checklist data including summary info and detailed progress.
 *
 * This function creates a professionally formatted worksheet with:
 *
 * 1. Summary Section (Rows 1-4): User info including name, email, learning path, and enrollment status
 * 2. Header Row (Row 6): Column labels with green background styling
 * 3. Data Rows (Row 7+): Topic-by-topic progress with the following features:
 *    - Alternating row colors by course for better readability
 *    - Merged course name cells for topics within the same course
 *    - Date formatting (mm/dd/yyyy) for start and end dates
 *    - Bold, underlined status text
 *    - Gray dashes for missing dates
 *
 * @param {Object} sheet - ExcelJS Worksheet object to populate
 * @param {Array<Object>} rows - Array of user progress data (from loadUserChecklistRows)
 * @param {Object} [userSummary={}] - User summary information for the header section
 * @param {string} [userSummary.userName] - User's display name
 * @param {string} [userSummary.userEmail] - User's email address
 *
 * @example
 * const sheet = workbook.addWorksheet('John Doe');
 * const rows = await loadUserChecklistRows({ userId: '123' });
 * const user = { userName: 'John Doe', userEmail: 'john@example.com' };
 * populateUserChecklistSheet(sheet, rows, user);
 */
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

/**
 * Generates a complete Excel workbook containing user learning progress checklist data.
 *
 * This is the main Excel export function that orchestrates the creation of a multi-sheet
 * workbook. The structure varies based on the export scope:
 *
 * - Single User Export (userId provided):
 *   Creates one sheet named "User Checklist" with that user's data
 *
 * - All Users Export (no userId):
 *   Creates one sheet per user, named after the user (e.g., "John Doe", "Jane Smith")
 *   Each sheet contains only that user's progress data
 *   Sheet names are sanitized and made unique to comply with Excel requirements
 *
 * The workbook uses batch loading for efficiency and handles edge cases like users with
 * no progress data or missing profile information.
 *
 * @param {Object} [options={}] - Export options
 * @param {string} [options.userId] - Optional user ID to export data for a single user
 * @returns {Promise<Object>} Excel workbook export result
 * @returns {Buffer} return.buffer - Binary Excel file data (XLSX format)
 * @returns {string} return.fileName - Generated filename based on user(s) and current date
 * @throws {AppError} If ExcelJS dependency is not installed
 * @throws {ExternalServiceError} If database queries fail
 *
 * @example
 * // Export all users to separate sheets
 * const { buffer, fileName } = await buildUserChecklistWorkbook();
 * fs.writeFileSync(fileName, buffer);
 *
 * // Export single user
 * const { buffer, fileName } = await buildUserChecklistWorkbook({ userId: '123' });
 * res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
 * res.send(buffer);
 */
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
