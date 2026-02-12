const path = require("path");
const { evaluationService } = require("./evaluationService");
const { AppError } = require("../utils/errors");

let cachedExcelJs = null;

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

const TEMPLATE_PATH = path.resolve(
  __dirname,
  "../../../docs/[Template] - SSCGI Training Roadmap v3.xlsx"
);

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

const PERFORMANCE_CATEGORY_CONFIG = [
  { key: "pe_a", category: "A", weight: 0.25, row: 12 },
  { key: "pe_b", category: "B", weight: 0.2, row: 13 },
  { key: "pe_c", category: "C", weight: 0.15, row: 14 },
  { key: "pe_d", category: "D", weight: 0.1, row: 15 },
  { key: "pe_e", category: "E", weight: 0.1, row: 16 },
  { key: "pe_f", category: "F", weight: 0.1, row: 17 },
  { key: "pe_g", category: "G", weight: 0.1, row: 18 },
];

const TECHNICAL_CELL_MAP = [
  { key: "te_technical_knowledge", cell: "H15" },
  { key: "te_code_quality", cell: "H16" },
  { key: "te_debugging", cell: "H17" },
  { key: "te_system_design", cell: "H20" },
  { key: "te_documentation", cell: "H23" },
  { key: "te_testing", cell: "H26" },
  { key: "te_tools", cell: "H27" },
  { key: "te_best_practices", cell: "H30" },
];

const BEHAVIORAL_CELL_MAP = [
  { key: "bh_adaptability", cell: "B13" },
  { key: "bh_initiative", cell: "B14" },
  { key: "bh_dependability", cell: "B15" },
  { key: "bh_cooperation", cell: "B16" },
  { key: "bh_communication", cell: "B17" },
  { key: "bh_attitude", cell: "B18" },
  { key: "bh_professionalism", cell: "B19" },
  { key: "bh_attendance", cell: "B20" },
];

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

const BOOTCAMP_ENDORSEMENT_FEEDBACK_ROW_MAP = {
  A: 12,
  B: 13,
  C: 14,
  D: 15,
  E: 16,
  F: 17,
  G: 18,
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value, places = 4) => {
  const numeric = toNumber(value);
  if (numeric === null) return 0;
  const factor = 10 ** places;
  return Math.round(numeric * factor) / factor;
};

const clampScore = (value, min = 0, max = 5) => {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return Math.min(Math.max(numeric, min), max);
};

const safeUpper = (value) => String(value || "").trim().toUpperCase();

const formatDateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
};

const formatCoveredPeriod = (start, end) => {
  if (start && end) return `${formatDateText(start)} - ${formatDateText(end)}`;
  return formatDateText(start || end);
};

const buildScoreMap = (scores) => {
  const map = new Map();
  for (const score of scores ?? []) {
    map.set(`${score.sheet}:${score.criterion_key}`, score);
  }
  return map;
};

const getScoreEntry = (scoreMap, sheet, key) => scoreMap.get(`${sheet}:${key}`) || null;

const getScoreValue = (scoreMap, sheet, key) => {
  const entry = getScoreEntry(scoreMap, sheet, key);
  return clampScore(entry?.score);
};

const getScoreRemarks = (scoreMap, sheet, key) => {
  const entry = getScoreEntry(scoreMap, sheet, key);
  return entry?.remarks || "";
};

const normalizeScoreToFive = (score, maxScore) => {
  const numericScore = toNumber(score);
  if (numericScore === null) return null;
  const numericMax = toNumber(maxScore);
  const safeMax = numericMax && numericMax > 0 ? numericMax : 5;
  return clampScore((numericScore / safeMax) * 5, 0, 5);
};

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

const getScoreboardCriterionKey = (entry) => {
  const { criterionKey } = parseScoreboardEntry(entry);
  return criterionKey;
};

const getScoreboardEntries = (scoreMap) =>
  Array.from(scoreMap.values()).filter((score) => score.sheet === "scoreboard");

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

    if (String(entry?.category || "").trim() === SCOREBOARD_META_CATEGORY) {
      continue;
    }

    const rawScore = toNumber(entry.score);
    const rawMax = toNumber(entry.max_score);
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

const getBootcampCriterionScore = (scoreMap, scoreboardAverages, criterionKey) => {
  const fromScoreboard = toNumber(scoreboardAverages?.[criterionKey]);
  if (fromScoreboard !== null) return fromScoreboard;
  return null;
};

const average = (values) => {
  const numeric = values.map(toNumber).filter((v) => v !== null);
  if (numeric.length === 0) return 0;
  return numeric.reduce((sum, current) => sum + current, 0) / numeric.length;
};

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

const computePerformanceResults = (scoreMap) => {
  const categoryScores = {};
  const categoryContributions = {};
  let totalContribution = 0;

  for (const config of PERFORMANCE_CATEGORY_CONFIG) {
    const score = getScoreValue(scoreMap, "performance", config.key);
    const normalizedScore = score ?? 0;
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
  ]);

  const collaborationAvg = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a1_teamwork"),
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "a4_leadership"),
    getScoreValue(scoreMap, "behavioral", "bh_cooperation"),
    getScoreValue(scoreMap, "behavioral", "bh_professionalism"),
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

const overwriteCell = (worksheet, cellRef, value) => {
  if (!worksheet) return;
  worksheet.getCell(cellRef).value = value;
};

const overwriteCellWithFormulaResult = (worksheet, cellRef, result) => {
  if (!worksheet) return;
  const nextResult = toNumber(result) ?? 0;
  const currentValue = worksheet.getCell(cellRef).value;
  if (currentValue && typeof currentValue === "object" && currentValue.formula) {
    overwriteCell(worksheet, cellRef, {
      formula: currentValue.formula,
      result: nextResult,
    });
    return;
  }
  overwriteCell(worksheet, cellRef, nextResult);
};

const clearColumnRange = (worksheet, column, startRow, endRow) => {
  if (!worksheet) return;
  for (let row = startRow; row <= endRow; row += 1) {
    worksheet.getCell(`${column}${row}`).value = null;
  }
};

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
  overwriteCell(scorecard, "C3", safeUpper(traineeName));
  overwriteCell(scorecard, "C4", department);
  overwriteCell(scorecard, "C5", dateHired);
  overwriteCell(scorecard, "C6", coveredPeriod);
  overwriteCell(scorecard, "C7", formatDateText(traineeInfo.date_endorsed || traineeInfo.target_join_date));
  overwriteCell(scorecard, "C8", trainer);

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
    traineeInfo.current_job_title || traineeInfo.position || "Software Developer I"
  );
};

const populateBootcampDerivedActuals = (workbook, scoreMap, scoreboardAverages) => {
  const scorecard = workbook.getWorksheet("BootCampScoreCard");
  if (!scorecard) return;

  const complianceOne = getBootcampCriterionScore(scoreMap, scoreboardAverages, "f1_policies");
  const complianceTwo = getBootcampCriterionScore(scoreMap, scoreboardAverages, "f2_reporting");
  overwriteCell(scorecard, "N40", complianceOne !== null ? round(complianceOne, 2) : null);
  overwriteCell(scorecard, "N41", complianceTwo !== null ? round(complianceTwo, 2) : null);

  // Populate Summative Assessment (N36) from quiz grades equivalent if available
  // Template formula: AI = AR * 0.8, where AR = (Score/TotalItems)*50+50
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
      overwriteCell(scorecard, "N36", summativeScore);
    }
  }

  const behavioralAvg = average([
    getScoreValue(scoreMap, "behavioral", "bh_adaptability"),
    getScoreValue(scoreMap, "behavioral", "bh_initiative"),
    getScoreValue(scoreMap, "behavioral", "bh_dependability"),
    getScoreValue(scoreMap, "behavioral", "bh_cooperation"),
    getScoreValue(scoreMap, "behavioral", "bh_communication"),
    getScoreValue(scoreMap, "behavioral", "bh_attitude"),
    getScoreValue(scoreMap, "behavioral", "bh_professionalism"),
    getScoreValue(scoreMap, "behavioral", "bh_attendance"),
  ]);

  const ethicsFallback = average([
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "g1_integrity"),
    getBootcampCriterionScore(scoreMap, scoreboardAverages, "g2_respect"),
  ]);

  const ethicsScore = behavioralAvg > 0 ? behavioralAvg : ethicsFallback;
  overwriteCell(scorecard, "N44", ethicsScore > 0 ? round(ethicsScore, 2) : null);
};

const populateDashboardScores = (workbook, bootcampResults, performanceResults) => {
  const dashboard = workbook.getWorksheet("Dashboard");
  if (!dashboard) return;

  const categories = ["A", "B", "C", "D", "E", "F", "G"];
  const bootcampRows = [14, 15, 16, 17, 18, 19, 20];
  const performanceRows = [26, 27, 28, 29, 30, 31, 32];

  for (let index = 0; index < categories.length; index += 1) {
    const category = categories[index];
    const bootcampContribution = bootcampResults.categoryContributions[category] || 0;
    const performanceContribution = performanceResults.categoryContributions[category] || 0;

    overwriteCell(dashboard, `F${bootcampRows[index]}`, round(bootcampContribution, 4));
    overwriteCell(dashboard, `F${performanceRows[index]}`, round(performanceContribution, 4));
  }
};

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
  overwriteCellWithFormulaResult(endorsement, "E19", roundedTotal);

  // Endorsement header cells showing total computed score.
  ["G5", "G6", "G7", "G8"].forEach((cellRef) => {
    overwriteCellWithFormulaResult(endorsement, cellRef, roundedTotal);
  });
};

const populateBootcampEndorsementFeedback = (workbook, scoreMap) => {
  const endorsement = workbook.getWorksheet("BootcampEndorsementScoreCard");
  if (!endorsement) return;

  for (const category of BOOTCAMP_CATEGORIES) {
    const row = BOOTCAMP_ENDORSEMENT_FEEDBACK_ROW_MAP[category];
    if (!row) continue;

    // Always clear template placeholder/default text first.
    overwriteCell(endorsement, `F${row}`, null);
    overwriteCell(endorsement, `H${row}`, null);

    const strengthKey = `cat_${category}_strength`;
    const improvementKey = `cat_${category}_improvement`;

    const strength = String(
      getScoreRemarks(scoreMap, BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET, strengthKey) || ""
    ).trim();
    const improvement = String(
      getScoreRemarks(scoreMap, BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET, improvementKey) || ""
    ).trim();

    if (strength) {
      overwriteCell(endorsement, `F${row}`, strength);
    }
    if (improvement) {
      overwriteCell(endorsement, `H${row}`, improvement);
    }
  }
};

const populatePerformanceSheets = (workbook, scoreMap, performanceResults) => {
  const performanceSheet = workbook.getWorksheet("Performance Evaluation");
  const part1Sheet = workbook.getWorksheet("Part 1 Evaluation");

  for (const config of PERFORMANCE_CATEGORY_CONFIG) {
    const contribution = performanceResults.categoryContributions[config.category] || 0;
    const remarks = getScoreRemarks(scoreMap, "performance", config.key);

    overwriteCell(performanceSheet, `E${config.row}`, round(contribution, 4));
    overwriteCell(part1Sheet, `E${config.row}`, round(contribution, 4));

    if (remarks) {
      overwriteCell(performanceSheet, `H${config.row}`, remarks);
    }
  }
};

const populateTechnicalScores = (workbook, scoreMap) => {
  const technical = workbook.getWorksheet("Technical Evaluation");
  if (!technical) return;

  for (const config of TECHNICAL_CELL_MAP) {
    overwriteCell(technical, config.cell, null);
    const score = getScoreValue(scoreMap, "technical", config.key);
    overwriteCell(technical, config.cell, score !== null ? round(score, 2) : null);
  }
};

const populateBehavioralScores = (workbook, scoreMap) => {
  const behavioral = workbook.getWorksheet("Behavioral Evaluation");
  if (!behavioral) return;

  for (const config of BEHAVIORAL_CELL_MAP) {
    overwriteCell(behavioral, config.cell, null);
    const score = getScoreValue(scoreMap, "behavioral", config.key);
    overwriteCell(behavioral, config.cell, score !== null ? round(score, 2) : null);

    // Keep colleague/self-eval columns empty for export-generated files.
    const row = config.cell.slice(1);
    overwriteCell(behavioral, `C${row}`, null);
    overwriteCell(behavioral, `D${row}`, null);
  }
};

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

const computeQuizEquivalent = (rawScore, totalItems) => {
  const score = toNumber(rawScore);
  const total = toNumber(totalItems);
  if (score === null || total === null || total <= 0) return null;
  return round((score / total) * 50 + 50, 4);
};

const computeQuizRating = (equivalent) => {
  const eq = toNumber(equivalent);
  if (eq === null) return 0;
  if (eq <= 60) return 1;
  if (eq <= 70) return 2;
  if (eq <= 85) return 3;
  if (eq <= 96) return 4;
  return 5;
};

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

  const maxEntries = SCOREBOARD_ROWS.end - SCOREBOARD_ROWS.start + 1;
  activities.slice(0, maxEntries).forEach((activity, index) => {
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

    // Main scoreboard matrix (left side of template).
    overwriteCell(scoreBoard, `C${row}`, label);
    overwriteCell(scoreBoard, `D${row}`, { formula: `E${row}+G${row}+I${row}+K${row}` });
    overwriteCell(scoreBoard, `M${row}`, { formula: `N${row}+P${row}+R${row}+T${row}` });
    overwriteCell(scoreBoard, `V${row}`, { formula: `W${row}+Y${row}+AA${row}` });
    overwriteCell(scoreBoard, `AC${row}`, { formula: `AD${row}+AF${row}` });
    overwriteCell(scoreBoard, `AH${row}`, { formula: `AI${row}+AK${row}` });

    for (const [criterionKey, normalized] of Object.entries(activity.criterionScores)) {
      if (normalized === null || normalized === undefined) continue;
      const columnConfig = SCOREBOARD_CRITERION_COLUMN_MAP[criterionKey];
      if (columnConfig) {
        const rawMax = toNumber(scoreBoard.getCell(`${columnConfig.rawCol}1`).value) || 5;
        const rawValue = (normalized / 5) * rawMax;
        overwriteCell(scoreBoard, `${columnConfig.rawCol}${row}`, round(rawValue, 4));
        overwriteCell(scoreBoard, `${columnConfig.normalizedCol}${row}`, {
          formula: `${columnConfig.rawCol}${row}*$${columnConfig.normalizedCol}$1/$${columnConfig.rawCol}$1`,
          result: round(normalized, 4),
        });
      }
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
      formula: `IFERROR((AQ${row}/AS${row})*50+50, " ")`,
      result: equivalent !== null ? round(equivalent, 2) : 0,
    });
    overwriteCell(scoreBoard, `AS${row}`, quizTotalItems);
    overwriteCell(scoreBoard, `AP${row}`, {
      formula: `IF(ISNUMBER(AR${row}), IF(AR${row}<=60, 1, IF(AR${row}<=70, 2, IF(AR${row}<=85, 3, IF(AR${row}<=96, 4, 5)))), 0)`,
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

  // Update AR3 summary (average of non-zero equivalents) with computed result
  const avgEquivalent = allEquivalents.length > 0
    ? round(allEquivalents.reduce((s, e) => s + e, 0) / allEquivalents.length, 2)
    : 0;
  overwriteCell(scoreBoard, "AR3", {
    formula: `IFERROR(SUMIF(OFFSET(AR4, 0, 0, COUNTA(AR4:AR1000), 1), "<>0") / COUNTIF(OFFSET(AR4, 0, 0, COUNTA(AR4:AR1000), 1), "<>0"), 0)`,
    result: avgEquivalent,
  });

  return criterionAverages;
};

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

  overwriteCell(summary, "G4", rating.adjectival);
  overwriteCell(summary, "H4", rating.recommendation);
  overwriteCell(summary, "I4", rating.recommendation);

  overwriteCell(summary, "E13", summaryContributions.A);
  overwriteCell(summary, "E14", summaryContributions.B);
  overwriteCell(summary, "E15", summaryContributions.C);
  overwriteCell(summary, "E16", summaryContributions.D);
  overwriteCell(summary, "E17", summaryContributions.E);
};

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

  workbook.calcProperties.fullCalcOnLoad = true;

  const scoreboardAverages = populateScoreBoard(workbook, scoreMap);
  const bootcampResults = computeBootcampResults(scoreMap, scoreboardAverages);
  const performanceResults = computePerformanceResults(scoreMap);
  const summaryContributions = computeSummaryContributions(scoreMap, scoreboardAverages);
  const overallContribution = round(
    (bootcampResults.totalContribution + performanceResults.totalContribution) / 2,
    4
  );

  populateHeaders(workbook, evaluation, traineeInfo, traineeName);
  populateBootcampDerivedActuals(workbook, scoreMap, scoreboardAverages);
  populateBootcampComputedSummaries(workbook, bootcampResults);
  populateBootcampEndorsementFeedback(workbook, scoreMap);
  populateDashboardScores(workbook, bootcampResults, performanceResults);
  populatePerformanceSheets(workbook, scoreMap, performanceResults);
  populateTechnicalScores(workbook, scoreMap);
  populateBehavioralScores(workbook, scoreMap);
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
