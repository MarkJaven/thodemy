import { useEffect, useState, useCallback } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import {
  evaluationApiService,
  type Evaluation,
  type EvaluationDetail,
  type EvaluationScore,
  type ScoreInput,
} from "../../../services/evaluationService";
import { apiClient } from "../../../lib/apiClient";
import type { AdminUser, LearningPath } from "../../../types/superAdmin";

// â”€â”€ Criteria definitions matching the Excel template â”€â”€

const BOOTCAMP_CRITERIA: {
  category: string;
  label: string;
  items: { key: string; label: string; weight: number }[];
}[] = [
  {
    category: "A",
    label: "EMPLOYEE ENGAGEMENT",
    items: [
      { key: "a1_teamwork", label: "Teamwork and Collaboration", weight: 7 },
      {
        key: "a2_problem_solving",
        label: "Problem-solving and Initiative",
        weight: 6,
      },
      { key: "a3_communication", label: "Communication Skills", weight: 6 },
      {
        key: "a4_leadership",
        label: "Team Leadership and Dynamics",
        weight: 6,
      },
    ],
  },
  {
    category: "B",
    label: "PRODUCTIVITY",
    items: [
      {
        key: "b1_efficiency",
        label: "Efficiency and Time Management",
        weight: 5,
      },
      { key: "b2_deadlines", label: "Meeting Deadlines", weight: 5 },
      {
        key: "b3_tools",
        label: "Utilization of Tools and Technologies",
        weight: 5,
      },
      {
        key: "b4_problem_solving",
        label: "Problem-solving and Adaptability",
        weight: 5,
      },
    ],
  },
  {
    category: "C",
    label: "WORK QUALITY",
    items: [
      { key: "c1_attention", label: "Attention to Detail", weight: 5 },
      { key: "c2_quality", label: "Quality of Work", weight: 5 },
      { key: "c3_output", label: "Work Output", weight: 5 },
    ],
  },
  {
    category: "D",
    label: "CUSTOMER SATISFACTION",
    items: [
      {
        key: "d1_responsiveness",
        label: "Responsiveness and Availability",
        weight: 5,
      },
      { key: "d2_quality", label: "Quality of Interaction", weight: 5 },
    ],
  },
  {
    category: "E",
    label: "SELF IMPROVEMENT",
    items: [
      { key: "e1_learning", label: "Continuous Learning", weight: 5 },
      { key: "e2_feedback", label: "Feedback Integration", weight: 5 },
    ],
  },
  {
    category: "F",
    label: "COMPLIANCE",
    items: [
      {
        key: "f1_policies",
        label: "Adherence to Policies and Procedures",
        weight: 5,
      },
      {
        key: "f2_reporting",
        label: "Timely and Accurate Reporting",
        weight: 5,
      },
    ],
  },
  {
    category: "G",
    label: "ETHICS AND VALUES",
    items: [
      {
        key: "g1_integrity",
        label: "Integrity and Professionalism",
        weight: 5,
      },
      { key: "g2_respect", label: "Respect and Inclusivity", weight: 5 },
    ],
  },
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  A: 25,
  B: 20,
  C: 15,
  D: 10,
  E: 10,
  F: 10,
  G: 10,
};

const PERFORMANCE_CATEGORY_WEIGHTS: Record<string, number> = {
  pe_a: 25,
  pe_b: 20,
  pe_c: 15,
  pe_d: 15,
  pe_e: 5,
  pe_f: 5,
  pe_g: 15,
};

const PERFORMANCE_CATEGORY_ROWS = [
  {
    key: "pe_a",
    category: "A",
    label: "Category A - Employee Engagement",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_a,
  },
  {
    key: "pe_b",
    category: "B",
    label: "Category B - Productivity",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_b,
  },
  {
    key: "pe_c",
    category: "C",
    label: "Category C - Work Quality",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_c,
  },
  {
    key: "pe_d",
    category: "D",
    label: "Category D - Customer Satisfaction",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_d,
  },
  {
    key: "pe_e",
    category: "E",
    label: "Category E - Self Improvement",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_e,
  },
  {
    key: "pe_f",
    category: "F",
    label: "Category F - Compliance",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_f,
  },
  {
    key: "pe_g",
    category: "G",
    label: "Category G - Ethics and Values",
    weight: PERFORMANCE_CATEGORY_WEIGHTS.pe_g,
  },
] as const;

const SCOREBOARD_CRITERIA = BOOTCAMP_CRITERIA.flatMap((group) =>
  group.items.map((item) => ({
    key: item.key,
    label: `${group.category} - ${item.label}`,
    category: group.category,
    weight: item.weight,
  })),
);

const SCOREBOARD_CRITERIA_KEY_SET = new Set(
  SCOREBOARD_CRITERIA.map((criterion) => criterion.key),
);

const SCOREBOARD_CRITERION_MAX_SCORES: Record<string, number> = {
  a1_teamwork: 20,
  a2_problem_solving: 40,
  a3_communication: 20,
  a4_leadership: 20,
  b1_efficiency: 25,
  b2_deadlines: 25,
  b3_tools: 25,
  b4_problem_solving: 25,
  c1_attention: 30,
  c2_quality: 40,
  c3_output: 30,
  d1_responsiveness: 50,
  d2_quality: 50,
  e1_learning: 80,
  e2_feedback: 20,
  f1_policies: 5,
  f2_reporting: 5,
  g1_integrity: 5,
  g2_respect: 5,
};

const getCriterionMaxScore = (criterionKey: string) =>
  SCOREBOARD_CRITERION_MAX_SCORES[criterionKey] ?? 5;

const SCOREBOARD_ACTIVITY_KEY_SEPARATOR = "::";
const SCOREBOARD_META_CATEGORY = "__activity_meta";
const BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET = "bootcamp_endorsement_feedback";
const PERFORMANCE_FEEDBACK_SHEET = "performance_feedback";

const getBootcampStrengthKey = (category: string) => `cat_${category}_strength`;

const getBootcampImprovementKey = (category: string) =>
  `cat_${category}_improvement`;

type ScoreboardActivity = {
  activityKey: string;
  activityLabel: string;
  source: string;
  remarks: string;
  criteriaScores: Record<string, number | null>;
  maxScores: Record<string, number>;
  legacyScore: number | null;
  entryKeys: string[];
  criteriaGraded: number;
  criteriaAverage: number | null;
};

type TabKey =
  | "scorecard"
  | "endorsement_feedback"
  | "scoreboard"
  | "performance"
  | "behavioral"
  | "technical"
  | "summary";

const TABS: { key: TabKey; label: string }[] = [
  { key: "scorecard", label: "BootCamp ScoreCard" },
  { key: "endorsement_feedback", label: "Endorsement Feedback" },
  { key: "scoreboard", label: "ScoreBoard" },
  { key: "performance", label: "Performance Evaluation" },
  { key: "behavioral", label: "Behavioral Evaluation" },
  { key: "technical", label: "Technical Evaluation" },
  { key: "summary", label: "Summary / Dashboard" },
];

// â”€â”€ Utility â”€â”€

const statusColors: Record<string, string> = {
  draft: "bg-slate-600 text-slate-200",
  in_progress: "bg-amber-600/30 text-amber-300",
  finalized: "bg-emerald-600/30 text-emerald-300",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  finalized: "Finalized",
};

// â”€â”€ Component â”€â”€

const EvaluationSection = () => {
  // List view state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail view state
  const [selectedEval, setSelectedEval] = useState<EvaluationDetail | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<TabKey>("scorecard");
  const [detailLoading, setDetailLoading] = useState(false);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: "",
    learningPathId: "",
    periodStart: "",
    periodEnd: "",
    position: "",
    department: "",
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Score editing state
  const [pendingScores, setPendingScores] = useState<Map<string, ScoreInput>>(
    new Map(),
  );
  const [savingScores, setSavingScores] = useState(false);
  const [scoreboardModalDraft, setScoreboardModalDraft] = useState<{
    activityKey: string;
    activityLabel: string;
    criteriaScores: Record<string, string>;
    maxScores: Record<string, number>;
    remarks: string;
    source: string;
  } | null>(null);
  const [scoreboardModalError, setScoreboardModalError] = useState<
    string | null
  >(null);
  const [quizScoreModal, setQuizScoreModal] = useState<{
    criterionKey: string;
    label: string;
    score: string;
    totalItems: string;
  } | null>(null);

  // Data Loading

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evalData, userData, lpData] = await Promise.all([
        evaluationApiService.listEvaluations(),
        superAdminService.listUsers(),
        superAdminService.listLearningPaths(),
      ]);
      setEvaluations(evalData);
      setUsers(userData);
      setLearningPaths(lpData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load evaluations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (evaluation: Evaluation) => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const detail = await evaluationApiService.getEvaluation(evaluation.id);
      setSelectedEval(detail);
      setActiveTab("scorecard");
      initPendingScores(detail.scores);
    } catch (loadError) {
      setActionError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load evaluation.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const initPendingScores = (scores: EvaluationScore[]) => {
    const map = new Map<string, ScoreInput>();
    for (const s of scores) {
      map.set(`${s.sheet}:${s.criterion_key}`, {
        sheet: s.sheet,
        category: s.category ?? undefined,
        criterion_key: s.criterion_key,
        criterion_label: s.criterion_label ?? undefined,
        score: s.score,
        max_score: s.max_score,
        weight: s.weight ?? undefined,
        remarks: s.remarks ?? undefined,
        source: s.source,
        source_ref_id: s.source_ref_id ?? undefined,
      });
    }
    setPendingScores(map);
  };

  const normalizeToFive = (
    score: number | null | undefined,
    maxScore?: number,
  ) => {
    if (score == null || Number.isNaN(score)) return null;
    const safeMax = maxScore && maxScore > 0 ? maxScore : 5;
    return Math.min(Math.max((score / safeMax) * 5, 0), 5);
  };

  const convertScoreBetweenMaxScales = (
    score: number | null | undefined,
    fromMax: number | null | undefined,
    toMax: number | null | undefined,
  ): number | null => {
    const normalized = normalizeToFive(score, fromMax ?? undefined);
    if (normalized == null) return null;
    const safeTargetMax = toMax && toMax > 0 ? toMax : 5;
    return (normalized / 5) * safeTargetMax;
  };

const toWholeScoreOption = (
  score: number | null | undefined,
  maxScore: number,
): string => {
  if (score == null || Number.isNaN(score)) return "";
  const rounded = Math.round(score);
  return rounded >= 0 && rounded <= maxScore ? String(rounded) : "";
};

  const getScoreboardEntries = () =>
    Array.from(pendingScores.values()).filter(
      (entry) => entry.sheet === "scoreboard",
    );

  const parseScoreboardEntry = (
    entry: Pick<ScoreInput, "criterion_key" | "category">,
  ) => {
    const rawKey = String(entry.criterion_key || "").trim();
    const rawCategory = String(entry.category || "").trim();

    if (rawKey.includes(SCOREBOARD_ACTIVITY_KEY_SEPARATOR)) {
      const [activityKey, rubricKey] = rawKey.split(
        SCOREBOARD_ACTIVITY_KEY_SEPARATOR,
      );
      return {
        activityKey: activityKey || rawKey,
        rubricKey: SCOREBOARD_CRITERIA_KEY_SET.has(rubricKey)
          ? rubricKey
          : null,
      };
    }

    if (SCOREBOARD_CRITERIA_KEY_SET.has(rawCategory)) {
      return { activityKey: rawKey, rubricKey: rawCategory };
    }

    return { activityKey: rawKey, rubricKey: null };
  };

  const createEmptyScoreboardActivity = (
    activityKey: string,
    activityLabel: string,
    source = "manual",
  ): ScoreboardActivity => {
    const criteriaScores: Record<string, number | null> = {};
    const maxScores: Record<string, number> = {};

    for (const criterion of SCOREBOARD_CRITERIA) {
      criteriaScores[criterion.key] = null;
      maxScores[criterion.key] = getCriterionMaxScore(criterion.key);
    }

    return {
      activityKey,
      activityLabel,
      source,
      remarks: "",
      criteriaScores,
      maxScores,
      legacyScore: null,
      entryKeys: [],
      criteriaGraded: 0,
      criteriaAverage: null,
    };
  };

  const getScoreboardActivities = (): ScoreboardActivity[] => {
    const activities = new Map<string, ScoreboardActivity>();

    for (const entry of getScoreboardEntries()) {
      const { activityKey, rubricKey } = parseScoreboardEntry(entry);
      if (!activityKey) continue;

      if (!activities.has(activityKey)) {
        activities.set(
          activityKey,
          createEmptyScoreboardActivity(
            activityKey,
            entry.criterion_label || activityKey,
            entry.source || "manual",
          ),
        );
      }

      const activity = activities.get(activityKey);
      if (!activity) continue;

      activity.entryKeys.push(entry.criterion_key);

      if (entry.criterion_label) {
        activity.activityLabel = entry.criterion_label;
      }

      if (entry.source && activity.source === "manual") {
        activity.source = entry.source;
      }

      if (entry.remarks) {
        activity.remarks = entry.remarks;
      }

      if (rubricKey && SCOREBOARD_CRITERIA_KEY_SET.has(rubricKey)) {
        const criterionTemplateMax = getCriterionMaxScore(rubricKey);
        const storedMax =
          entry.max_score && entry.max_score > 0
            ? entry.max_score
            : criterionTemplateMax;
        activity.criteriaScores[rubricKey] = convertScoreBetweenMaxScales(
          entry.score,
          storedMax,
          criterionTemplateMax,
        );
        activity.maxScores[rubricKey] = criterionTemplateMax;
      } else if (
        entry.category !== SCOREBOARD_META_CATEGORY &&
        entry.score != null &&
        activity.legacyScore == null
      ) {
        activity.legacyScore = entry.score;
      }
    }

    const list = Array.from(activities.values()).map((activity) => {
      const scoredNormalized = SCOREBOARD_CRITERIA.map((criterion) => {
        const rawScore = activity.criteriaScores[criterion.key];
        if (rawScore == null) return null;
        const criterionMax =
          activity.maxScores[criterion.key] ??
          getCriterionMaxScore(criterion.key);
        return normalizeToFive(rawScore, criterionMax);
      }).filter((score): score is number => score != null);

      return {
        ...activity,
        criteriaGraded: scoredNormalized.length,
        criteriaAverage:
          scoredNormalized.length > 0
            ? scoredNormalized.reduce((sum, score) => sum + score, 0) /
              scoredNormalized.length
            : null,
      };
    });

    list.sort((left, right) =>
      left.activityLabel.localeCompare(right.activityLabel),
    );
    return list;
  };

  // â”€â”€ Score Helpers â”€â”€

  const getScore = (sheet: string, key: string): number | null => {
    const entry = pendingScores.get(`${sheet}:${key}`);
    return entry?.score ?? null;
  };

  const getRemarks = (sheet: string, key: string): string => {
    const entry = pendingScores.get(`${sheet}:${key}`);
    return entry?.remarks ?? "";
  };

  const upsertPendingScores = (inputs: ScoreInput[]) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      for (const input of inputs) {
        const mapKey = `${input.sheet}:${input.criterion_key}`;
        const existing = next.get(mapKey) || {
          sheet: input.sheet,
          criterion_key: input.criterion_key,
          score: null,
        };
        next.set(mapKey, {
          ...existing,
          ...input,
          source: input.source || existing.source || "manual",
        });
      }
      return next;
    });
  };

  const setScoreValue = (
    sheet: string,
    key: string,
    value: number | null,
    extra?: Partial<ScoreInput>,
  ) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      const existing = next.get(`${sheet}:${key}`) || {
        sheet,
        criterion_key: key,
        score: null,
      };
      next.set(`${sheet}:${key}`, {
        ...existing,
        score: value,
        source: "manual",
        ...extra,
      });
      return next;
    });
  };

  const setRemarksValue = (sheet: string, key: string, remarks: string) => {
    setPendingScores((prev) => {
      const next = new Map(prev);
      const existing = next.get(`${sheet}:${key}`) || {
        sheet,
        criterion_key: key,
        score: null,
      };
      next.set(`${sheet}:${key}`, { ...existing, remarks });
      return next;
    });
  };

  const saveScores = async () => {
    if (!selectedEval) return;
    setSavingScores(true);
    setActionError(null);
    try {
      const scores = Array.from(pendingScores.values());
      await evaluationApiService.upsertScores(selectedEval.id, scores);
      // Reload
      const detail = await evaluationApiService.getEvaluation(selectedEval.id);
      setSelectedEval(detail);
      initPendingScores(detail.scores);
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save scores.",
      );
    } finally {
      setSavingScores(false);
    }
  };

  const handleAutoPopulate = async () => {
    if (!selectedEval) return;
    setSavingScores(true);
    setActionError(null);
    try {
      const result = await evaluationApiService.autoPopulate(selectedEval.id);
      // Reload
      const detail = await evaluationApiService.getEvaluation(selectedEval.id);
      setSelectedEval(detail);
      initPendingScores(detail.scores);
      setActionError(
        result.count > 0
          ? null
          : "No auto-populatable scores found for this trainee.",
      );
    } catch (autoError) {
      setActionError(
        autoError instanceof Error
          ? autoError.message
          : "Unable to auto-populate scores.",
      );
    } finally {
      setSavingScores(false);
    }
  };

  // â”€â”€ CRUD â”€â”€

  const handleCreate = async () => {
    if (!createForm.userId) return;
    setSaving(true);
    setActionError(null);
    try {
      await evaluationApiService.createEvaluation({
        userId: createForm.userId,
        learningPathId: createForm.learningPathId || undefined,
        periodStart: createForm.periodStart || undefined,
        periodEnd: createForm.periodEnd || undefined,
        traineeInfo: {
          position: createForm.position,
          department: createForm.department,
        },
      });
      setIsCreateOpen(false);
      await loadList();
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : "Unable to create evaluation.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evalId: string) => {
    if (!window.confirm("Are you sure you want to delete this evaluation?"))
      return;
    try {
      await evaluationApiService.deleteEvaluation(evalId);
      if (selectedEval?.id === evalId) setSelectedEval(null);
      await loadList();
    } catch (delError) {
      setActionError(
        delError instanceof Error
          ? delError.message
          : "Unable to delete evaluation.",
      );
    }
  };

  const handleDeleteScoreboardActivity = async (activityKey: string) => {
    if (!selectedEval) return;
    if (!window.confirm("Delete this scoreboard activity entry?")) return;

    const entriesForActivity = getScoreboardEntries().filter(
      (entry) => parseScoreboardEntry(entry).activityKey === activityKey,
    );

    // Also check for quiz_grades entries with the same key
    const quizGradeEntry = pendingScores.get(`quiz_grades:${activityKey}`);

    if (entriesForActivity.length === 0 && !quizGradeEntry) return;

    setSavingScores(true);
    setActionError(null);
    try {
      if (scoreboardModalDraft?.activityKey === activityKey) {
        closeScoreboardGradeModal();
      }

      setPendingScores((prev) => {
        const next = new Map(prev);
        for (const entry of entriesForActivity) {
          next.delete(`scoreboard:${entry.criterion_key}`);
        }
        // Also remove quiz_grades entry
        next.delete(`quiz_grades:${activityKey}`);
        return next;
      });

      const persistedScoreboardKeys = new Set(
        (selectedEval.scores || [])
          .filter((score) => score.sheet === "scoreboard")
          .map((score) => score.criterion_key),
      );

      const persistedQuizGradesKeys = new Set(
        (selectedEval.scores || [])
          .filter((score) => score.sheet === "quiz_grades")
          .map((score) => score.criterion_key),
      );

      const persistedEntries = entriesForActivity.filter((entry) =>
        persistedScoreboardKeys.has(entry.criterion_key),
      );

      const needsServerDelete =
        persistedEntries.length > 0 || persistedQuizGradesKeys.has(activityKey);

      if (needsServerDelete) {
        for (const entry of persistedEntries) {
          await evaluationApiService.deleteScore(
            selectedEval.id,
            "scoreboard",
            entry.criterion_key,
          );
        }
        // Delete quiz_grades entry from server too
        if (persistedQuizGradesKeys.has(activityKey)) {
          await evaluationApiService.deleteScore(
            selectedEval.id,
            "quiz_grades",
            activityKey,
          );
        }

        const detail = await evaluationApiService.getEvaluation(
          selectedEval.id,
        );
        setSelectedEval(detail);
        initPendingScores(detail.scores);
      }
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete scoreboard entry.",
      );
    } finally {
      setSavingScores(false);
    }
  };

  const openScoreboardGradeModal = (activity: ScoreboardActivity) => {
    const criteriaScores: Record<string, string> = {};
    const modalMaxScores: Record<string, number> = {};
    for (const criterion of SCOREBOARD_CRITERIA) {
      const existingScore = activity.criteriaScores[criterion.key];
      const criterionMax = getCriterionMaxScore(criterion.key);
      modalMaxScores[criterion.key] = criterionMax;
      criteriaScores[criterion.key] = toWholeScoreOption(
        existingScore,
        criterionMax,
      );
    }

    setScoreboardModalError(null);
    setScoreboardModalDraft({
      activityKey: activity.activityKey,
      activityLabel: activity.activityLabel,
      criteriaScores,
      maxScores: modalMaxScores,
      remarks: activity.remarks || "",
      source: activity.source || "manual",
    });
  };

  const closeScoreboardGradeModal = () => {
    setScoreboardModalError(null);
    setScoreboardModalDraft(null);
  };

  const openQuizScoreModal = (entry: ScoreInput) => {
    setQuizScoreModal({
      criterionKey: entry.criterion_key,
      label: entry.criterion_label || entry.criterion_key,
      score: entry.score != null ? String(entry.score) : "",
      totalItems: entry.max_score != null ? String(entry.max_score) : "",
    });
  };

  const applyQuizScore = () => {
    if (!quizScoreModal) return;
    const score = Number(quizScoreModal.score);
    const totalItems = Number(quizScoreModal.totalItems);
    if (!Number.isFinite(score) || score < 0) return;
    if (!Number.isFinite(totalItems) || totalItems <= 0) return;

    const equivalent = score <= 0 ? 0 : (score / totalItems) * 50 + 50;
    const normalizedScore = Math.min(Math.max((equivalent / 100) * 5, 0), 5);

    // Update quiz_grades entry (raw score + total items)
    setPendingScores((prev) => {
      const next = new Map(prev);
      next.set(`quiz_grades:${quizScoreModal.criterionKey}`, {
        sheet: "quiz_grades",
        criterion_key: quizScoreModal.criterionKey,
        criterion_label: quizScoreModal.label,
        category: null,
        score,
        max_score: totalItems,
        weight: null,
        source: "manual",
      });
      // Also update scoreboard entry (normalized 0-5)
      next.set(`scoreboard:${quizScoreModal.criterionKey}`, {
        sheet: "scoreboard",
        criterion_key: quizScoreModal.criterionKey,
        criterion_label: quizScoreModal.label,
        category: SCOREBOARD_META_CATEGORY,
        score: Math.round(normalizedScore * 1000) / 1000,
        max_score: 5,
        source: "manual",
      });
      return next;
    });
    setQuizScoreModal(null);
  };

  const applyScoreboardGrade = () => {
    if (!scoreboardModalDraft) return;

    const missingCriteria = SCOREBOARD_CRITERIA.filter(
      (criterion) =>
        !String(
          scoreboardModalDraft.criteriaScores[criterion.key] || "",
        ).trim(),
    );
    if (missingCriteria.length > 0) {
      setScoreboardModalError(
        `Complete all criteria before applying (${missingCriteria.length} missing).`,
      );
      return;
    }

    const rows: ScoreInput[] = [
      {
        sheet: "scoreboard",
        criterion_key: scoreboardModalDraft.activityKey,
        criterion_label: scoreboardModalDraft.activityLabel,
        category: SCOREBOARD_META_CATEGORY,
        score: null,
        max_score: 5,
        remarks: scoreboardModalDraft.remarks || undefined,
        source: "manual",
      },
    ];

    for (const criterion of SCOREBOARD_CRITERIA) {
      const rawValue = String(
        scoreboardModalDraft.criteriaScores[criterion.key] || "",
      ).trim();
      const rawMax = scoreboardModalDraft.maxScores[criterion.key];
      const safeMax =
        Number.isFinite(rawMax) && rawMax > 0
          ? Math.floor(rawMax)
          : getCriterionMaxScore(criterion.key);

      if (!/^\d+$/.test(rawValue)) {
        setScoreboardModalError(
          `Score for ${criterion.label} must be a whole number (0-${safeMax}).`,
        );
        return;
      }

      const safeScore = Number.parseInt(rawValue, 10);
      if (safeScore < 0 || safeScore > safeMax) {
        setScoreboardModalError(
          `Score for ${criterion.label} must be between 0 and ${safeMax}.`,
        );
        return;
      }

      rows.push({
        sheet: "scoreboard",
        criterion_key: `${scoreboardModalDraft.activityKey}${SCOREBOARD_ACTIVITY_KEY_SEPARATOR}${criterion.key}`,
        criterion_label: scoreboardModalDraft.activityLabel,
        category: criterion.key,
        score: safeScore,
        max_score: safeMax,
        remarks: scoreboardModalDraft.remarks || undefined,
        source: "manual",
      });
    }

    upsertPendingScores(rows);

    closeScoreboardGradeModal();
  };

  const applyDidNotSubmitScoreboardGrade = () => {
    if (!scoreboardModalDraft) return;
    const trimmedRemarks = String(scoreboardModalDraft.remarks || "").trim();
    const didNotSubmitRemarks = trimmedRemarks
      ? `Did not submit - ${trimmedRemarks}`
      : "Did not submit";

    const rows: ScoreInput[] = [
      {
        sheet: "scoreboard",
        criterion_key: scoreboardModalDraft.activityKey,
        criterion_label: scoreboardModalDraft.activityLabel,
        category: SCOREBOARD_META_CATEGORY,
        score: null,
        max_score: 5,
        remarks: didNotSubmitRemarks,
        source: "manual",
      },
    ];

    for (const criterion of SCOREBOARD_CRITERIA) {
      const rawMax = scoreboardModalDraft.maxScores[criterion.key];
      const safeMax =
        Number.isFinite(rawMax) && rawMax > 0
          ? Math.floor(rawMax)
          : getCriterionMaxScore(criterion.key);

      rows.push({
        sheet: "scoreboard",
        criterion_key: `${scoreboardModalDraft.activityKey}${SCOREBOARD_ACTIVITY_KEY_SEPARATOR}${criterion.key}`,
        criterion_label: scoreboardModalDraft.activityLabel,
        category: criterion.key,
        score: 0,
        max_score: safeMax,
        remarks: didNotSubmitRemarks,
        source: "manual",
      });
    }

    upsertPendingScores(rows);
    closeScoreboardGradeModal();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedEval) return;
    try {
      await evaluationApiService.updateEvaluation(selectedEval.id, {
        status: newStatus,
      });
      const detail = await evaluationApiService.getEvaluation(selectedEval.id);
      setSelectedEval(detail);
      await loadList();
    } catch (statusError) {
      setActionError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update status.",
      );
    }
  };

  const handleExport = async (evalId: string) => {
    try {
      // Ensure the latest in-form edits are persisted before generating Excel.
      if (selectedEval?.id === evalId) {
        const scores = Array.from(pendingScores.values());
        if (scores.length > 0) {
          await evaluationApiService.upsertScores(evalId, scores);
          const refreshed = await evaluationApiService.getEvaluation(evalId);
          setSelectedEval(refreshed);
          initPendingScores(refreshed.scores);
        }
      }

      const url = evaluationApiService.getExportUrl(evalId);
      const response = await apiClient.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `evaluation_${evalId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (exportError) {
      setActionError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to export evaluation.",
      );
    }
  };

  // â”€â”€ Computed â”€â”€

  const computeCriterionScoreFromScoreboard = (
    criterionKey: string,
  ): number | null => {
    // For e1_learning (Summative Assessment), compute from quiz grades equivalent
    if (criterionKey === "e1_learning") {
      const quizAvg = computeQuizGradesAverage();
      if (quizAvg !== null) {
        // Convert equivalent (50-100 scale) to 5-scale
        return Math.min(Math.max((quizAvg / 100) * 5, 0), 5);
      }
    }

    const entries = getScoreboardEntries().filter(
      (entry) =>
        entry.category === criterionKey || entry.criterion_key === criterionKey,
    );

    if (entries.length === 0) {
      return null;
    }

    const normalized = entries
      .map((entry) => normalizeToFive(entry.score, entry.max_score))
      .filter((score): score is number => score != null);

    if (normalized.length === 0) return null;
    return (
      normalized.reduce((sum, score) => sum + score, 0) / normalized.length
    );
  };

  const computeCategoryScore = (category: string): number => {
    const group = BOOTCAMP_CRITERIA.find((c) => c.category === category);
    if (!group) return 0;
    let totalWeighted = 0;
    let totalWeight = 0;
    for (const item of group.items) {
      const criterionScore = computeCriterionScoreFromScoreboard(item.key);
      if (criterionScore !== null) {
        totalWeighted += criterionScore * item.weight;
        totalWeight += item.weight;
      }
    }
    return totalWeight > 0 ? totalWeighted / totalWeight : 0;
  };

  const computeBootcampPercent = (): number => {
    let total = 0;
    for (const [cat, catWeight] of Object.entries(CATEGORY_WEIGHTS)) {
      const catScore = computeCategoryScore(cat);
      total += (catScore / 5) * catWeight;
    }
    return total;
  };

  const computePerformancePercent = (): number => {
    let total = 0;
    for (const categoryRow of PERFORMANCE_CATEGORY_ROWS) {
      const score = computeCategoryScore(categoryRow.category);
      total += (score / 5) * categoryRow.weight;
    }
    return total;
  };

  const computeOverallScore = (): number => {
    const bootcamp = computeBootcampPercent();
    const performance = computePerformancePercent();
    return (bootcamp + performance) / 2;
  };

  const getAdjectivalRating = (overallPercent: number): string => {
    if (overallPercent >= 91) return "OUTSTANDING";
    if (overallPercent >= 86) return "SATISFACTORY";
    if (overallPercent >= 71) return "NEEDS IMPROVEMENT";
    if (overallPercent >= 61) return "UNSATISFACTORY";
    return "POOR";
  };

  // â"€â"€ Quiz Grades Helpers â"€â"€

  const getQuizGradesEntries = (): ScoreInput[] =>
    Array.from(pendingScores.values()).filter(
      (entry) => entry.sheet === "quiz_grades",
    );

  const computeQuizEquivalent = (
    rawScore: number | null | undefined,
    totalItems: number | null | undefined,
  ): number | null => {
    if (rawScore == null || totalItems == null || totalItems <= 0) return null;
    if (rawScore <= 0) return 0;
    return (rawScore / totalItems) * 50 + 50;
  };

  const computeQuizRating = (equivalent: number | null): number => {
    if (equivalent == null) return 0;
    if (equivalent <= 0) return 0;
    if (equivalent <= 60) return 1;
    if (equivalent <= 70) return 2;
    if (equivalent <= 85) return 3;
    if (equivalent <= 96) return 4;
    return 5;
  };

  const getQuizRatingLabel = (rating: number): string => {
    switch (rating) {
      case 0:
        return "Failed";
      case 1:
        return "Not yet capable";
      case 2:
        return "Some capability";
      case 3:
        return "Needs improvement";
      case 4:
        return "Capable";
      case 5:
        return "Expert";
      default:
        return "N/A";
    }
  };

  const computeQuizGradesAverage = (): number | null => {
    const entries = getQuizGradesEntries();
    if (entries.length === 0) return null;
    const equivalents = entries
      .map((e) => computeQuizEquivalent(e.score, e.max_score))
      .filter((eq): eq is number => eq !== null);
    if (equivalents.length === 0) return null;
    return equivalents.reduce((sum, eq) => sum + eq, 0) / equivalents.length;
  };

  // â"€â"€ Detail View â"€â"€

  if (selectedEval) {
    const overallScore = computeOverallScore();
    const rating = getAdjectivalRating(overallScore);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedEval(null);
                loadList();
              }}
              className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-300 hover:bg-ink-700"
            >
              &larr; Back
            </button>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedEval.trainee_name || "Trainee Evaluation"}
              </h2>
              <p className="text-sm text-slate-400">
                {selectedEval.trainee_email}
                {selectedEval.learning_path_title
                  ? ` | ${selectedEval.learning_path_title}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[selectedEval.status] || "bg-slate-600 text-slate-200"}`}
            >
              {statusLabels[selectedEval.status] || selectedEval.status}
            </span>
            <select
              value={selectedEval.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-lg border border-white/10 bg-ink-800 px-3 py-1.5 text-sm text-white"
            >
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
        </div>

        {/* Trainee Info */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-ink-800 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Position</p>
            <p className="text-sm text-white">
              {(selectedEval.trainee_info as Record<string, string>)
                ?.position || "â€”"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Department</p>
            <p className="text-sm text-white">
              {(selectedEval.trainee_info as Record<string, string>)
                ?.department || "â€”"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Period</p>
            <p className="text-sm text-white">
              {selectedEval.period_start || "â€”"} to{" "}
              {selectedEval.period_end || "â€”"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Overall Score</p>
            <p className="text-sm font-bold text-white">
              {overallScore.toFixed(1)}% {rating}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleAutoPopulate}
            disabled={savingScores}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {savingScores
              ? "Processing..."
              : "Auto-populate from Quiz/Activity"}
          </button>
          <button
            onClick={saveScores}
            disabled={savingScores}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {savingScores ? "Saving..." : "Save All Scores"}
          </button>
          <button
            onClick={() => handleExport(selectedEval.id)}
            className="rounded-lg border border-white/10 bg-ink-800 px-4 py-2 text-sm text-slate-300 hover:bg-ink-700"
          >
            Export to Excel
          </button>
        </div>

        {actionError && (
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
            {actionError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-ink-800 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-white/10 bg-ink-800 p-4 sm:p-6">
          {activeTab === "scorecard" && renderScorecard()}
          {activeTab === "endorsement_feedback" && renderEndorsementFeedback()}
          {activeTab === "scoreboard" && renderScoreboard()}
          {activeTab === "performance" && renderPerformance()}
          {activeTab === "behavioral" && renderBehavioral()}
          {activeTab === "technical" && renderTechnical()}
          {activeTab === "summary" && renderSummary()}
        </div>

        <Modal
          isOpen={Boolean(scoreboardModalDraft)}
          title="Grade ScoreBoard Activity"
          description="Grade this activity across all rubric criteria in one modal."
          onClose={closeScoreboardGradeModal}
          size="xl"
          variant="form"
          footer={
            <>
              <button
                type="button"
                onClick={closeScoreboardGradeModal}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDidNotSubmitScoreboardGrade}
                className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/10"
              >
                Did Not Submit (Set 0)
              </button>
              <button
                type="button"
                onClick={applyScoreboardGrade}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              >
                Apply Grade
              </button>
            </>
          }
        >
          {scoreboardModalError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
              {scoreboardModalError}
            </div>
          )}
          {scoreboardModalDraft && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Activity
                </label>
                <div className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">
                  {scoreboardModalDraft.activityLabel}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-ink-900/40 px-3 py-2 text-xs text-slate-300">
                {
                  SCOREBOARD_CRITERIA.filter(
                    (criterion) =>
                      String(
                        scoreboardModalDraft.criteriaScores[criterion.key] ||
                          "",
                      ).trim() !== "",
                  ).length
                }{" "}
                / {SCOREBOARD_CRITERIA.length} criteria scored
              </div>

              <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-2">
                {BOOTCAMP_CRITERIA.map((group) => (
                  <div
                    key={group.category}
                    className="rounded-lg border border-white/10 bg-ink-900/30 p-3"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      {group.category}. {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const criterionMax =
                          scoreboardModalDraft.maxScores[item.key] ??
                          getCriterionMaxScore(item.key);
                        const safeMax =
                          Number.isFinite(criterionMax) && criterionMax > 0
                            ? Math.floor(criterionMax)
                            : 5;

                        return (
                          <div
                            key={item.key}
                            className="grid grid-cols-[1fr_6rem_8rem] items-center gap-2"
                          >
                            <div className="text-sm text-white">
                              {item.label}
                            </div>
                            <div className="text-center text-xs text-slate-400">
                              Max {safeMax}
                            </div>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="Enter score"
                              value={
                                scoreboardModalDraft.criteriaScores[item.key] ||
                                ""
                              }
                              onChange={(e) => {
                                const rawValue = e.target.value.trim();
                                if (rawValue !== "") {
                                  if (!/^\d+$/.test(rawValue)) return;
                                  const numericValue = Number.parseInt(
                                    rawValue,
                                    10,
                                  );
                                  if (!Number.isFinite(numericValue)) return;
                                  if (numericValue > safeMax) return;
                                }

                                setScoreboardModalDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        criteriaScores: {
                                          ...prev.criteriaScores,
                                          [item.key]: rawValue,
                                        },
                                      }
                                    : prev,
                                );
                              }}
                              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  Remarks
                </label>
                <input
                  type="text"
                  value={scoreboardModalDraft.remarks}
                  onChange={(e) =>
                    setScoreboardModalDraft((prev) =>
                      prev ? { ...prev, remarks: e.target.value } : prev,
                    )
                  }
                  placeholder="Optional remarks"
                  className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500">
                Source:{" "}
                {scoreboardModalDraft.source === "manual"
                  ? "Manual"
                  : scoreboardModalDraft.source === "auto_quiz"
                    ? "Quiz"
                    : "Activity"}
              </div>
            </div>
          )}
        </Modal>

        <Modal
          isOpen={Boolean(quizScoreModal)}
          title="Edit Quiz Score"
          description="Update the score for this quiz assessment."
          onClose={() => setQuizScoreModal(null)}
          size="sm"
          variant="form"
          footer={
            <>
              <button
                type="button"
                onClick={() => setQuizScoreModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyQuizScore}
                disabled={
                  !quizScoreModal ||
                  !Number.isFinite(Number(quizScoreModal.score)) ||
                  Number(quizScoreModal.score) < 0 ||
                  !Number.isFinite(Number(quizScoreModal.totalItems)) ||
                  Number(quizScoreModal.totalItems) <= 0
                }
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40"
              >
                Apply Score
              </button>
            </>
          }
        >
          {quizScoreModal &&
            (() => {
              const s = Number(quizScoreModal.score);
              const t = Number(quizScoreModal.totalItems);
              const eq =
                Number.isFinite(s) && Number.isFinite(t) && t > 0 && s >= 0
                  ? s <= 0
                    ? 0
                    : (s / t) * 50 + 50
                  : null;
              const rating = computeQuizRating(eq);
              return (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">
                      Assessment
                    </label>
                    <div className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white">
                      {quizScoreModal.label}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Score
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={quizScoreModal.score}
                        onChange={(e) =>
                          setQuizScoreModal((prev) =>
                            prev ? { ...prev, score: e.target.value } : prev,
                          )
                        }
                        placeholder="Enter score"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">
                        Total Items
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quizScoreModal.totalItems}
                        onChange={(e) =>
                          setQuizScoreModal((prev) =>
                            prev
                              ? { ...prev, totalItems: e.target.value }
                              : prev,
                          )
                        }
                        placeholder="Total items"
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {eq !== null && (
                    <div className="rounded-lg border border-white/10 bg-ink-900/40 p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-slate-400">Equivalent</div>
                        <div className="text-right text-yellow-200 font-medium">
                          {eq.toFixed(1)}
                        </div>
                        <div className="text-slate-400">Rating</div>
                        <div className="text-right font-medium">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              rating >= 4
                                ? "bg-emerald-600/20 text-emerald-300"
                                : rating >= 2
                                  ? "bg-yellow-600/20 text-yellow-300"
                                  : "bg-red-600/20 text-red-300"
                            }`}
                          >
                            {rating} - {getQuizRatingLabel(rating)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </Modal>
      </div>
    );
  }

  // â"€â"€ Scorecard Tab â"€â"€

  function renderScorecard() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">
          BootCamp ScoreCard - Auto-computed from ScoreBoard
        </h3>
        <p className="text-sm text-slate-400">
          Read-only view: all values here are reflected from graded ScoreBoard
          activities. Grade only in the ScoreBoard tab.
        </p>

        {BOOTCAMP_CRITERIA.map((group) => {
          const catScore = computeCategoryScore(group.category);
          const catWeight = CATEGORY_WEIGHTS[group.category] || 0;

          return (
            <div
              key={group.category}
              className="rounded-lg border border-white/10 bg-ink-900/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  {group.category}. {group.label}{" "}
                  <span className="font-normal text-slate-400">
                    [{catWeight}%]
                  </span>
                </h4>
                <span className="text-sm text-purple-300">
                  Avg: {catScore.toFixed(2)} / 5 (
                  {((catScore / 5) * catWeight).toFixed(1)}%)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                      <th className="px-2 py-2 font-medium">Criterion</th>
                      <th className="px-2 py-2 font-medium w-16">Weight</th>
                      <th className="px-2 py-2 font-medium w-28">
                        Reflected Score
                      </th>
                      <th className="px-2 py-2 font-medium w-28">
                        Mapped Activities
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => {
                      const score = computeCriterionScoreFromScoreboard(
                        item.key,
                      );
                      const mappedCount = getScoreboardEntries().filter(
                        (entry) =>
                          entry.category === item.key ||
                          entry.criterion_key === item.key,
                      ).length;

                      return (
                        <tr key={item.key} className="border-b border-white/5">
                          <td className="px-2 py-2 text-white">{item.label}</td>
                          <td className="px-2 py-2 text-slate-400">
                            {item.weight}%
                          </td>
                          <td className="px-2 py-2 text-white">
                            {score !== null ? score.toFixed(2) : "0.00"} / 5
                          </td>
                          <td className="px-2 py-2 text-slate-300">
                            {mappedCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      </div>
    );
  }

  function renderEndorsementFeedback() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">
          EMPLOYEE PERFORMANCE EVALUATION RESULT SUMMARY
        </h3>
        <p className="text-sm text-slate-400">
          Add FEEDBACK FORM entries for Strength and For Improvements per
          category. Leave blank if none.
        </p>

        <div className="rounded-lg border border-white/10 bg-ink-900/50 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-2 py-2 font-medium w-20">Category</th>
                  <th className="px-2 py-2 font-medium w-32">Computed</th>
                  <th className="px-2 py-2 font-medium">Strength</th>
                  <th className="px-2 py-2 font-medium">For Improvements</th>
                </tr>
              </thead>
              <tbody>
                {BOOTCAMP_CRITERIA.map((group) => {
                  const catScore = computeCategoryScore(group.category);
                  const catWeight = CATEGORY_WEIGHTS[group.category] || 0;
                  const computedPercent = (catScore / 5) * catWeight;
                  const strengthKey = getBootcampStrengthKey(group.category);
                  const improvementKey = getBootcampImprovementKey(
                    group.category,
                  );

                  return (
                    <tr
                      key={`feedback-${group.category}`}
                      className="border-b border-white/5"
                    >
                      <td className="px-2 py-2 text-white">
                        {group.category}. {group.label}
                      </td>
                      <td className="px-2 py-2 text-slate-300">
                        {computedPercent.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2">
                        <textarea
                          rows={2}
                          value={getRemarks(
                            BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET,
                            strengthKey,
                          )}
                          onChange={(e) =>
                            setRemarksValue(
                              BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET,
                              strengthKey,
                              e.target.value,
                            )
                          }
                          placeholder="Leave blank if none"
                          className="w-full rounded border border-white/10 bg-ink-900 px-2 py-1 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <textarea
                          rows={2}
                          value={getRemarks(
                            BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET,
                            improvementKey,
                          )}
                          onChange={(e) =>
                            setRemarksValue(
                              BOOTCAMP_ENDORSEMENT_FEEDBACK_SHEET,
                              improvementKey,
                              e.target.value,
                            )
                          }
                          placeholder="Leave blank if none"
                          className="w-full rounded border border-white/10 bg-ink-900 px-2 py-1 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ScoreBoard Tab
  function renderScoreboard() {
    const scoreboardActivities = getScoreboardActivities();
    const quizGrades = getQuizGradesEntries();
    const quizKeySet = new Set(quizGrades.map((q) => q.criterion_key));
    const isDidNotSubmitActivity = (activity: ScoreboardActivity) =>
      String(activity.remarks || "")
        .trim()
        .toLowerCase()
        .includes("did not submit");
    const getActivityStatus = (activity: ScoreboardActivity) => {
      if (isDidNotSubmitActivity(activity)) return "did_not_submit";
      return activity.criteriaGraded === SCOREBOARD_CRITERIA.length
        ? "complete"
        : "needs_grading";
    };

    // Split: activities that are NOT quizzes vs quizzes
    const activityEntries = scoreboardActivities.filter(
      (a) => !quizKeySet.has(a.activityKey) && a.source !== "auto_quiz",
    );
    const quizEntries = scoreboardActivities.filter(
      (a) => quizKeySet.has(a.activityKey) || a.source === "auto_quiz",
    );

    const completeCount = activityEntries.filter(
      (activity) => getActivityStatus(activity) === "complete",
    ).length;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">
          ScoreBoard - Per-Activity Scores
        </h3>
        <p className="text-sm text-slate-400">
          Click an activity to open grading modal. Quizzes are auto-scored from
          the system. Save All Scores to persist.
        </p>

        {/* Quiz Assessments Section */}
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-900/10 p-4">
          <h4 className="mb-3 text-sm font-bold text-white">
            Quiz Assessments
            <span className="ml-2 text-xs font-normal text-slate-400">
              Auto-populated from quiz scores (feeds into Summative Assessment)
            </span>
          </h4>

          {quizGrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                    <th className="px-2 py-2 font-medium w-10">#</th>
                    <th className="px-2 py-2 font-medium">Assessment</th>
                    <th className="px-2 py-2 font-medium w-20 text-center">
                      Score
                    </th>
                    <th className="px-2 py-2 font-medium w-24 text-center">
                      Total Items
                    </th>
                    <th className="px-2 py-2 font-medium w-24 text-center">
                      Equivalent
                    </th>
                    <th className="px-2 py-2 font-medium w-28">Status</th>
                    <th className="px-2 py-2 font-medium w-24 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quizGrades.map((entry, index) => {
                    const equivalent = computeQuizEquivalent(
                      entry.score,
                      entry.max_score,
                    );
                    const hasScore = entry.score != null;
                    return (
                      <tr
                        key={entry.criterion_key}
                        className="border-b border-white/5"
                      >
                        <td className="px-2 py-2 text-slate-400">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 text-white">
                          {entry.criterion_label || entry.criterion_key}
                        </td>
                        <td className="px-2 py-2 text-center text-white">
                          {entry.score ?? "--"}
                        </td>
                        <td className="px-2 py-2 text-center text-slate-300">
                          {entry.max_score ?? "--"}
                        </td>
                        <td className="px-2 py-2 text-center text-yellow-200">
                          {equivalent !== null ? equivalent.toFixed(1) : "--"}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              hasScore
                                ? "bg-emerald-600/20 text-emerald-300"
                                : "bg-slate-600/30 text-slate-400"
                            }`}
                          >
                            {hasScore ? "Scored" : "No Score"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => openQuizScoreModal(entry)}
                            className="mr-2 rounded border border-purple-500/40 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/10"
                            title="Edit quiz score"
                          >
                            Grade
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteScoreboardActivity(
                                entry.criterion_key,
                              )
                            }
                            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            title="Delete quiz entry"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-white/5 px-4 py-6 text-center text-sm text-slate-500">
              No quiz scores yet. Click "Auto-populate from Quiz/Activity" to
              pull quiz scores.
            </div>
          )}
        </div>

        {/* Activity Grading Section */}
        <div className="rounded-lg border border-white/10 bg-ink-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              Activity Grading
              <span className="ml-2 text-xs font-normal text-slate-400">
                Grade each activity across all rubric criteria
              </span>
            </h4>
            <span className="text-xs text-slate-300">
              {completeCount} / {activityEntries.length} fully graded
            </span>
          </div>

          {activityEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                    <th className="px-2 py-2 font-medium">Activity</th>
                    <th className="px-2 py-2 font-medium w-40">
                      Criteria Scored
                    </th>
                    <th className="px-2 py-2 font-medium w-24">Average</th>
                    <th className="px-2 py-2 font-medium w-28">Status</th>
                    <th className="px-2 py-2 font-medium w-20">Source</th>
                    <th className="px-2 py-2 font-medium w-40 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activityEntries.map((activity) => {
                    const activityStatus = getActivityStatus(activity);
                    return (
                      <tr
                        key={activity.activityKey}
                        className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                        onClick={() => openScoreboardGradeModal(activity)}
                      >
                        <td className="px-2 py-2 text-white">
                          {activity.activityLabel}
                        </td>
                        <td className="px-2 py-2 text-slate-300">
                          {activity.criteriaGraded} / {SCOREBOARD_CRITERIA.length}
                        </td>
                        <td className="px-2 py-2 text-white">
                          {activity.criteriaAverage != null
                            ? `${activity.criteriaAverage.toFixed(2)} / 5`
                            : "--"}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              activityStatus === "did_not_submit"
                                ? "bg-rose-600/20 text-rose-300"
                                : activityStatus === "complete"
                                  ? "bg-emerald-600/20 text-emerald-300"
                                  : "bg-amber-600/20 text-amber-300"
                            }`}
                          >
                            {activityStatus === "did_not_submit"
                              ? "Did Not Submit"
                              : activityStatus === "complete"
                                ? "Complete"
                                : "Needs Grading"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-xs text-slate-400">
                            {activity.source === "manual"
                              ? "Manual"
                              : activity.source === "auto_activity"
                                ? "Activity"
                                : "Auto"}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openScoreboardGradeModal(activity);
                            }}
                            className="mr-2 rounded border border-purple-500/40 px-2 py-1 text-xs text-purple-300 hover:bg-purple-500/10"
                            title="Open grading modal"
                          >
                            Grade
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScoreboardActivity(
                                activity.activityKey,
                              );
                            }}
                            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            title="Delete activity entry"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-white/5 px-4 py-6 text-center text-sm text-slate-500">
              No activity entries yet. Add one below or auto-populate.
            </div>
          )}
        </div>

        <AddScoreboardEntry
          onAdd={(key, label) => {
            upsertPendingScores([
              {
                sheet: "scoreboard",
                criterion_key: key,
                criterion_label: label,
                category: SCOREBOARD_META_CATEGORY,
                score: null,
                max_score: 5,
                source: "manual",
              },
            ]);
            openScoreboardGradeModal(
              createEmptyScoreboardActivity(key, label, "manual"),
            );
          }}
        />
      </div>
    );
  }

  // Performance Evaluation Tab
  function renderPerformance() {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Performance Evaluation
        </h3>
        <p className="text-sm text-slate-400">
          Actual is auto-computed from ScoreBoard and quiz/activity data. Fill
          in Strength and For Improvements only (separate from Endorsement
          Feedback).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium w-16">Weight</th>
                <th className="px-2 py-2 font-medium w-24">Actual</th>
                <th className="px-2 py-2 font-medium">Strength</th>
                <th className="px-2 py-2 font-medium">For Improvements</th>
              </tr>
            </thead>
            <tbody>
              {PERFORMANCE_CATEGORY_ROWS.map((item) => {
                const categoryScore = computeCategoryScore(item.category);
                const actualPercent = (categoryScore / 5) * item.weight;
                const strengthKey = getBootcampStrengthKey(item.category);
                const improvementKey = getBootcampImprovementKey(item.category);
                return (
                <tr key={item.key} className="border-b border-white/5">
                  <td className="px-2 py-2 text-white">{item.label}</td>
                  <td className="px-2 py-2 text-slate-400">{item.weight}%</td>
                  <td className="px-2 py-2 text-white">
                    {actualPercent.toFixed(1)}%
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={getRemarks(
                        PERFORMANCE_FEEDBACK_SHEET,
                        strengthKey,
                      )}
                      onChange={(e) =>
                        setRemarksValue(
                          PERFORMANCE_FEEDBACK_SHEET,
                          strengthKey,
                          e.target.value,
                        )
                      }
                      placeholder="Strength"
                      className="w-full rounded border border-white/10 bg-ink-900 px-2 py-1 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={getRemarks(
                        PERFORMANCE_FEEDBACK_SHEET,
                        improvementKey,
                      )}
                      onChange={(e) =>
                        setRemarksValue(
                          PERFORMANCE_FEEDBACK_SHEET,
                          improvementKey,
                          e.target.value,
                        )
                      }
                      placeholder="For improvements"
                      className="w-full rounded border border-white/10 bg-ink-900 px-2 py-1 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // â”€â”€ Behavioral Evaluation Tab â”€â”€

  function renderBehavioral() {
    const behavioralCriteria = [
      {
        key: "bh_adaptability",
        label: "Technical Knowledge and Skills",
        description:
          "Shows job relevant knowledge and skills, acquired from education, experience and specialized trainings, needed to perform the duties and requirements of the position.",
      },
      {
        key: "bh_initiative",
        label: "Judgement and Conflict Management",
        description:
          "Ability to evaluate situations and make sound decisions, and use of reasoning to identify, solve, prevent, and handle future conflicts.",
      },
      {
        key: "bh_dependability",
        label: "Reliability and Dependability",
        description:
          "Trustworthiness in carrying-out instructions, establishing procedures and performing work assignments with minimal supervision.",
      },
      {
        key: "bh_attitude",
        label: "Flexibility",
        description:
          "Ability to do other functions within and/or outside his/her scope and limitations without risking work quality.",
      },
      {
        key: "bh_cooperation",
        label: "Teamwork",
        description:
          "A team player. Ability to work with others with shared objectives and willingness to share/contribute new methods and ideas to the group.",
      },
      {
        key: "bh_attendance",
        label: "Drive for Excellence",
        description:
          "Ability to maximize full potential, consistently exceed standards, and execute tasks right the first time.",
      },
      {
        key: "bh_professionalism",
        label: "Integrity",
        description:
          "Able to live values and adhere to moral and ethical standards such as honesty and respect for others.",
      },
      {
        key: "bh_information_security",
        label: "Information Safety and Security",
        description:
          "Ability to protect Computer Information Systems security and the confidentiality of information available to or received by him/her.",
      },
      {
        key: "bh_communication",
        label: "Written Communication",
        description:
          "Ability to use various writing styles for effective communication and express messages clearly and informatively.",
      },
      {
        key: "bh_oral_communication",
        label: "Oral Communication",
        description:
          "Ability to speak clearly and persuasively, show language fluency, and respond to questions professionally.",
      },
      {
        key: "bh_interpersonal_relations",
        label: "Interpersonal Relations",
        description:
          "Able to establish good working relationships, with respect and courtesy with most of his/her peers, subordinates, superiors, clients and the general public.",
      },
      {
        key: "section_professional_customer_service",
        type: "section" as const,
        label: "PROFESSIONAL AND CUSTOMER SERVICE",
      },
      {
        key: "bh_grooming_attire",
        label: "Grooming and Attire",
        description:
          "Maintains pleasant and professional image at all times and able to present himself/herself professionally and knowledgeably.",
      },
      {
        key: "bh_service_professionalism",
        label: "Professionalism",
        description:
          "Shows courtesy and sensitivity to clients and subordinates at all times, and values commitments and word of honor.",
      },
      {
        key: "bh_accessibility",
        label: "Accessibility",
        description:
          "Ability to stay available and approachable/accessible to clients and subordinates at all times.",
      },
      {
        key: "bh_handling_situations",
        label: "Handling Situations",
        description:
          "Able to follow procedure and carefully improvise to solve customer problems, handle difficult service routines politely, and respond to client needs promptly.",
      },
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Behavioral Evaluation
        </h3>
        <p className="text-sm text-slate-400">
          Rate the trainee on each behavioral criterion.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="px-2 py-2 font-medium">Criterion</th>
                <th className="px-2 py-2 font-medium w-24">Score (1-5)</th>
              </tr>
            </thead>
            <tbody>
              {behavioralCriteria.map((item) => {
                if (item.type === "section") {
                  return (
                    <tr key={item.key} className="border-b border-white/10 bg-white/5">
                      <td
                        colSpan={2}
                        className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-yellow-200"
                      >
                        {item.label}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={item.key} className="border-b border-white/5">
                    <td className="px-2 py-2 text-white">
                      <div className="font-medium">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {item.description}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={getScore("behavioral", item.key) ?? ""}
                        onChange={(e) => {
                          const parsed = e.target.value
                            ? parseFloat(e.target.value)
                            : NaN;
                          const val = Number.isFinite(parsed)
                            ? Math.min(Math.max(parsed, 1), 5)
                            : null;
                          setScoreValue("behavioral", item.key, val, {
                            criterion_label: item.label,
                            max_score: 5,
                          });
                        }}
                        className="w-20 rounded border border-white/10 bg-ink-900 px-2 py-1 text-center text-white focus:border-purple-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // â”€â”€ Technical Evaluation Tab â”€â”€

  function renderTechnical() {
    const technicalCriteria = [
      { key: "te_technical_knowledge", label: "Technical Knowledge" },
      { key: "te_code_quality", label: "Code Quality" },
      { key: "te_debugging", label: "Debugging and Problem-solving" },
      { key: "te_system_design", label: "System Design" },
      { key: "te_documentation", label: "Documentation" },
      { key: "te_testing", label: "Testing Practices" },
      { key: "te_tools", label: "Development Tools Proficiency" },
      { key: "te_best_practices", label: "Best Practices and Standards" },
    ];

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Technical Evaluation
        </h3>
        <p className="text-sm text-slate-400">
          Rate the trainee on each technical skill criterion.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="px-2 py-2 font-medium">Criterion</th>
                <th className="px-2 py-2 font-medium w-24">Score (1-5)</th>
                <th className="px-2 py-2 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {technicalCriteria.map((item) => (
                <tr key={item.key} className="border-b border-white/5">
                  <td className="px-2 py-2 text-white">{item.label}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={0.5}
                      value={getScore("technical", item.key) ?? ""}
                      onChange={(e) => {
                        const parsed = e.target.value
                          ? parseFloat(e.target.value)
                          : NaN;
                        const val = Number.isFinite(parsed)
                          ? Math.min(Math.max(parsed, 1), 5)
                          : null;
                        setScoreValue("technical", item.key, val, {
                          criterion_label: item.label,
                          max_score: 5,
                        });
                      }}
                      className="w-20 rounded border border-white/10 bg-ink-900 px-2 py-1 text-center text-white focus:border-purple-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={getRemarks("technical", item.key)}
                      onChange={(e) =>
                        setRemarksValue("technical", item.key, e.target.value)
                      }
                      placeholder="Optional remarks"
                      className="w-full rounded border border-white/10 bg-ink-900 px-2 py-1 text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // â”€â”€ Summary Tab â”€â”€

  function renderSummary() {
    const bootcampPercent = computeBootcampPercent();
    const performancePercent = computePerformancePercent();
    const overallScore = computeOverallScore();
    const rating = getAdjectivalRating(overallScore);

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white">
          Dashboard / Summary
        </h3>

        {/* Overall */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-6 text-center">
          <p className="text-sm text-slate-400">Overall Weighted Score</p>
          <p className="mt-2 text-4xl font-bold text-white">
            {overallScore.toFixed(1)}%
          </p>
          <p className="mt-1 text-lg text-purple-300">{rating}</p>
          <p className="mt-2 text-xs text-slate-400">
            Bootcamp: {bootcampPercent.toFixed(1)}% | Endorsed:{" "}
            {performancePercent.toFixed(1)}%
          </p>
        </div>

        {/* Per-category breakdown */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOOTCAMP_CRITERIA.map((group) => {
            const catScore = computeCategoryScore(group.category);
            const catWeight = CATEGORY_WEIGHTS[group.category] || 0;
            const weighted = (catScore / 5) * catWeight;

            return (
              <div
                key={group.category}
                className="rounded-lg border border-white/10 bg-ink-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    {group.category}. {group.label}
                  </span>
                  <span className="text-xs text-slate-400">{catWeight}%</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-white">
                      {catScore.toFixed(2)}
                    </span>
                    <span className="mb-0.5 text-sm text-slate-400">/ 5</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${(catScore / 5) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Weighted: {weighted.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scoreboard summary */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">
            ScoreBoard Entries
          </h4>
          {(() => {
            const sbEntries = Array.from(pendingScores.values()).filter(
              (s) => s.sheet === "scoreboard",
            );
            if (sbEntries.length === 0)
              return (
                <p className="text-sm text-slate-400">
                  No scoreboard data yet.
                </p>
              );
            const scored = sbEntries.filter((s) => s.score != null);
            const avg =
              scored.length > 0
                ? scored.reduce((sum, s) => sum + (s.score ?? 0), 0) /
                  scored.length
                : 0;
            return (
              <p className="text-sm text-slate-300">
                {scored.length} of {sbEntries.length} entries scored. Average:{" "}
                {avg.toFixed(2)} / 5
              </p>
            );
          })()}
        </div>
      </div>
    );
  }

  // â”€â”€ List View â”€â”€

  const columns = [
    {
      key: "trainee_name",
      header: "Trainee",
      render: (row: Evaluation) => (
        <div>
          <p className="font-medium text-white">{row.trainee_name || "â€”"}</p>
          <p className="text-xs text-slate-400">{row.trainee_email || ""}</p>
        </div>
      ),
    },
    {
      key: "learning_path_title",
      header: "Learning Path",
      render: (row: Evaluation) => (
        <span className="text-slate-300">
          {row.learning_path_title || "â€”"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Evaluation) => (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[row.status] || "bg-slate-600 text-slate-200"}`}
        >
          {statusLabels[row.status] || row.status}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (row: Evaluation) => (
        <span className="text-sm text-slate-400">
          {row.period_start || "â€”"} to {row.period_end || "â€”"}
        </span>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      render: (row: Evaluation) => (
        <span className="text-sm text-slate-400">
          {row.updated_at
            ? new Date(row.updated_at).toLocaleDateString()
            : "â€”"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: Evaluation) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExport(row.id);
            }}
            className="rounded border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
            title="Export"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.id);
            }}
            className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
            title="Delete"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      ),
      width: "80px",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Evaluations</h2>
          <p className="text-sm text-slate-400">
            Manage bootcamp trainee evaluations and export as Excel.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateForm({
              userId: "",
              learningPathId: "",
              periodStart: "",
              periodEnd: "",
              position: "",
              department: "",
            });
            setActionError(null);
            setIsCreateOpen(true);
          }}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
        >
          + Create Evaluation
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {loading || detailLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={evaluations}
          onRowClick={(row) => openDetail(row)}
          emptyMessage="No evaluations found."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        title="Create Evaluation"
        onClose={() => setIsCreateOpen(false)}
        size="md"
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !createForm.userId}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {actionError && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-300">
              {actionError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Trainee *
            </label>
            <select
              value={createForm.userId}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  userId: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white"
            >
              <option value="">Select a trainee...</option>
              {users
                .filter((u) => u.role === "user")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name && u.last_name
                      ? `${u.first_name} ${u.last_name}`
                      : u.username || u.email}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Learning Path
            </label>
            <select
              value={createForm.learningPathId}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  learningPathId: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white"
            >
              <option value="">None</option>
              {learningPaths.map((lp) => (
                <option key={lp.id} value={lp.id}>
                  {lp.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Period Start
              </label>
              <input
                type="date"
                value={createForm.periodStart}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodStart: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Period End
              </label>
              <input
                type="date"
                value={createForm.periodEnd}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    periodEnd: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Position
              </label>
              <input
                type="text"
                value={createForm.position}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    position: e.target.value,
                  }))
                }
                placeholder="e.g., Software Engineer Trainee"
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white placeholder-slate-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Department
              </label>
              <input
                type="text"
                value={createForm.department}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
                placeholder="e.g., Engineering"
                className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-white placeholder-slate-600"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// â”€â”€ AddScoreboardEntry helper â”€â”€

const AddScoreboardEntry = ({
  onAdd,
}: {
  onAdd: (key: string, label: string) => void;
}) => {
  const [label, setLabel] = useState("");

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Activity name (e.g., Portfolio Project)"
        className="rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
      />
      <button
        onClick={() => {
          if (!label.trim()) return;
          const key = `manual_${label.trim().toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
          onAdd(key, label.trim());
          setLabel("");
        }}
        disabled={!label.trim()}
        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
      >
        + Add Activity
      </button>
    </div>
  );
};

export default EvaluationSection;
