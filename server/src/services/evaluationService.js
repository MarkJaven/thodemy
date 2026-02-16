/**
 * Evaluation Service
 * Manages trainee evaluations, scores, and auto-population from quiz/activity data.
 * @module services/evaluationService
 */

const { supabaseAdmin } = require("../config/supabase");
const {
  BadRequestError,
  ExternalServiceError,
  NotFoundError,
} = require("../utils/errors");

/**
 * Safely converts a value to a number.
 * @param {*} value - Value to convert
 * @returns {number|null} Parsed number or null if invalid
 */
const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Restricts a value within a min-max range.
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Rounds a number to specified decimal places.
 * @param {number} value - Value to round
 * @param {number} [places=2] - Number of decimal places
 * @returns {number} Rounded value
 */
const round = (value, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Allowed score source types */
const ALLOWED_SCORE_SOURCES = new Set(["manual", "auto_quiz", "auto_activity"]);

/**
 * Filters an array to keep only the latest entry for each unique key.
 * @param {Array} rows - Array of data rows
 * @param {Function} keyGetter - Function to extract unique key from a row
 * @param {Function} dateGetter - Function to extract timestamp from a row
 * @returns {Array} Array of latest entries by key
 */
const pickLatestEntriesByKey = (rows, keyGetter, dateGetter) => {
  const latest = new Map();

  for (const row of rows ?? []) {
    const key = keyGetter(row);
    if (!key) continue;

    const existing = latest.get(key);
    const currentTs = new Date(dateGetter(row) || 0).getTime();
    const existingTs = existing ? new Date(dateGetter(existing) || 0).getTime() : -1;

    if (!existing || currentTs >= existingTs) {
      latest.set(key, row);
    }
  }

  return Array.from(latest.values());
};

/**
 * Normalizes a score to a 5-point scale.
 * @param {number} score - Raw score value
 * @param {number} maxScore - Maximum possible score
 * @returns {number|null} Score normalized to 0-5 scale
 */
const normalizeToFiveScale = (score, maxScore) => {
  const numericScore = toNumber(score);
  if (numericScore === null) return null;
  const numericMax = toNumber(maxScore);
  const safeMax = numericMax && numericMax > 0 ? numericMax : 5;
  return clamp((numericScore / safeMax) * 5, 0, 5);
};

/**
 * Normalizes activity scores from various scales (5, 10, 20, 50, 100) to a 5-point scale.
 * @param {number} rawScore - Raw activity score
 * @returns {number|null} Normalized score on 0-5 scale
 */
const normalizeActivityScore = (rawScore) => {
  const score = toNumber(rawScore);
  if (score === null) return null;
  if (score <= 5) return clamp(score, 0, 5);
  if (score <= 10) return clamp((score / 10) * 5, 0, 5);
  if (score <= 20) return clamp((score / 20) * 5, 0, 5);
  if (score <= 50) return clamp((score / 50) * 5, 0, 5);
  return clamp((score / 100) * 5, 0, 5);
};

/**
 * Retrieves evaluations with enriched user and learning path data.
 * @param {Object} [options={}] - Query options
 * @param {string} [options.userId] - Filter by user ID
 * @param {string} [options.status] - Filter by status (draft, completed)
 * @returns {Promise<Array>} List of evaluations with trainee/evaluator names
 * @throws {ExternalServiceError}
 */
const listEvaluations = async ({ userId, status } = {}) => {
  let query = supabaseAdmin
    .from("evaluations")
    .select("id, user_id, learning_path_id, evaluator_id, status, trainee_info, period_start, period_end, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    throw new ExternalServiceError("Unable to load evaluations", {
      code: error.code,
      details: error.message,
    });
  }

  // Enrich with profile names
  const userIds = Array.from(
    new Set(
      (data ?? [])
        .flatMap((e) => [e.user_id, e.evaluator_id])
        .filter(Boolean)
    )
  );

  let profileMap = new Map();
  if (userIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email")
      .in("id", userIds);
    (profiles ?? []).forEach((p) => profileMap.set(p.id, p));
  }

  // Enrich with learning path titles
  const lpIds = Array.from(
    new Set((data ?? []).map((e) => e.learning_path_id).filter(Boolean))
  );
  let lpMap = new Map();
  if (lpIds.length > 0) {
    const { data: lps } = await supabaseAdmin
      .from("learning_paths")
      .select("id, title")
      .in("id", lpIds);
    (lps ?? []).forEach((lp) => lpMap.set(lp.id, lp));
  }

  const formatName = (p) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.username ||
    p?.email ||
    "";

  return (data ?? []).map((e) => ({
    ...e,
    trainee_name: formatName(profileMap.get(e.user_id)),
    trainee_email: profileMap.get(e.user_id)?.email || "",
    evaluator_name: formatName(profileMap.get(e.evaluator_id)),
    learning_path_title: lpMap.get(e.learning_path_id)?.title || "",
  }));
};

/**
 * Retrieves a single evaluation with all scores and trainee info.
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<Object>} Evaluation with scores array and trainee details
 * @throws {NotFoundError}
 * @throws {ExternalServiceError}
 */
const getEvaluation = async (evaluationId) => {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .select("*")
    .eq("id", evaluationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError("Evaluation not found");
    }
    throw new ExternalServiceError("Unable to load evaluation", {
      code: error.code,
      details: error.message,
    });
  }

  const { data: scores, error: scoresError } = await supabaseAdmin
    .from("evaluation_scores")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("sheet")
    .order("category")
    .order("criterion_key");

  if (scoresError) {
    throw new ExternalServiceError("Unable to load evaluation scores", {
      code: scoresError.code,
      details: scoresError.message,
    });
  }

  // Enrich with profile
  let traineeProfile = null;
  if (data.user_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, username, email")
      .eq("id", data.user_id)
      .single();
    traineeProfile = profile;
  }

  const formatName = (p) =>
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.username ||
    p?.email ||
    "";

  return {
    ...data,
    trainee_name: formatName(traineeProfile),
    trainee_email: traineeProfile?.email || "",
    scores: scores ?? [],
  };
};

/**
 * Creates a new evaluation in draft status.
 * @param {Object} params - Evaluation parameters
 * @param {string} params.userId - Trainee user ID
 * @param {string} [params.learningPathId] - Associated learning path
 * @param {string} [params.evaluatorId] - Evaluator user ID
 * @param {Object} [params.traineeInfo] - Additional trainee metadata
 * @param {string} [params.periodStart] - Evaluation period start date
 * @param {string} [params.periodEnd] - Evaluation period end date
 * @returns {Promise<Object>} Created evaluation with ID
 * @throws {ExternalServiceError}
 */
const createEvaluation = async ({
  userId,
  learningPathId,
  evaluatorId,
  traineeInfo,
  periodStart,
  periodEnd,
}) => {
  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .insert({
      user_id: userId,
      learning_path_id: learningPathId || null,
      evaluator_id: evaluatorId || null,
      trainee_info: traineeInfo || {},
      period_start: periodStart || null,
      period_end: periodEnd || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    throw new ExternalServiceError("Unable to create evaluation", {
      code: error.code,
      details: error.message,
    });
  }

  return data;
};

/**
 * Updates an evaluation's allowed fields.
 * @param {string} evaluationId - Evaluation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated evaluation
 * @throws {NotFoundError}
 * @throws {ExternalServiceError}
 */
const updateEvaluation = async (evaluationId, updates) => {
  const allowedFields = [
    "status",
    "trainee_info",
    "period_start",
    "period_end",
    "learning_path_id",
    "evaluator_id",
  ];
  const filtered = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }

  const { data, error } = await supabaseAdmin
    .from("evaluations")
    .update(filtered)
    .eq("id", evaluationId)
    .select("id, status, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new NotFoundError("Evaluation not found");
    }
    throw new ExternalServiceError("Unable to update evaluation", {
      code: error.code,
      details: error.message,
    });
  }

  return data;
};

/**
 * Deletes an evaluation and all associated scores.
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<void>}
 * @throws {ExternalServiceError}
 */
const deleteEvaluation = async (evaluationId) => {
  const { error } = await supabaseAdmin
    .from("evaluations")
    .delete()
    .eq("id", evaluationId);

  if (error) {
    throw new ExternalServiceError("Unable to delete evaluation", {
      code: error.code,
      details: error.message,
    });
  }
};

/**
 * Creates or updates evaluation scores for specific criteria.
 * Validates, normalizes, and deduplicates scores before upserting.
 * @param {string} evaluationId - Evaluation ID
 * @param {Array<Object>} scores - Array of score objects
 * @returns {Promise<Array>} Upserted scores with IDs
 * @throws {NotFoundError}
 * @throws {BadRequestError}
 * @throws {ExternalServiceError}
 */
const upsertScores = async (evaluationId, scores) => {
  // Verify evaluation exists
  const { data: evaluation, error: evalError } = await supabaseAdmin
    .from("evaluations")
    .select("id")
    .eq("id", evaluationId)
    .single();

  if (evalError || !evaluation) {
    throw new NotFoundError("Evaluation not found");
  }

  if (!Array.isArray(scores)) {
    throw new BadRequestError("Scores payload must be an array.");
  }

  const deduped = new Map();

  for (const scoreInput of scores) {
    const sheet = String(scoreInput?.sheet || "").trim();
    const criterionKey = String(scoreInput?.criterion_key || "").trim();
    if (!sheet || !criterionKey) continue;

    const parsedMaxScore = toNumber(scoreInput.max_score);
    const safeMaxScore = parsedMaxScore && parsedMaxScore > 0 ? parsedMaxScore : 5;

    const parsedScore = toNumber(scoreInput.score);
    const normalizedScore =
      parsedScore === null ? null : clamp(parsedScore, 0, safeMaxScore);

    const parsedWeight = toNumber(scoreInput.weight);
    const source = ALLOWED_SCORE_SOURCES.has(scoreInput.source)
      ? scoreInput.source
      : "manual";

    deduped.set(`${sheet}:${criterionKey}`, {
      evaluation_id: evaluationId,
      sheet,
      category: scoreInput.category || null,
      criterion_key: criterionKey,
      criterion_label: scoreInput.criterion_label || null,
      score: normalizedScore,
      max_score: safeMaxScore,
      weight: parsedWeight,
      remarks: scoreInput.remarks || null,
      source,
      source_ref_id: scoreInput.source_ref_id || null,
    });
  }

  const rows = Array.from(deduped.values());
  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("evaluation_scores")
    .upsert(rows, {
      onConflict: "evaluation_id,sheet,criterion_key",
      ignoreDuplicates: false,
    })
    .select("id, sheet, criterion_key, score");

  if (error) {
    throw new ExternalServiceError("Unable to save evaluation scores", {
      code: error.code,
      details: error.message,
    });
  }

  return data ?? [];
};

/**
 * Retrieves evaluation scores, optionally filtered by sheet.
 * @param {string} evaluationId - Evaluation ID
 * @param {Object} [options={}] - Query options
 * @param {string} [options.sheet] - Filter by sheet name
 * @returns {Promise<Array>} Array of scores ordered by sheet, category, and criterion
 * @throws {ExternalServiceError}
 */
const getScores = async (evaluationId, { sheet } = {}) => {
  let query = supabaseAdmin
    .from("evaluation_scores")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("sheet")
    .order("category")
    .order("criterion_key");

  if (sheet) query = query.eq("sheet", sheet);

  const { data, error } = await query;
  if (error) {
    throw new ExternalServiceError("Unable to load scores", {
      code: error.code,
      details: error.message,
    });
  }

  return data ?? [];
};

/**
 * Deletes a specific evaluation score by sheet and criterion key.
 * @param {string} evaluationId - Evaluation ID
 * @param {Object} params - Delete parameters
 * @param {string} params.sheet - Sheet name
 * @param {string} params.criterionKey - Criterion key
 * @returns {Promise<Object>} Object with deleted flag
 * @throws {BadRequestError}
 * @throws {ExternalServiceError}
 */
const deleteScore = async (evaluationId, { sheet, criterionKey }) => {
  const normalizedSheet = String(sheet || "").trim();
  const normalizedCriterion = String(criterionKey || "").trim();
  if (!normalizedSheet || !normalizedCriterion) {
    throw new BadRequestError("Both sheet and criterion key are required.");
  }

  const { data, error } = await supabaseAdmin
    .from("evaluation_scores")
    .delete()
    .eq("evaluation_id", evaluationId)
    .eq("sheet", normalizedSheet)
    .eq("criterion_key", normalizedCriterion)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ExternalServiceError("Unable to delete evaluation score", {
      code: error.code,
      details: error.message,
    });
  }

  return { deleted: Boolean(data?.id) };
};

/**
 * Automatically populates evaluation scores from quiz and activity data.
 * Creates normalized scores for both scoreboard (5-point scale) and quiz_grades (raw scores).
 * Only overwrites auto-populated scores, preserving manual entries.
 * @param {string} evaluationId - Evaluation ID
 * @returns {Promise<Object>} Object with count and array of populated scores
 * @throws {ExternalServiceError}
 */
const autoPopulateScores = async (evaluationId) => {
  const evaluation = await getEvaluation(evaluationId);
  const userId = evaluation.user_id;
  const learningPathId = evaluation.learning_path_id;

  let scopedCourseIds = null;
  if (learningPathId) {
    const { data: learningPath, error: learningPathError } = await supabaseAdmin
      .from("learning_paths")
      .select("id, course_ids")
      .eq("id", learningPathId)
      .maybeSingle();

    if (learningPathError) {
      throw new ExternalServiceError("Unable to load learning path for auto-populate", {
        code: learningPathError.code,
        details: learningPathError.message,
      });
    }

    if (learningPath?.course_ids?.length) {
      scopedCourseIds = new Set(learningPath.course_ids.map((id) => String(id)));
    }
  }

  const populated = [];

  // 1. Get ALL quizzes and latest quiz scores for the trainee
  const { data: allQuizzes, error: allQuizzesError } = await supabaseAdmin
    .from("quizzes")
    .select("id, title, max_score, total_questions, course_id");

  if (allQuizzesError) {
    throw new ExternalServiceError("Unable to load quizzes for auto-populate", {
      code: allQuizzesError.code,
      details: allQuizzesError.message,
    });
  }

  const { data: rawQuizScores, error: quizScoresError } = await supabaseAdmin
    .from("quiz_scores")
    .select("id, quiz_id, user_id, score, submitted_at")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (quizScoresError) {
    throw new ExternalServiceError("Unable to load quiz scores for auto-populate", {
      code: quizScoresError.code,
      details: quizScoresError.message,
    });
  }

  const quizScores = pickLatestEntriesByKey(
    rawQuizScores ?? [],
    (row) => row.quiz_id,
    (row) => row.submitted_at
  );

  const quizScoreMap = new Map(quizScores.map((qs) => [qs.quiz_id, qs]));

  for (const quiz of allQuizzes ?? []) {
    const totalItems = toNumber(quiz.total_questions) || toNumber(quiz.max_score) || 100;
    const qs = quizScoreMap.get(quiz.id);
    const rawScore = qs ? (toNumber(qs.score) ?? 0) : 0;
    const normalizedScore = normalizeToFiveScale(rawScore, quiz.max_score || 100);

    populated.push({
      sheet: "scoreboard",
      category: null,
      criterion_key: `quiz_${quiz.id}`,
      criterion_label: quiz.title || `Quiz ${quiz.id}`,
      score: round(normalizedScore ?? 0, 2),
      max_score: 5,
      weight: null,
      source: "auto_quiz",
      source_ref_id: qs ? qs.id : null,
    });

    populated.push({
      sheet: "quiz_grades",
      category: null,
      criterion_key: `quiz_${quiz.id}`,
      criterion_label: quiz.title || `Quiz ${quiz.id}`,
      score: rawScore,
      max_score: totalItems,
      weight: null,
      source: "auto_quiz",
      source_ref_id: qs ? qs.id : null,
    });
  }

  // 2. Get activity submissions for the trainee
  const { data: rawActivitySubs, error: activitySubsError } = await supabaseAdmin
    .from("activity_submissions")
    .select("id, activity_id, user_id, course_id, title, score, status, reviewed_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (activitySubsError) {
    throw new ExternalServiceError("Unable to load activity submissions for auto-populate", {
      code: activitySubsError.code,
      details: activitySubsError.message,
    });
  }

  const activitySubs = pickLatestEntriesByKey(
    rawActivitySubs ?? [],
    (row) => row.activity_id || row.id,
    (row) => row.reviewed_at || row.updated_at
  );

  if (activitySubs.length > 0) {
    for (const sub of activitySubs) {
      if (scopedCourseIds && sub.course_id && !scopedCourseIds.has(String(sub.course_id))) {
        continue;
      }

      const normalizedScore = normalizeActivityScore(sub.score);
      if (normalizedScore === null) continue;

      populated.push({
        sheet: "scoreboard",
        category: null,
        criterion_key: `activity_${sub.activity_id || sub.id}`,
        criterion_label: sub.title || `Activity ${sub.activity_id}`,
        score: round(normalizedScore, 2),
        max_score: 5,
        weight: null,
        source: "auto_activity",
        source_ref_id: sub.id,
      });
    }
  }

  if (populated.length === 0) {
    return { count: 0, scores: [] };
  }

  // Only overwrite auto-populated or empty scores, not manual ones
  const existing = await getScores(evaluationId);
  const existingMap = new Map(
    existing.map((s) => [`${s.sheet}:${s.criterion_key}`, s])
  );

  const toUpsert = populated.filter((p) => {
    const ex = existingMap.get(`${p.sheet}:${p.criterion_key}`);
    return !ex || ex.source !== "manual";
  });

  if (toUpsert.length > 0) {
    await upsertScores(evaluationId, toUpsert);
  }

  return { count: toUpsert.length, scores: toUpsert };
};

module.exports = {
  evaluationService: {
    listEvaluations,
    getEvaluation,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    upsertScores,
    getScores,
    deleteScore,
    autoPopulateScores,
  },
};
