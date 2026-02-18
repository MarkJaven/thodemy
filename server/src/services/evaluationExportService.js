/**
 * Evaluation Export Service
 * Generates Excel exports from evaluations using the SSCGI Training Roadmap template.
 * @module services/evaluationExportService
 */

const path = require("path");
const { evaluationService } = require("./evaluationService");
const { AppError } = require("../utils/errors");

let cachedExcelJs = null;

/**
 * Lazy-loads the ExcelJS library.
 * @returns {Object} ExcelJS library instance
 * @throws {AppError} If ExcelJS is not installed
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

/** Path to the SSCGI Training Roadmap Excel template */
const TEMPLATE_PATH = path.resolve(
  __dirname,
  "../../../docs/[Template] - SSCGI Training Roadmap v3.xlsx"
);

/** Bootcamp scorecard category weights and criterion-to-cell mappings (A-G). */
const BOOTCAMP_CATEGORY_CONFIG = [
  {
    category: "A",
    weight: 0.25,
    items: [
      { key: "a1_teamwork", weight: 7, actualCell: "N15" },
      { key: "a2_problem_solving", weight: 6, actualCell: "N16" },
      { key: "a3_communication", weight: 6, actualCell: "N17" },
      { key: "a4_leadership", weight: 6, actualCell: "N18" },
    ],
  },
  {
    category: "B",
    weight: 0.2,
    items: [
      { key: "b1_efficiency", weight: 5, actualCell: "N21" },
      { key: "b2_deadlines", weight: 5, actualCell: "N22" },
      { key: "b3_tools", weight: 5, actualCell: "N23" },
      { key: "b4_problem_solving", weight: 5, actualCell: "N24" },
    ],
  },
  {
    category: "C",
    weight: 0.15,
    items: [
      { key: "c1_attention", weight: 5, actualCell: "N27" },
      { key: "c2_quality", weight: 5, actualCell: "N28" },
      { key: "c3_output", weight: 5, actualCell: "N29" },
    ],
  },
  {
    category: "D",
    weight: 0.1,
    items: [
      { key: "d1_responsiveness", weight: 5, actualCell: "N32" },
      { key: "d2_quality", weight: 5, actualCell: "N33" },
    ],
  },
  {
    category: "E",
    weight: 0.1,
    items: [
      { key: "e1_learning", weight: 8, actualCell: "N36" },
      { key: "e2_feedback", weight: 2, actualCell: "N37" },
    ],
  },
  {
    category: "F",
    weight: 0.1,
    items: [
      { key: "f1_policies", weight: 5, actualCell: "N40" },
      { key: "f2_reporting", weight: 5, actualCell: "N41" },
    ],
  },
  {
    category: "G",
    weight: 0.1,
    items: [
      // Template has a single behavioral cell for category G.
      // We map both values by averaging them into N44.
      { key: "g1_integrity", weight: 5, actualCell: "N44" },
      { key: "g2_respect", weight: 5, actualCell: "N44" },
    ],
  },
];

/** Performance evaluation category weights and row mappings. */
const PERFORMANCE_CATEGORY_CONFIG = [
  { key: "pe_a", category: "A", weight: 0.25, row: 12 },
  { key: "pe_b", category: "B", weight: 0.2, row: 13 },
  { key: "pe_c", category: "C", weight: 0.15, row: 14 },
  { key: "pe_d", category: "D", weight: 0.15, row: 15 },
  { key: "pe_e", category: "E", weight: 0.05, row: 16 },
  { key: "pe_f", category: "F", weight: 0.05, row: 17 },
  { key: "pe_g", category: "G", weight: 0.15, row: 18 },
];

/** Part 1 ACTUAL cells map to section totals from Technical Evaluation. */
const PART1_TECHNICAL_TOTAL_CELL_BY_CATEGORY = {
  A: "I18",
  B: "I21",
  C: "I24",
  D: "I28",
  E: "I31",
  F: "I35",
  G: "I40",
};

/** Maps technical evaluation criteria to their Excel cell references. */
const TECHNICAL_CELL_MAP = [
  { key: "te_technical_knowledge", cell: "H15" },
  { key: "te_code_quality", cell: "H16" },
  { key: "te_debugging", cell: "H17" },
  { key: "te_system_design", cell: "H20" },
  { key: "te_documentation", cell: "H23" },
  { key: "te_testing", cell: "H26" },
  { key: "te_tools", cell: "H27" },
  { key: "te_best_practices", cell: "H30" },
  { key: "te_attendance", cell: "H33" },
  { key: "te_policy", cell: "H34" },
  { key: "te_behavioral", cell: "H39" },
];

/** Maps behavioral evaluation criteria to their Excel cell references. */
const BEHAVIORAL_CELL_MAP = [
  { key: "bh_adaptability", cell: "B13" }, // Technical Knowledge and Skills
  { key: "bh_initiative", cell: "B14" }, // Judgement and Conflict Management
  { key: "bh_dependability", cell: "B15" }, // Reliability and Dependability
  { key: "bh_attitude", cell: "B16" }, // Flexibility
  { key: "bh_cooperation", cell: "B17" }, // Teamwork
  { key: "bh_attendance", cell: "B18" }, // Drive for Excellence
  { key: "bh_professionalism", cell: "B19" }, // Integrity
  { key: "bh_information_security", cell: "B20" }, // Information Safety and Security
  { key: "bh_communication", cell: "B21" }, // Written Communication
  { key: "bh_oral_communication", cell: "B22" }, // Oral Communication
  { key: "bh_interpersonal_relations", cell: "B23" },
  { key: "bh_grooming_attire", cell: "B25" },
  { key: "bh_service_professionalism", cell: "B26" },
  { key: "bh_accessibility", cell: "B27" },
  { key: "bh_handling_situations", cell: "B28" },
];

/** Maps scoreboard criterion keys to row-3 header cells. Null means not displayed. */
const SCOREBOARD_CRITERION_CELL_MAP = {
  a1_teamwork: "E3",
  a2_problem_solving: "G3",
  a3_communication: "I3",
  a4_leadership: "K3",
  b1_efficiency: "N3",
  b2_deadlines: "P3",
  b3_tools: "R3",
  b4_problem_solving: "T3",
  c1_attention: "W3",
  c2_quality: "Y3",
  c3_output: "AA3",
  d1_responsiveness: "AD3",
  d2_quality: "AF3",
  e1_learning: "AI3",
  e2_feedback: "AK3",
  f1_policies: null,
  f2_reporting: null,
  g1_integrity: null,
  g2_respect: null,
};

const SCOREBOARD_CRITERION_KEYS = new Set(
  Object.keys(SCOREBOARD_CRITERION_CELL_MAP)
);

/** Maps scoreboard criterion keys to raw/normalized column pairs. */
const SCOREBOARD_CRITERION_COLUMN_MAP = {
  a1_teamwork: { rawCol: "E", normalizedCol: "F" },
  a2_problem_solving: { rawCol: "G", normalizedCol: "H" },
  a3_communication: { rawCol: "I", normalizedCol: "J" },
  a4_leadership: { rawCol: "K", normalizedCol: "L" },
  b1_efficiency: { rawCol: "N", normalizedCol: "O" },
  b2_deadlines: { rawCol: "P", normalizedCol: "Q" },
  b3_tools: { rawCol: "R", normalizedCol: "S" },
  b4_problem_solving: { rawCol: "T", normalizedCol: "U" },
  c1_attention: { rawCol: "W", normalizedCol: "X" },
  c2_quality: { rawCol: "Y", normalizedCol: "Z" },
  c3_output: { rawCol: "AA", normalizedCol: "AB" },
  d1_responsiveness: { rawCol: "AD", normalizedCol: "AE" },
  d2_quality: { rawCol: "AF", normalizedCol: "AG" },
  e1_learning: { rawCol: "AI", normalizedCol: "AJ" },
  e2_feedback: { rawCol: "AK", normalizedCol: "AL" },
};

const SCOREBOARD_ACTIVITY_KEY_SEPARATOR = "::";
const SCOREBOARD_META_CATEGORY = "__activity_meta";

const SCOREBOARD_ROWS = { start: 4, end: 120 };

const BOOTCAMP_CATEGORIES = ["A", "B", "C", "D", "E", "F", "G"];

const BOOTCAMP_SCORECARD_CONTRIBUTION_CELL_MAP = {
  A: "O19",
  B: "O25",
  C: "O30",
  D: "O34",
  E: "O38",
  F: "O42",
  G: "O45",
};

const BOOTCAMP_ENDORSEMENT_CONTRIBUTION_CELL_MAP = {
  A: "E12",
  B: "E13",
  C: "E14",
  D: "E15",
  E: "E16",
  F: "E17",
  G: "E18",
};

const BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET = "bootcamp_endorsement_feedback";
const PERFORMANCE_FEEDBACK_SHEET = "performance_feedback";
const SHEET2_RATING_SHEET = "sheet2_rating";

const BOOTCAMP_ENDORSEMENT_FEEDBACK_ROW_MAP = {
  A: 12,
  B: 13,
  C: 14,
  D: 15,
  E: 16,
  F: 17,
  G: 18,
};

const CHECKBOX_CHECKED = "☑";
const CHECKBOX_UNCHECKED = "☐";

/** Safely converts a value to a finite number, or returns null. */
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Rounds a numeric value to the specified decimal places (default 4). */
const round = (value, places = 4) => {
  const numeric = toNumber(value);
  if (numeric === null) return 0;
  const factor = 10 ** places;
  return Math.round(numeric * factor) / factor;
};

/** Clamps a numeric value between min (0) and max (5). */
const clampScore = (value, min = 0, max = 5) => {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return Math.min(Math.max(numeric, min), max);
};

/** Trims and uppercases a string value, defaulting to empty string. */
const safeUpper = (value) => String(value || "").trim().toUpperCase();

/** Formats a date value as an ISO date string (YYYY-MM-DD). */
const formatDateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

/** Formats a start/end date range as "YYYY-MM-DD - YYYY-MM-DD". */
const formatCoveredPeriod = (start, end) => {
  if (start && end) return `${formatDateText(start)} - ${formatDateText(end)}`;
  return formatDateText(start || end);
};

/**
 * Indexes scores into a Map keyed by "sheet:criterion_key".
 * @param {Array<object>} scores
 * @returns {Map<string, object>}
 */
const buildScoreMap = (scores) => {
  const map = new Map();
  for (const score of scores ?? []) {
    map.set(`${score.sheet}:${score.criterion_key}`, score);
  }
  return map;
};

/** Retrieves a score entry from the map by sheet and key. */
const getScoreEntry = (scoreMap, sheet, key) => scoreMap.get(`${sheet}:${key}`) || null;

/** Retrieves and clamps a score value (0–5) from the map. */
const getScoreValue = (scoreMap, sheet, key) => {
  const entry = getScoreEntry(scoreMap, sheet, key);
  return clampScore(entry?.score);
};

/** Retrieves the remarks string from a score entry. */
const getScoreRemarks = (scoreMap, sheet, key) => {
  const entry = getScoreEntry(scoreMap, sheet, key);
  return entry?.remarks || "";
};

/** Retrieves feedback strings (strength/improvement) for a category from a specific sheet. */
const getCategoryFeedbackForSheet = (scoreMap, sheet, category) => {
  const strengthKey = `cat_${category}_strength`;
  const improvementKey = `cat_${category}_improvement`;
  const strength = String(
    getScoreRemarks(scoreMap, sheet, strengthKey) || ""
  ).trim();
  const improvement = String(
    getScoreRemarks(scoreMap, sheet, improvementKey) || ""
  ).trim();

  return { strength, improvement };
};

/** Retrieves bootcamp endorsement feedback strings (strength/improvement) for a category. */
const getBootcampFeedbackForCategory = (scoreMap, category) =>
  getCategoryFeedbackForSheet(scoreMap, BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET, category);

/** Retrieves performance feedback strings (strength/improvement) for a category. */
const getPerformanceFeedbackForCategory = (scoreMap, category) =>
  getCategoryFeedbackForSheet(scoreMap, PERFORMANCE_FEEDBACK_SHEET, category);

/**
 * Dashboard feedback mapping:
 * source of truth is performance evaluation feedback.
 */
const getDashboardFeedbackForCategory = (scoreMap, category) =>
  getPerformanceFeedbackForCategory(scoreMap, category);

/**
 * Part1 feedback mapping:
 * source of truth is bootcamp endorsement feedback.
 */
const getPart1FeedbackForCategory = (scoreMap, category) =>
  getBootcampFeedbackForCategory(scoreMap, category);

/** Builds the score key used by Sheet2 rating entries. */
const getSheet2CriterionKey = (roleKey, dimensionKey) =>
  `sheet2_${roleKey}_${dimensionKey}`;

/** Converts a score to Sheet2 proficiency level (1-5 integer). */
const toSheet2RatingLevel = (score) => {
  const numeric = toNumber(score);
  if (numeric === null) return null;
  return Math.min(5, Math.max(1, Math.round(numeric)));
};


/** Normalizes a score to a 0–5 scale based on its max possible score. */
const normalizeScoreToFive = (score, maxScore) => {
  const numericScore = toNumber(score);
  if (numericScore === null) return null;
  const numericMax = toNumber(maxScore);
  const safeMax = numericMax && numericMax > 0 ? numericMax : 5;
  return clampScore((numericScore / safeMax) * 5, 0, 5);
};

/** Parses a scoreboard entry into its activity key and criterion key. */
const parseScoreboardEntry = (entry) => {
  const rawKey = String(entry?.criterion_key || "").trim();
  const rawCategory = String(entry?.category || "").trim();

  if (rawKey.includes(SCOREBOARD_ACTIVITY_KEY_SEPARATOR)) {
    const [activityKey, rubricKey] = rawKey.split(SCOREBOARD_ACTIVITY_KEY_SEPARATOR);
    return {
      activityKey: activityKey || rawKey,
      criterionKey: SCOREBOARD_CRITERION_KEYS.has(rubricKey) ? rubricKey : null,
    };
  }

  if (SCOREBOARD_CRITERION_KEYS.has(rawCategory)) {
    return { activityKey: rawKey, criterionKey: rawCategory };
  }

  return { activityKey: rawKey, criterionKey: null };
};

/** Extracts the criterion key from a scoreboard entry. */
const getScoreboardCriterionKey = (entry) => {
  const { criterionKey } = parseScoreboardEntry(entry);
  return criterionKey;
};

/** Filters the score map to only scoreboard sheet entries. */
const getScoreboardEntries = (scoreMap) =>
  Array.from(scoreMap.values()).filter((score) => score.sheet === "scoreboard");

/**
 * Groups scoreboard entries by activity and computes per-activity scores.
 * @param {Map} scoreMap
 * @returns {Array<object>} Sorted list of activity objects with criterion scores
 */
const getScoreboardActivities = (scoreMap) => {
  const activities = new Map();

  for (const entry of getScoreboardEntries(scoreMap)) {
    const { activityKey, criterionKey } = parseScoreboardEntry(entry);
    if (!activityKey) continue;

    if (!activities.has(activityKey)) {
      activities.set(activityKey, {
        activityKey,
        label: entry.criterion_label || activityKey,
        source: entry.source || "manual",
        remarks: entry.remarks || "",
        criterionScores: {},
        assessmentScore: null,
        assessmentMax: 5,
      });
    }

    const activity = activities.get(activityKey);
    if (!activity) continue;

    if (entry.criterion_label) activity.label = entry.criterion_label;
    if (entry.remarks) activity.remarks = entry.remarks;
    if (activity.source === "manual" && entry.source) activity.source = entry.source;

    if (criterionKey) {
      const normalized = normalizeScoreToFive(entry.score, entry.max_score);
      if (normalized !== null) {
        activity.criterionScores[criterionKey] = normalized;
      }
      continue;
    }

    const rawScore = toNumber(entry.score);
    const rawMax = toNumber(entry.max_score);
    const isMetaOnlyEntry =
      String(entry?.category || "").trim() === SCOREBOARD_META_CATEGORY;
    if (isMetaOnlyEntry && rawScore === null) {
      continue;
    }

    if (rawScore !== null) {
      activity.assessmentScore = rawScore;
      activity.assessmentMax = rawMax && rawMax > 0 ? rawMax : 5;
    }
  }

  const result = Array.from(activities.values());
  for (const activity of result) {
    if (activity.assessmentScore !== null) continue;
    const criterionValues = Object.values(activity.criterionScores)
      .map(toNumber)
      .filter((value) => value !== null);
    if (criterionValues.length > 0) {
      activity.assessmentScore = round(average(criterionValues), 4);
      activity.assessmentMax = 5;
    }
  }

  result.sort((left, right) =>
    String(left.label || "").localeCompare(String(right.label || ""))
  );
  return result;
};

/**
 * Computes the average normalized score for each scoreboard criterion.
 * @param {Map} scoreMap
 * @returns {object} Criterion key to average score mapping
 */
const computeScoreboardCriterionAverages = (scoreMap) => {
  const valuesByCriterion = new Map();

  for (const entry of getScoreboardEntries(scoreMap)) {
    const criterionKey = getScoreboardCriterionKey(entry);
    if (!criterionKey) continue;
    const normalized = normalizeScoreToFive(entry.score, entry.max_score);
    if (normalized === null) continue;
    if (!valuesByCriterion.has(criterionKey)) {
      valuesByCriterion.set(criterionKey, []);
    }
    valuesByCriterion.get(criterionKey).push(normalized);
  }

  const averages = {};
  for (const criterionKey of SCOREBOARD_CRITERION_KEYS) {
    const values = valuesByCriterion.get(criterionKey) || [];
    averages[criterionKey] = values.length > 0 ? round(average(values), 4) : null;
  }

  return averages;
};

/** Resolves a bootcamp criterion score, preferring scoreboard averages. */
const getBootcampCriterionScore = (scoreMap, scoreboardAverages, criterionKey) => {
  const fromScoreboard = toNumber(scoreboardAverages?.[criterionKey]);
  if (fromScoreboard !== null) return fromScoreboard;
  return null;
};

/** Computes the arithmetic mean of an array of numeric values. */
const average = (values) => {
  const numeric = values.map(toNumber).filter((v) => v !== null);
  if (numeric.length === 0) return 0;
  return numeric.reduce((sum, current) => sum + current, 0) / numeric.length;
};

/** Computes the weighted average for a single bootcamp category. */
const computeBootcampCategoryAverage = (scoreMap, scoreboardAverages, categoryConfig) => {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const item of categoryConfig.items) {
    const score = getBootcampCriterionScore(scoreMap, scoreboardAverages, item.key);
    if (score === null) continue;
    weightedTotal += score * item.weight;
    weightTotal += item.weight;
  }

  if (weightTotal === 0) return 0;
  return weightedTotal / weightTotal;
};

/**
 * Computes bootcamp results: per-category averages, contributions, and total.
 * @param {Map} scoreMap
 * @param {object} scoreboardAverages
 * @returns {{ categoryAverages: object, categoryContributions: object, totalContribution: number }}
 */
const computeBootcampResults = (scoreMap, scoreboardAverages) => {
  const categoryAverages = {};
  const categoryContributions = {};
  let totalContribution = 0;

  for (const categoryConfig of BOOTCAMP_CATEGORY_CONFIG) {
    const avg = computeBootcampCategoryAverage(
      scoreMap,
      scoreboardAverages,
      categoryConfig
    );
    const contribution = (avg / 5) * categoryConfig.weight;

    categoryAverages[categoryConfig.category] = round(avg, 4);
    categoryContributions[categoryConfig.category] = round(contribution, 4);
    totalContribution += contribution;
  }

  return {
    categoryAverages,
    categoryContributions,
    totalContribution: round(totalContribution, 4),
  };
};

/**
 * Computes performance evaluation results from auto-derived scoreboard data:
 * per-category scores, contributions, and total.
 * @param {Map} scoreMap
 * @param {object} scoreboardAverages
 * @returns {{ categoryScores: object, categoryContributions: object, totalContribution: number }}
 */
const computePerformanceResults = (scoreMap, scoreboardAverages) => {
  const categoryScores = {};
  const categoryContributions = {};
  let totalContribution = 0;
  const bootcampByCategory = new Map(
    BOOTCAMP_CATEGORY_CONFIG.map((categoryConfig) => [categoryConfig.category, categoryConfig])
  );

  for (const config of PERFORMANCE_CATEGORY_CONFIG) {
    const sourceCategoryConfig = bootcampByCategory.get(config.category);
    const normalizedScore = sourceCategoryConfig
      ? computeBootcampCategoryAverage(scoreMap, scoreboardAverages, sourceCategoryConfig)
      : 0;
    const contribution = (normalizedScore / 5) * config.weight;

    categoryScores[config.category] = round(normalizedScore, 4);
    categoryContributions[config.category] = round(contribution, 4);
    totalContribution += contribution;
  }

  return {
    categoryScores,
    categoryContributions,
    totalContribution: round(totalContribution, 4),
  };
};

/**
 * Computes weighted summary contributions (A-E) for the performance summary sheet.
 * @param {Map} scoreMap
 * @param {object} scoreboardAverages
 * @returns {{ A: number, B: number, C: number, D: number, E: number }}
 */
const computeSummaryContributions = (scoreMap, scoreboardAverages) => {
  const technicalAvg = average(
    TECHNICAL_CELL_MAP.map((entry) => getScoreValue(scoreMap, "technical", entry.key))
  );

  const problemSolvingAvg = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a2_problem_solving"),
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "b4_problem_solving"),
    getScoreValue(scoreMap, "technical", "te_debugging"),
  ]);

  const communicationAvg = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a3_communication"),
    getScoreValue(scoreMap, "behavioral", "bh_communication"),
    getScoreValue(scoreMap, "behavioral", "bh_oral_communication"),
  ]);

  const collaborationAvg = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a1_teamwork"),
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a4_leadership"),
    getScoreValue(scoreMap, "behavioral", "bh_cooperation"),
    getScoreValue(scoreMap, "behavioral", "bh_professionalism"),
    getScoreValue(scoreMap, "behavioral", "bh_interpersonal_relations"),
  ]);

  const scoreboardEntries = [];
  for (const score of scoreMap.values()) {
    if (score.sheet !== "scoreboard") continue;
    const normalized = clampScore(score.score, 0, toNumber(score.max_score) || 5);
    if (normalized === null) continue;
    const maxScore = toNumber(score.max_score) || 5;
    scoreboardEntries.push((normalized / maxScore) * 5);
  }
  const formativeAvg = scoreboardEntries.length > 0
    ? average(scoreboardEntries)
    : average([getBootcampCriterionScore(scoreMap, scoreboardAverages, "e1_learning")]);

  return {
    A: round((technicalAvg / 5) * 0.25, 4),
    B: round((problemSolvingAvg / 5) * 0.25, 4),
    C: round((communicationAvg / 5) * 0.15, 4),
    D: round((collaborationAvg / 5) * 0.15, 4),
    E: round((formativeAvg / 5) * 0.2, 4),
  };
};

/**
 * Converts a contribution score to an adjectival rating with recommendation.
 * @param {number} contribution - Overall contribution (0–1 scale)
 * @returns {{ adjectival: string, interpretation: string, recommendation: string }}
 */
const toAdjectival = (contribution) => {
  const score = toNumber(contribution) || 0;
  if (score >= 0.91) {
    return {
      adjectival: "OUTSTANDING",
      interpretation: "Exceeds expectations across all areas.",
      recommendation: "FOR ENDORSEMENT",
    };
  }
  if (score >= 0.86) {
    return {
      adjectival: "SATISFACTORY",
      interpretation: "Meets baseline expectations.",
      recommendation: "FOR ENDORSEMENT",
    };
  }
  if (score >= 0.71) {
    return {
      adjectival: "NEEDS IMPROVEMENT",
      interpretation: "Close to target but needs focused improvement.",
      recommendation: "FOR COACHING",
    };
  }
  if (score >= 0.61) {
    return {
      adjectival: "UNSATISFACTORY",
      interpretation: "Below target and needs immediate intervention.",
      recommendation: "FOR IMPROVEMENT PLAN",
    };
  }
  return {
    adjectival: "POOR",
    interpretation: "Consistently failed to expectations.",
    recommendation: "FOR IMPROVEMENT PLAN",
  };
};

/** Writes a value to a worksheet cell. */
const overwriteCell = (worksheet, cellRef, value) => {
  if (!worksheet) return;
  worksheet.getCell(cellRef).value = value;
};

/** Updates a cell's cached formula result, preserving the formula if present. */
const overwriteCellWithFormulaResult = (worksheet, cellRef, result) => {
  if (!worksheet) return;
  const nextResult = toNumber(result) ?? 0;
  const currentValue = worksheet.getCell(cellRef).value;
  if (currentValue && typeof currentValue === "object") {
    if (currentValue.formula) {
      const formulaValue = {
        formula: currentValue.formula,
        result: nextResult,
      };
      if (currentValue.shareType) {
        formulaValue.shareType = currentValue.shareType;
      }
      if (currentValue.ref) {
        formulaValue.ref = currentValue.ref;
      }
      overwriteCell(worksheet, cellRef, formulaValue);
      return;
    }

    if (currentValue.sharedFormula) {
      overwriteCell(worksheet, cellRef, {
        sharedFormula: currentValue.sharedFormula,
        result: nextResult,
      });
      return;
    }
  }
  overwriteCell(worksheet, cellRef, nextResult);
};

const SHEET2_RATING_ROLES = [
  { key: "technical_business_analyst", row: 2 },
  { key: "web_developer", row: 3 },
  { key: "ui_ux_developer", row: 4 },
  { key: "database_administrator", row: 5 },
  { key: "qa_engineer", row: 6 },
  { key: "data_engineer", row: 7 },
  { key: "implementation_consultant", row: 8 },
  { key: "developer", row: 9 },
];

const SHEET2_RATING_DIMENSIONS = [
  { key: "technical_skills", column: "B" },
  { key: "problem_solving", column: "C" },
  { key: "communication", column: "D" },
  { key: "collaboration", column: "E" },
  { key: "formative_assessment", column: "F" },
];

const SHEET2_RATING_COLOR_BY_LEVEL = {
  1: "FFEBF1DE",
  2: "FFC4D79B",
  3: "FF92D050",
  4: "FF76933C",
  5: "FF4F6228",
};

/** Reads a numeric value from a cell, preferring cached formula result when present. */
const getCellNumericValue = (worksheet, cellRef) => {
  if (!worksheet || !cellRef) return null;
  const cellValue = worksheet.getCell(cellRef).value;
  if (cellValue && typeof cellValue === "object") {
    const formulaResult = toNumber(cellValue.result);
    if (formulaResult !== null) return formulaResult;
  }
  return toNumber(cellValue);
};

/** Clears all cell values in a column within the given row range. */
const clearColumnRange = (worksheet, column, startRow, endRow) => {
  if (!worksheet) return;
  for (let row = startRow; row <= endRow; row += 1) {
    worksheet.getCell(`${column}${row}`).value = null;
  }
};

/**
 * Populates trainee header info across all evaluation sheets.
 * @param {object} workbook - ExcelJS workbook
 * @param {object} evaluation - Evaluation record
 * @param {object} traineeInfo - Trainee metadata
 * @param {string} traineeName - Display name
 */
const populateHeaders = (workbook, evaluation, traineeInfo, traineeName) => {
  const department = safeUpper(traineeInfo.department);
  const position = safeUpper(traineeInfo.position || "TRAINEE");
  const trainer = safeUpper(traineeInfo.trainer);
  const endorsedDepartment = safeUpper(traineeInfo.endorsed_department || traineeInfo.department);
  const coveredPeriod = formatCoveredPeriod(evaluation.period_start, evaluation.period_end);
  const dateHired = formatDateText(traineeInfo.date_hired);
  const reviewedDate = formatDateText(evaluation.updated_at || new Date().toISOString());

  const dashboard = workbook.getWorksheet("Dashboard");
  overwriteCell(dashboard, "D3", safeUpper(traineeName));
  overwriteCell(dashboard, "D4", position || "TRAINEE");
  overwriteCell(dashboard, "D5", department);
  overwriteCell(dashboard, "D6", coveredPeriod);
  overwriteCell(dashboard, "D7", endorsedDepartment);
  overwriteCell(dashboard, "D8", trainer);

  const scorecard = workbook.getWorksheet("BootCampScoreCard");
  // In template: labels are on merged B:C (green), values are on merged D:F (yellow).
  overwriteCell(scorecard, "D3", safeUpper(traineeName));
  overwriteCell(scorecard, "D4", department);
  overwriteCell(scorecard, "D5", dateHired);
  overwriteCell(scorecard, "D6", coveredPeriod);
  overwriteCell(
    scorecard,
    "D7",
    formatDateText(traineeInfo.date_endorsed || traineeInfo.target_join_date)
  );
  overwriteCell(scorecard, "D8", trainer);

  const endorsement = workbook.getWorksheet("BootcampEndorsementScoreCard");
  overwriteCell(endorsement, "E4", department);
  overwriteCell(endorsement, "E5", safeUpper(traineeName));
  overwriteCell(endorsement, "E6", dateHired);
  overwriteCell(endorsement, "E7", coveredPeriod);
  overwriteCell(endorsement, "E8", trainer);

  const performance = workbook.getWorksheet("Performance Evaluation");
  overwriteCell(performance, "E4", department);
  overwriteCell(performance, "E5", safeUpper(traineeName));
  overwriteCell(performance, "E6", dateHired);
  overwriteCell(performance, "E7", coveredPeriod);
  overwriteCell(performance, "E8", trainer);

  const part1 = workbook.getWorksheet("Part 1 Evaluation");
  overwriteCell(part1, "E4", department);
  overwriteCell(part1, "E5", safeUpper(traineeName));
  overwriteCell(part1, "E6", dateHired);
  overwriteCell(part1, "E7", coveredPeriod);
  overwriteCell(part1, "E8", trainer);

  const behavioral = workbook.getWorksheet("Behavioral Evaluation");
  overwriteCell(behavioral, "B6", safeUpper(traineeName));
  overwriteCell(behavioral, "B7", "TRAINEE");
  overwriteCell(behavioral, "B8", null);

  const technical = workbook.getWorksheet("Technical Evaluation");
  overwriteCell(technical, "D5", safeUpper(traineeName));
  overwriteCell(technical, "F5", department);
  overwriteCell(technical, "D6", dateHired);
  overwriteCell(technical, "F6", coveredPeriod);
  overwriteCell(technical, "D7", position || "TRAINEE");
  overwriteCell(technical, "F7", reviewedDate);
  overwriteCell(technical, "D8", trainer);

  const regularization = workbook.getWorksheet("Regularization Endorsement");
  overwriteCell(regularization, "D6", safeUpper(traineeName));
  overwriteCell(regularization, "D7", position || "TRAINEE");
  overwriteCell(regularization, "D8", department);
  overwriteCell(regularization, "D9", coveredPeriod);
  overwriteCell(
    regularization,
    "D31",
    traineeInfo.employment_status || "Trainee"
  );
  overwriteCell(
    regularization,
    "D34",
    traineeInfo.current_job_title || null
  );
  overwriteCell(
    regularization,
    "E34",
    traineeInfo.current_job_title || null
  );
  overwriteCell(regularization, "G57", safeUpper(traineeName));
  overwriteCell(regularization, "H57", safeUpper(traineeName));
};

/** Populates derived actual scores on the BootCampScoreCard (compliance, quiz, ethics). */
const populateBootcampActualCriteria = (workbook, scoreMap, scoreboardAverages) => {
  const scorecard = workbook.getWorksheet("BootCampScoreCard");
  if (!scorecard) return;

  const valuesByCell = new Map();

  for (const categoryConfig of BOOTCAMP_CATEGORY_CONFIG) {
    for (const item of categoryConfig.items) {
      if (!item.actualCell) continue;
      const score = getBootcampCriterionScore(scoreMap, scoreboardAverages, item.key);
      if (!valuesByCell.has(item.actualCell)) {
        valuesByCell.set(item.actualCell, []);
      }
      if (score !== null) {
        valuesByCell.get(item.actualCell).push(score);
      }
    }
  }

  for (const [cellRef, values] of valuesByCell.entries()) {
    if (cellRef === "N36" || cellRef === "N40" || cellRef === "N41" || cellRef === "N44") {
      continue;
    }
    const cachedResult = values.length > 0 ? round(average(values), 2) : 0;
    overwriteCell(scorecard, cellRef, cachedResult);
  }
};

/** Populates derived actual scores on the BootCampScoreCard (compliance, quiz, ethics). */
const populateBootcampDerivedActuals = (workbook, scoreMap, scoreboardAverages) => {
  const scorecard = workbook.getWorksheet("BootCampScoreCard");
  if (!scorecard) return;

  const complianceOne = getBootcampCriterionScore(scoreMap, scoreboardAverages, "f1_policies");
  const complianceTwo = getBootcampCriterionScore(scoreMap, scoreboardAverages, "f2_reporting");
  overwriteCell(scorecard, "N40", complianceOne !== null ? round(complianceOne, 2) : 0);
  overwriteCell(scorecard, "N41", complianceTwo !== null ? round(complianceTwo, 2) : 0);

  // Populate Summative Assessment (N36) from quiz grades equivalent if available.
  // Equivalent uses a zero floor for non-taken quizzes:
  // AR = IF(Score<=0, 0, (Score/TotalItems)*50+50)
  const quizGrades = getQuizGradesEntries(scoreMap);
  if (quizGrades.length > 0) {
    const equivalents = quizGrades
      .map((qg) => computeQuizEquivalent(qg.score, qg.max_score))
      .filter((eq) => eq !== null);
    if (equivalents.length > 0) {
      const avgEquivalent = equivalents.reduce((sum, eq) => sum + eq, 0) / equivalents.length;
      // Convert equivalent to 5-scale: template uses AR * 0.8 then normalizes
      // Equivalent is 50-100 scale, so convert to 5-scale: (equivalent / 100) * 5
      const summativeScore = round((avgEquivalent / 100) * 5, 2);
      overwriteCellWithFormulaResult(scorecard, "N36", summativeScore);
    }
  }

  const behavioralAvg = average([
    getScoreValue(scoreMap, "behavioral", "bh_adaptability"),
    getScoreValue(scoreMap, "behavioral", "bh_initiative"),
    getScoreValue(scoreMap, "behavioral", "bh_dependability"),
    getScoreValue(scoreMap, "behavioral", "bh_attitude"),
    getScoreValue(scoreMap, "behavioral", "bh_cooperation"),
    getScoreValue(scoreMap, "behavioral", "bh_attendance"),
    getScoreValue(scoreMap, "behavioral", "bh_professionalism"),
    getScoreValue(scoreMap, "behavioral", "bh_information_security"),
    getScoreValue(scoreMap, "behavioral", "bh_communication"),
    getScoreValue(scoreMap, "behavioral", "bh_oral_communication"),
    getScoreValue(scoreMap, "behavioral", "bh_interpersonal_relations"),
    getScoreValue(scoreMap, "behavioral", "bh_grooming_attire"),
    getScoreValue(scoreMap, "behavioral", "bh_service_professionalism"),
    getScoreValue(scoreMap, "behavioral", "bh_accessibility"),
    getScoreValue(scoreMap, "behavioral", "bh_handling_situations"),
  ]);

  const ethicsFallback = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "g1_integrity"),
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "g2_respect"),
  ]);

  const ethicsScore = behavioralAvg > 0 ? behavioralAvg : ethicsFallback;
  overwriteCell(scorecard, "N44", ethicsScore > 0 ? round(ethicsScore, 2) : 0);
};

/** Writes category contributions to the Dashboard sheet. */
const populateDashboardScores = (workbook, scoreMap, bootcampResults) => {
  const dashboard = workbook.getWorksheet("Dashboard");
  const part1Sheet = workbook.getWorksheet("Part 1 Evaluation");
  if (!dashboard) return;

  const categories = ["A", "B", "C", "D", "E", "F", "G"];
  const bootcampRows = [14, 15, 16, 17, 18, 19, 20];
  const performanceRows = [26, 27, 28, 29, 30, 31, 32];

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const bootcampContribution = bootcampResults.categoryContributions[category] || 0;
    const part1Row =
      PERFORMANCE_CATEGORY_CONFIG.find((config) => config.category === category)?.row ||
      null;
    const part1Actual = getCellNumericValue(
      part1Sheet,
      part1Row ? `E${part1Row}` : null
    );

    overwriteCellWithFormulaResult(dashboard, `F${bootcampRows[index]}`, round(bootcampContribution, 4));
    overwriteCellWithFormulaResult(
      dashboard,
      `F${performanceRows[index]}`,
      round(part1Actual ?? 0, 4)
    );

    // Dashboard bootcamp rows: performance feedback (GHIJK 14-20, LMNOP 14-20).
    const bootcampFeedbackRow = bootcampRows[index];
    const { strength, improvement } = getDashboardFeedbackForCategory(scoreMap, category);
    overwriteCell(dashboard, `G${bootcampFeedbackRow}`, null);
    overwriteCell(dashboard, `L${bootcampFeedbackRow}`, null);
    if (strength) {
      overwriteCell(dashboard, `G${bootcampFeedbackRow}`, strength);
    }
    if (improvement) {
      overwriteCell(dashboard, `L${bootcampFeedbackRow}`, improvement);
    }

    // Dashboard performance rows: endorsement feedback (GHIJK 26-32, LMNOP 26-32).
    const perfFeedbackRow = performanceRows[index];
    const endorsementFeedback = getBootcampFeedbackForCategory(scoreMap, category);
    overwriteCell(dashboard, `G${perfFeedbackRow}`, null);
    overwriteCell(dashboard, `L${perfFeedbackRow}`, null);
    if (endorsementFeedback.strength) {
      overwriteCell(dashboard, `G${perfFeedbackRow}`, endorsementFeedback.strength);
    }
    if (endorsementFeedback.improvement) {
      overwriteCell(dashboard, `L${perfFeedbackRow}`, endorsementFeedback.improvement);
    }
  }
};

/** Writes computed contribution totals to the ScoreCard and Endorsement sheets. */
const populateBootcampComputedSummaries = (workbook, bootcampResults) => {
  const scorecard = workbook.getWorksheet("BootCampScoreCard");
  const endorsement = workbook.getWorksheet("BootcampEndorsementScoreCard");
  if (!scorecard && !endorsement) return;

  let totalContribution = 0;

  for (const category of BOOTCAMP_CATEGORIES) {
    const contribution = toNumber(bootcampResults?.categoryContributions?.[category]) || 0;
    totalContribution += contribution;

    const scorecardCell = BOOTCAMP_SCORECARD_CONTRIBUTION_CELL_MAP[category];
    if (scorecardCell) {
      overwriteCellWithFormulaResult(scorecard, scorecardCell, round(contribution, 4));
    }

    const endorsementCell = BOOTCAMP_ENDORSEMENT_CONTRIBUTION_CELL_MAP[category];
    if (endorsementCell) {
      overwriteCellWithFormulaResult(endorsement, endorsementCell, round(contribution, 4));
    }
  }

  const roundedTotal = round(totalContribution, 4);

  // Overall computed totals on both sheets.
  overwriteCellWithFormulaResult(scorecard, "O13", roundedTotal);
  // Visible RATING cell on BootCampScoreCard points to O13; update cached result too.
  overwriteCellWithFormulaResult(scorecard, "G4", roundedTotal);
  overwriteCellWithFormulaResult(endorsement, "E19", roundedTotal);

  // Recommendation checkbox row on BootCampScoreCard:
  // D47 = Yes, F47 = No.
  // Always clear template defaults first so initial exports have no pre-checked box.
  overwriteCell(scorecard, "D47", CHECKBOX_UNCHECKED);
  overwriteCell(scorecard, "F47", CHECKBOX_UNCHECKED);

  // If there is a computed score, pick one:
  // >= 86% => Yes (endorsement), otherwise No.
  if (roundedTotal > 0) {
    const recommendYes = roundedTotal >= 0.86;
    overwriteCell(scorecard, "D47", recommendYes ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED);
    overwriteCell(scorecard, "F47", recommendYes ? CHECKBOX_UNCHECKED : CHECKBOX_CHECKED);
  }

  // Endorsement header cells showing total computed score.
  ["G5", "G6", "G7", "G8"].forEach((cellRef) => {
    overwriteCellWithFormulaResult(endorsement, cellRef, roundedTotal);
  });
};

/** Writes strength/improvement feedback per category to the Endorsement sheet. */
const populateBootcampEndorsementFeedback = (workbook, scoreMap) => {
  const endorsement = workbook.getWorksheet("BootcampEndorsementScoreCard");
  if (!endorsement) return;

  for (const category of BOOTCAMP_CATEGORIES) {
    const row = BOOTCAMP_ENDORSEMENT_FEEDBACK_ROW_MAP[category];
    if (!row) continue;

    // Always clear template placeholder/default text first.
    overwriteCell(endorsement, `F${row}`, null);
    overwriteCell(endorsement, `H${row}`, null);

    const { strength, improvement } = getPerformanceFeedbackForCategory(scoreMap, category);

    if (strength) {
      overwriteCell(endorsement, `F${row}`, strength);
    }
    if (improvement) {
      overwriteCell(endorsement, `H${row}`, improvement);
    }
  }
};

/** Writes performance category contributions and remarks to the evaluation sheets. */
const populatePerformanceSheets = (workbook, scoreMap, performanceResults) => {
  const performanceSheet = workbook.getWorksheet("Performance Evaluation");
  const part1Sheet = workbook.getWorksheet("Part 1 Evaluation");
  const technicalSheet = workbook.getWorksheet("Technical Evaluation");

  for (const config of PERFORMANCE_CATEGORY_CONFIG) {
    const contribution = performanceResults.categoryContributions[config.category] || 0;
    const technicalTotalCell =
      PART1_TECHNICAL_TOTAL_CELL_BY_CATEGORY[config.category] || null;
    const part1Actual = getCellNumericValue(technicalSheet, technicalTotalCell) ?? 0;

    overwriteCellWithFormulaResult(performanceSheet, `E${config.row}`, round(contribution, 4));
    overwriteCellWithFormulaResult(part1Sheet, `E${config.row}`, round(part1Actual, 4));

    // Clear template defaults/placeholders first.
    overwriteCell(performanceSheet, `F${config.row}`, null);
    overwriteCell(performanceSheet, `H${config.row}`, null);
    overwriteCell(part1Sheet, `F${config.row}`, null);
    overwriteCell(part1Sheet, `H${config.row}`, null);

    const performanceFeedback = getPerformanceFeedbackForCategory(
      scoreMap,
      config.category
    );
    const part1Feedback = getPart1FeedbackForCategory(scoreMap, config.category);

    if (performanceFeedback.strength) {
      overwriteCell(performanceSheet, `F${config.row}`, performanceFeedback.strength);
    }
    if (performanceFeedback.improvement) {
      overwriteCell(performanceSheet, `H${config.row}`, performanceFeedback.improvement);
    }

    if (part1Feedback.strength) {
      overwriteCell(part1Sheet, `F${config.row}`, part1Feedback.strength);
    }
    if (part1Feedback.improvement) {
      overwriteCell(part1Sheet, `H${config.row}`, part1Feedback.improvement);
    }
  }

  // Keep total rows consistent in exported files even without external formula recalculation.
  const part1PrimaryTotal = round(
    [12, 13, 14, 15, 16]
      .map((row) => getCellNumericValue(part1Sheet, `E${row}`) || 0)
      .reduce((sum, value) => sum + value, 0),
    4
  );
  const part1SecondaryTotal = round(
    [17, 18]
      .map((row) => getCellNumericValue(part1Sheet, `E${row}`) || 0)
      .reduce((sum, value) => sum + value, 0),
    4
  );
  overwriteCellWithFormulaResult(part1Sheet, "E19", part1PrimaryTotal);
  overwriteCellWithFormulaResult(part1Sheet, "F19", part1SecondaryTotal);

  const perfPrimaryTotal = round(
    [12, 13, 14, 15, 16]
      .map((row) => getCellNumericValue(performanceSheet, `E${row}`) || 0)
      .reduce((sum, value) => sum + value, 0),
    4
  );
  const perfSecondaryTotal = round(
    [17, 18]
      .map((row) => getCellNumericValue(performanceSheet, `E${row}`) || 0)
      .reduce((sum, value) => sum + value, 0),
    4
  );
  overwriteCellWithFormulaResult(performanceSheet, "F19", perfPrimaryTotal);
  overwriteCellWithFormulaResult(performanceSheet, "F20", perfSecondaryTotal);
  overwriteCellWithFormulaResult(
    performanceSheet,
    "E19",
    round(perfPrimaryTotal + perfSecondaryTotal, 4)
  );
};

/** Writes Regularization Endorsement computed scoring/results and clears stale notes. */
const populateRegularizationEndorsement = (workbook) => {
  const regularization = workbook.getWorksheet("Regularization Endorsement");
  const performanceSheet = workbook.getWorksheet("Performance Evaluation");
  if (!regularization || !performanceSheet) return;

  const performanceTotal = getCellNumericValue(performanceSheet, "F19") ?? 0;
  const behavioralTotal = getCellNumericValue(performanceSheet, "F20") ?? 0;
  const finalRating = round(performanceTotal + behavioralTotal, 4);
  const setComputedValue = (cellRef, value) => {
    const computed = round(value, 4);
    // ExcelJS may drop cached formula result when it is 0.
    // Use plain numeric 0 so exported files always show computed zero values.
    if (computed === 0) {
      overwriteCell(regularization, cellRef, 0);
      return;
    }
    overwriteCellWithFormulaResult(regularization, cellRef, computed);
  };

  // Performance Review scoring block.
  setComputedValue("E16", performanceTotal);
  setComputedValue("E17", performanceTotal);
  setComputedValue("E18", performanceTotal);
  setComputedValue("E19", performanceTotal);

  // Behavioral Evaluation scoring block.
  setComputedValue("E22", behavioralTotal);
  setComputedValue("E23", behavioralTotal);
  setComputedValue("E24", behavioralTotal);
  setComputedValue("E25", behavioralTotal);

  // Final rating.
  setComputedValue("E27", finalRating);

  // Remove stale template description comments.
  [16, 17, 18, 19].forEach((row) => {
    overwriteCell(regularization, `G${row}`, null);
    overwriteCell(regularization, `H${row}`, null);
  });
};

/** Weight and total-row config for the Technical Evaluation sheet. */
const TECHNICAL_WEIGHT_MAP = {
  H15: 0.10, H16: 0.08, H17: 0.07,
  H20: 0.20,
  H23: 0.15,
  H26: 0.08, H27: 0.07,
  H30: 0.05,
  H33: 0.03, H34: 0.02,
  H39: 0.15,
};

const TECHNICAL_MAX_SCORE = 5;

/** Section total rows: each maps to { hCell, iCell, members[] } */
const TECHNICAL_TOTAL_ROWS = [
  { h: "H18", i: "I18", members: ["H15", "H16", "H17"] },
  { h: "H21", i: "I21", members: ["H20"] },
  { h: "H24", i: "I24", members: ["H23"] },
  { h: "H28", i: "I28", members: ["H26", "H27"] },
  { h: "H31", i: "I31", members: ["H30"] },
  { h: "H35", i: "I35", members: ["H33", "H34"] },
  { h: "H40", i: "I40", members: ["H39"] },
];

/** Writes technical evaluation scores to their mapped cells and updates COMPUTED % results. */
const populateTechnicalScores = (workbook, scoreMap) => {
  const technical = workbook.getWorksheet("Technical Evaluation");
  if (!technical) return;

  const scoreByCell = new Map();

  for (const config of TECHNICAL_CELL_MAP) {
    overwriteCell(technical, config.cell, null);
    const score = getScoreValue(scoreMap, "technical", config.key);
    const value = score !== null ? round(score, 2) : null;
    overwriteCell(technical, config.cell, value);
    scoreByCell.set(config.cell, value);

    // Update COMPUTED % (column I) cached result: formula is (H/5)*weight
    const row = config.cell.slice(1);
    const weight = TECHNICAL_WEIGHT_MAP[config.cell] || 0;
    const computed = value !== null ? round((value / TECHNICAL_MAX_SCORE) * weight, 4) : 0;
    overwriteCellWithFormulaResult(technical, `I${row}`, computed);
  }

  // Update section total rows.
  for (const total of TECHNICAL_TOTAL_ROWS) {
    const hSum = total.members.reduce((sum, cell) => sum + (toNumber(scoreByCell.get(cell)) || 0), 0);
    const iSum = total.members.reduce((sum, cell) => {
      const val = toNumber(scoreByCell.get(cell)) || 0;
      const weight = TECHNICAL_WEIGHT_MAP[cell] || 0;
      return sum + (val / TECHNICAL_MAX_SCORE) * weight;
    }, 0);
    overwriteCellWithFormulaResult(technical, total.h, round(hSum, 2));
    overwriteCellWithFormulaResult(technical, total.i, round(iSum, 4));
  }

  // Update grand total in I12 (TOTAL % SCORE header row).
  const grandTotal = Array.from(scoreByCell.entries()).reduce((sum, [cell, val]) => {
    const weight = TECHNICAL_WEIGHT_MAP[cell] || 0;
    return sum + ((toNumber(val) || 0) / TECHNICAL_MAX_SCORE) * weight;
  }, 0);
  overwriteCell(technical, "I12", round(grandTotal, 4));
};

/** Writes behavioral evaluation scores to their mapped cells. */
const populateBehavioralScores = (workbook, scoreMap) => {
  const behavioral = workbook.getWorksheet("Behavioral Evaluation");
  if (!behavioral) return;

  let headTotal = 0;

  for (const config of BEHAVIORAL_CELL_MAP) {
    overwriteCell(behavioral, config.cell, null);
    const score = getScoreValue(scoreMap, "behavioral", config.key);
    overwriteCell(behavioral, config.cell, score !== null ? round(score, 2) : null);
    if (score !== null) {
      headTotal += score;
    }

    // Keep colleague/self-eval columns empty for export-generated files.
    const row = config.cell.slice(1);
    overwriteCell(behavioral, `C${row}`, null);
    overwriteCell(behavioral, `D${row}`, null);

    // Update the row average cached result so values are visible without manual recalc.
    if (score !== null) {
      overwriteCellWithFormulaResult(behavioral, `E${row}`, round(score, 2));
    }
  }

  // Keep template formulas intact while updating cached total results.
  const roundedHeadTotal = round(headTotal, 2);
  const weightedScore = round((roundedHeadTotal / 75) * 5, 4);

  overwriteCellWithFormulaResult(behavioral, "B29", roundedHeadTotal);
  overwriteCellWithFormulaResult(behavioral, "C29", 0);
  overwriteCellWithFormulaResult(behavioral, "D29", 0);
  overwriteCellWithFormulaResult(behavioral, "E29", roundedHeadTotal);
  overwriteCellWithFormulaResult(behavioral, "E30", weightedScore);
};

/** Writes role-dimension ratings to Sheet2 (columns B:F, rows 2:9). */
const populateSheet2Ratings = (workbook, scoreMap) => {
  const sheet2 = workbook.getWorksheet("Sheet2");
  if (!sheet2) return;

  // Clear template defaults so exports only show values entered from the web tab.
  for (const role of SHEET2_RATING_ROLES) {
    for (const dimension of SHEET2_RATING_DIMENSIONS) {
      const cellRef = `${dimension.column}${role.row}`;
      const cell = sheet2.getCell(cellRef);
      overwriteCell(sheet2, cellRef, null);
      const clearedStyle = { ...(cell.style || {}) };
      delete clearedStyle.fill;
      cell.style = clearedStyle;
    }
  }

  // Write saved values.
  for (const role of SHEET2_RATING_ROLES) {
    for (const dimension of SHEET2_RATING_DIMENSIONS) {
      const criterionKey = getSheet2CriterionKey(role.key, dimension.key);
      const score = getScoreValue(scoreMap, SHEET2_RATING_SHEET, criterionKey);
      const level = toSheet2RatingLevel(score);
      if (level === null) continue;

      const cellRef = `${dimension.column}${role.row}`;
      const cell = sheet2.getCell(cellRef);
      overwriteCell(sheet2, cellRef, level);
      const styledCell = { ...(cell.style || {}) };
      styledCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: SHEET2_RATING_COLOR_BY_LEVEL[level] || "FF92D050" },
      };
      styledCell.font = {
        ...(styledCell.font || cell.font || {}),
        color: { argb: "FF000000" },
      };
      styledCell.alignment = {
        ...(styledCell.alignment || cell.alignment || {}),
        horizontal: "center",
        vertical: "middle",
      };
      cell.style = styledCell;
    }
  }
};

/** Retrieves all quiz_grades entries from the score map, sorted by label. */
const getQuizGradesEntries = (scoreMap) => {
  const entries = [];
  for (const score of scoreMap.values()) {
    if (score.sheet !== "quiz_grades") continue;
    entries.push(score);
  }
  entries.sort((a, b) =>
    String(a.criterion_label || "").localeCompare(String(b.criterion_label || ""))
  );
  return entries;
};

/** Converts a quiz raw score to its equivalent (0 if score is 0, otherwise 50–100). */
const computeQuizEquivalent = (rawScore, totalItems) => {
  const score = toNumber(rawScore);
  const total = toNumber(totalItems);
  if (score === null || total === null || total <= 0) return null;
  if (score <= 0) return 0;
  return round((score / total) * 50 + 50, 4);
};

/** Converts a quiz equivalent score to a 1–5 rating. */
const computeQuizRating = (equivalent) => {
  const eq = toNumber(equivalent);
  if (eq === null) return 0;
  if (eq <= 0) return 0;
  if (eq <= 60) return 1;
  if (eq <= 70) return 2;
  if (eq <= 85) return 3;
  if (eq <= 96) return 4;
  return 5;
};

/**
 * Populates the ScoreBoard sheet with activity scores, quiz data, and criterion averages.
 * @param {object} workbook - ExcelJS workbook
 * @param {Map} scoreMap
 * @returns {object} Computed criterion averages
 */
const populateScoreBoard = (workbook, scoreMap) => {
  const scoreBoard = workbook.getWorksheet("ScoreBoard");
  const criterionAverages = computeScoreboardCriterionAverages(scoreMap);
  if (!scoreBoard) return criterionAverages;

  // Template formula has an invalid token (+#REF!). Replace it once per export.
  overwriteCell(scoreBoard, "D1", { formula: "E1+G1+I1+K1" });

  // Keep row-3 formulas but set cached results so exported values are stable.
  for (const [criterionKey, cellRef] of Object.entries(SCOREBOARD_CRITERION_CELL_MAP)) {
    if (!cellRef) continue;
    const value = toNumber(criterionAverages[criterionKey]);
    const current = scoreBoard.getCell(cellRef).value;
    if (current && typeof current === "object" && current.formula) {
      overwriteCell(scoreBoard, cellRef, {
        formula: current.formula,
        result: value !== null ? round(value, 4) : 0,
      });
    } else {
      overwriteCell(scoreBoard, cellRef, value !== null ? round(value, 4) : 0);
    }
  }

  [
    "C",
    "D",
    "E",
    "G",
    "I",
    "K",
    "M",
    "N",
    "P",
    "R",
    "T",
    "V",
    "W",
    "Y",
    "AA",
    "AC",
    "AD",
    "AF",
    "AH",
    "AI",
    "AK",
    "AM",
    "AN",
    "AO",
    "AP",
    "AQ",
    "AR",
    "AS",
    "AU",
    "AV",
    "AW",
  ].forEach((column) => {
    clearColumnRange(scoreBoard, column, SCOREBOARD_ROWS.start, SCOREBOARD_ROWS.end);
  });

  const activities = getScoreboardActivities(scoreMap);

  // Laboratory Activities (left matrix) should list projects/activities only, not quizzes.
  const laboratoryActivities = activities.filter((activity) => {
    const activityKey = String(activity?.activityKey || "").trim().toLowerCase();
    const hasQuizKeyPrefix = activityKey.startsWith("quiz_");
    const hasQuizGradeEntry = Boolean(getScoreEntry(scoreMap, "quiz_grades", activity.activityKey));
    return !hasQuizKeyPrefix && !hasQuizGradeEntry;
  });

  const maxEntries = SCOREBOARD_ROWS.end - SCOREBOARD_ROWS.start + 1;
  laboratoryActivities.slice(0, maxEntries).forEach((activity, index) => {
    const row = SCOREBOARD_ROWS.start + index;
    const label = activity.label || `Entry ${index + 1}`;
    const criterionValues = Object.values(activity.criterionScores)
      .map(toNumber)
      .filter((value) => value !== null);
    const hasCriterionScores = criterionValues.length > 0;

    const assessmentScoreFromSource = toNumber(activity.assessmentScore);
    const assessmentMaxFromSource = toNumber(activity.assessmentMax);
    const assessmentScore =
      assessmentScoreFromSource !== null
        ? assessmentScoreFromSource
        : hasCriterionScores
          ? round(average(criterionValues), 4)
          : null;
    const assessmentMax =
      assessmentScoreFromSource !== null
        ? assessmentMaxFromSource && assessmentMaxFromSource > 0
          ? assessmentMaxFromSource
          : 5
        : 5;
    const legacyNormalizedFallback =
      !hasCriterionScores &&
      assessmentScore !== null &&
      activity.source === "auto_activity"
        ? round(normalizeScoreToFive(assessmentScore, assessmentMax) ?? 0, 4)
        : null;

    // Main scoreboard matrix (left side of template).
    overwriteCell(scoreBoard, `C${row}`, label);
    overwriteCell(scoreBoard, `D${row}`, { formula: `E${row}+G${row}+I${row}+K${row}` });
    overwriteCell(scoreBoard, `M${row}`, { formula: `N${row}+P${row}+R${row}+T${row}` });
    overwriteCell(scoreBoard, `V${row}`, { formula: `W${row}+Y${row}+AA${row}` });
    overwriteCell(scoreBoard, `AC${row}`, { formula: `AD${row}+AF${row}` });
    overwriteCell(scoreBoard, `AH${row}`, { formula: `AI${row}+AK${row}` });

    // Ensure all rubric criteria are explicit in Excel:
    // missing/ungraded criteria are exported as 0 (e.g., no submission / needs grading).
    for (const [criterionKey, columnConfig] of Object.entries(SCOREBOARD_CRITERION_COLUMN_MAP)) {
      const normalized = toNumber(activity.criterionScores?.[criterionKey]);
      const normalizedValue =
        normalized !== null
          ? round(normalized, 4)
          : legacyNormalizedFallback !== null
            ? legacyNormalizedFallback
            : 0;
      const rawMax = toNumber(scoreBoard.getCell(`${columnConfig.rawCol}1`).value) || 5;
      const rawValue = round((normalizedValue / 5) * rawMax, 4);

      overwriteCell(scoreBoard, `${columnConfig.rawCol}${row}`, rawValue);
      overwriteCell(scoreBoard, `${columnConfig.normalizedCol}${row}`, {
        formula: `${columnConfig.rawCol}${row}*$${columnConfig.normalizedCol}$1/$${columnConfig.rawCol}$1`,
        result: normalizedValue,
      });
    }

  });

  // Assessment list (right side of template) — quizzes only.
  const quizOnlyActivities = activities.filter((a) => {
    const qg = getScoreEntry(scoreMap, "quiz_grades", a.activityKey);
    return qg !== null && qg !== undefined;
  });

  const allEquivalents = [];
  quizOnlyActivities.slice(0, maxEntries).forEach((quiz, qIdx) => {
    const row = SCOREBOARD_ROWS.start + qIdx;
    const label = quiz.label || `Quiz ${qIdx + 1}`;
    const quizGradeEntry = getScoreEntry(scoreMap, "quiz_grades", quiz.activityKey);
    const quizRawScore = toNumber(quizGradeEntry.score);
    const quizTotalItems = toNumber(quizGradeEntry.max_score);
    const equivalent = computeQuizEquivalent(quizRawScore, quizTotalItems);
    const rating = computeQuizRating(equivalent);
    if (equivalent !== null) allEquivalents.push(equivalent);

    overwriteCell(scoreBoard, `AM${row}`, quiz.activityKey || "");
    overwriteCell(scoreBoard, `AN${row}`, qIdx + 1);
    overwriteCell(scoreBoard, `AO${row}`, label);
    overwriteCell(scoreBoard, `AQ${row}`, quizRawScore);
    overwriteCell(scoreBoard, `AR${row}`, {
      formula: `IFERROR(IF(AQ${row}<=0,0,(AQ${row}/AS${row})*50+50), 0)`,
      result: equivalent !== null ? round(equivalent, 2) : 0,
    });
    overwriteCell(scoreBoard, `AS${row}`, quizTotalItems);
    overwriteCell(scoreBoard, `AP${row}`, {
      formula: `IF(ISNUMBER(AR${row}), IF(AR${row}<=0, 0, IF(AR${row}<=60, 1, IF(AR${row}<=70, 2, IF(AR${row}<=85, 3, IF(AR${row}<=96, 4, 5))))), 0)`,
      result: rating,
    });
    // AI column: Summative Assessment = Equivalent * 0.8 (template formula)
    overwriteCell(scoreBoard, `AI${row}`, {
      formula: `AR${row}*0.8`,
      result: equivalent !== null ? round(equivalent * 0.8, 2) : 0,
    });
    overwriteCell(scoreBoard, `AU${row}`, qIdx + 1);
    overwriteCell(scoreBoard, `AV${row}`, label);
    overwriteCell(scoreBoard, `AW${row}`, true);
  });

  // Update AR3 summary (average equivalent, including explicit 0 values).
  const avgEquivalent = allEquivalents.length > 0
    ? round(allEquivalents.reduce((s, e) => s + e, 0) / allEquivalents.length, 2)
    : 0;
  overwriteCell(scoreBoard, "AR3", {
    formula: `IFERROR(AVERAGE(OFFSET(AR4, 0, 0, COUNTA(AR4:AR1000), 1)), 0)`,
    result: avgEquivalent,
  });

  return criterionAverages;
};

/** Populates the Performance Summary sheet with overall rating and contributions. */
const populatePerformanceSummary = (
  workbook,
  evaluation,
  traineeInfo,
  traineeName,
  overallContribution,
  summaryContributions
) => {
  const summary = workbook.getWorksheet("Performance Summary");
  if (!summary) return;

  const coveredPeriod = formatCoveredPeriod(evaluation.period_start, evaluation.period_end);
  const rating = toAdjectival(overallContribution);
  const overallPercent = round(overallContribution * 100, 2);

  overwriteCell(summary, "D2", `${overallPercent}%`);
  overwriteCell(summary, "D3", safeUpper(traineeName));
  overwriteCell(summary, "D4", safeUpper(traineeInfo.department));
  overwriteCell(summary, "D5", safeUpper(traineeInfo.nickname || traineeName));
  overwriteCell(summary, "D6", formatDateText(traineeInfo.date_hired));
  overwriteCell(summary, "D7", coveredPeriod);
  overwriteCell(summary, "D8", safeUpper(traineeInfo.trainer));

  // Replace stale template narrative with computed interpretation.
  overwriteCell(summary, "J4", rating.interpretation);

  // Clear template feedback placeholders on summary rows.
  for (let row = 13; row <= 17; row += 1) {
    overwriteCell(summary, `F${row}`, null);
    overwriteCell(summary, `I${row}`, null);
  }
  // K13 is the top-left cell of merged reflection block K13:L17.
  overwriteCell(summary, "K13", null);

  overwriteCell(summary, "G4", rating.adjectival);
  overwriteCell(summary, "H4", rating.recommendation);
  overwriteCell(summary, "I4", rating.recommendation);

  overwriteCell(summary, "E13", summaryContributions.A);
  overwriteCell(summary, "E14", summaryContributions.B);
  overwriteCell(summary, "E15", summaryContributions.C);
  overwriteCell(summary, "E16", summaryContributions.D);
  overwriteCell(summary, "E17", summaryContributions.E);
};

/** Removes a worksheet by name if it exists. */
const removeWorksheetByName = (workbook, worksheetName) => {
  if (!workbook || !worksheetName) return;
  const worksheet = workbook.getWorksheet(worksheetName);
  if (!worksheet) return;
  workbook.removeWorksheet(worksheet.id);
};

/**
 * Builds a complete evaluation Excel workbook from an evaluation ID.
 * @param {string} evaluationId
 * @returns {Promise<{ buffer: Buffer, fileName: string }>}
 * @throws {AppError} If the template is missing or evaluation not found
 */
const buildEvaluationWorkbook = async (evaluationId) => {
  const ExcelJS = getExcelJs();
  const evaluation = await evaluationService.getEvaluation(evaluationId);
  const scoreMap = buildScoreMap(evaluation.scores ?? []);
  const traineeInfo = evaluation.trainee_info || {};
  const traineeName = evaluation.trainee_name || "Evaluation";

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(TEMPLATE_PATH);
  } catch (error) {
    throw new AppError("Unable to load evaluation export template.", 500, "EXPORT_TEMPLATE_MISSING", {
      templatePath: TEMPLATE_PATH,
      originalError: error.message,
    });
  }

  // Export should not include raw Checklist tab from the source template.
  removeWorksheetByName(workbook, "Checklist");

  workbook.calcProperties.fullCalcOnLoad = true;

  const scoreboardAverages = populateScoreBoard(workbook, scoreMap);
  const bootcampResults = computeBootcampResults(scoreMap, scoreboardAverages);
  const performanceResults = computePerformanceResults(scoreMap, scoreboardAverages);
  const summaryContributions = computeSummaryContributions(scoreMap, scoreboardAverages);
  const overallContribution = round(
    (bootcampResults.totalContribution + performanceResults.totalContribution) / 2,
    4
  );

  populateHeaders(workbook, evaluation, traineeInfo, traineeName);
  populateBootcampActualCriteria(workbook, scoreMap, scoreboardAverages);
  populateBootcampDerivedActuals(workbook, scoreMap, scoreboardAverages);
  populateBootcampComputedSummaries(workbook, bootcampResults);
  populateBootcampEndorsementFeedback(workbook, scoreMap);
  populateTechnicalScores(workbook, scoreMap);
  populatePerformanceSheets(workbook, scoreMap, performanceResults);
  populateRegularizationEndorsement(workbook);
  populateDashboardScores(workbook, scoreMap, bootcampResults);
  populateBehavioralScores(workbook, scoreMap);
  populateSheet2Ratings(workbook, scoreMap);
  populatePerformanceSummary(
    workbook,
    evaluation,
    traineeInfo,
    traineeName,
    overallContribution,
    summaryContributions
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const dateToken = new Date().toISOString().slice(0, 10);
  const safeName = String(traineeName || "evaluation")
    .replace(/[^A-Za-z0-9\s_-]/g, " ")
    .replace(/\s+/g, "_")
    .trim();
  const fileName = `${safeName || "evaluation"}_evaluation_${dateToken}.xlsx`;

  return { buffer, fileName };
};

module.exports = { buildEvaluationWorkbook };
