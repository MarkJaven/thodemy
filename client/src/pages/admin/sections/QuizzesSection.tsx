import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Course, Quiz, QuizAttempt, QuizScore } from "../../../types/superAdmin";

const QuizzesSection = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "active",
    course_id: "",
    assigned_user_id: "",
    link_url: "",
    start_at: "",
    end_at: "",
    show_score: true,
    max_score: "",
  });

  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<QuizScore | null>(null);
  const [scoreState, setScoreState] = useState({
    quiz_id: "",
    user_id: "",
    score: "",
  });

  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quizData, scoreData, attemptData, courseData, userData] = await Promise.all([
        superAdminService.listQuizzes(),
        superAdminService.listQuizScores(),
        superAdminService.listQuizAttempts(),
        superAdminService.listCourses(),
        superAdminService.listUsers(),
      ]);
      setQuizzes(quizData);
      setScores(scoreData);
      setAttempts(attemptData);
      setCourses(courseData);
      setUsers(userData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load quizzes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedQuiz(null);
    setFormState({
      title: "",
      description: "",
      status: "active",
      course_id: "",
      assigned_user_id: "",
      link_url: "",
      start_at: "",
      end_at: "",
      show_score: true,
      max_score: "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setFormState({
      title: quiz.title,
      description: quiz.description ?? "",
      status: quiz.status ?? "active",
      course_id: quiz.course_id ?? "",
      assigned_user_id: quiz.assigned_user_id ?? "",
      link_url: quiz.link_url ?? "",
      start_at: quiz.start_at ? quiz.start_at.slice(0, 16) : "",
      end_at: quiz.end_at ? quiz.end_at.slice(0, 16) : "",
      show_score: quiz.show_score ?? true,
      max_score: quiz.max_score ? String(quiz.max_score) : "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    // Course is now optional - if no course is selected, quiz is visible to ALL enrolled learners (any course)
    const maxScoreValue = formState.max_score ? Number(formState.max_score) : null;
    if (formState.max_score && Number.isNaN(maxScoreValue)) {
      setActionError("Max score must be a number.");
      return;
    }
    if (maxScoreValue !== null && maxScoreValue <= 0) {
      setActionError("Max score must be greater than zero.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      if (selectedQuiz) {
        await superAdminService.updateQuiz({
          quizId: selectedQuiz.id,
          updates: {
            title: formState.title,
            description: formState.description,
            status: formState.status,
            course_id: formState.course_id || null,
            assigned_user_id: formState.assigned_user_id || null,
            link_url: formState.link_url || null,
            start_at: formState.start_at ? new Date(formState.start_at).toISOString() : null,
            end_at: formState.end_at ? new Date(formState.end_at).toISOString() : null,
            show_score: formState.show_score,
            max_score: maxScoreValue,
          },
          questions: [],
        });
      } else {
        await superAdminService.createQuiz({
          quiz: {
            title: formState.title,
            description: formState.description,
            status: formState.status,
            course_id: formState.course_id || null,
            assigned_user_id: formState.assigned_user_id || null,
            link_url: formState.link_url || null,
            start_at: formState.start_at ? new Date(formState.start_at).toISOString() : null,
            end_at: formState.end_at ? new Date(formState.end_at).toISOString() : null,
            show_score: formState.show_score,
            max_score: maxScoreValue,
          },
          questions: [],
        });
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteQuiz(quizId);
      await loadData();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete quiz.");
    } finally {
      setSaving(false);
    }
  };

  const openScoreCreate = () => {
    setSelectedScore(null);
    setScoreState({ quiz_id: "", user_id: "", score: "" });
    setActionError(null);
    setIsScoreOpen(true);
  };

  const openScoreEdit = (score: QuizScore) => {
    setSelectedScore(score);
    setScoreState({
      quiz_id: score.quiz_id,
      user_id: score.user_id,
      score: String(score.score),
    });
    setActionError(null);
    setIsScoreOpen(true);
  };

  const handleSaveScore = async () => {
    if (!scoreState.quiz_id || !scoreState.user_id) {
      setActionError("Quiz and user are required.");
      return;
    }
    if (!scoreState.score.trim()) {
      setActionError("Score is required.");
      return;
    }
    const numericScore = Number(scoreState.score);
    if (Number.isNaN(numericScore)) {
      setActionError("Enter a valid numeric score.");
      return;
    }
    if (numericScore < 0) {
      setActionError("Score must be zero or greater.");
      return;
    }
    const selectedQuizMeta = quizzes.find((quiz) => quiz.id === scoreState.quiz_id);
    if (
      selectedQuizMeta?.max_score !== null &&
      selectedQuizMeta?.max_score !== undefined &&
      numericScore > selectedQuizMeta.max_score
    ) {
      setActionError(`Score cannot exceed ${selectedQuizMeta.max_score}.`);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const existingScore = scores.find(
        (entry) =>
          entry.quiz_id === scoreState.quiz_id && entry.user_id === scoreState.user_id
      );
      const scoreToUpdate = selectedScore ?? existingScore ?? null;
      if (scoreToUpdate) {
        await superAdminService.updateQuizScore(scoreToUpdate.id, numericScore);
      } else {
        await superAdminService.createQuizScore({
          quiz_id: scoreState.quiz_id,
          user_id: scoreState.user_id,
          score: numericScore,
        });
      }
      setIsScoreOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save score.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteQuizScore(scoreId);
      await loadData();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete score.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewProof = async (attempt: QuizAttempt) => {
    setActionError(null);
    try {
      const url = await superAdminService.getQuizProofUrl(attempt.proof_url ?? null);
      if (!url) {
        setActionError("No proof file available for this attempt.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (loadError) {
      setActionError(
        loadError instanceof Error ? loadError.message : "Unable to open proof file."
      );
    }
  };

  const scoreLookup = useMemo(() => {
    const map = new Map<string, QuizScore>();
    scores.forEach((score) => {
      const key = `${score.quiz_id}:${score.user_id}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, score);
        return;
      }
      const existingTime = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
      const currentTime = score.submitted_at ? new Date(score.submitted_at).getTime() : 0;
      if (currentTime >= existingTime) {
        map.set(key, score);
      }
    });
    return map;
  }, [scores]);

  const quizSummary = useMemo(() => {
    const now = new Date();
    const activeStatuses = ["active", "open", "published"];
    let activeCount = 0;
    let completionCount = 0;
    let pendingScoreCount = 0;

    quizzes.forEach((quiz) => {
      const status = (quiz.status ?? "active").toLowerCase();
      const statusAllowsOpen = activeStatuses.includes(status);
      const startAt = quiz.start_at ? new Date(quiz.start_at) : null;
      const endAt = quiz.end_at ? new Date(quiz.end_at) : null;
      const isOpen =
        statusAllowsOpen &&
        (!startAt || now >= startAt) &&
        (!endAt || now <= endAt);
      if (isOpen) activeCount += 1;
    });

    attempts.forEach((attempt) => {
      if (!attempt.submitted_at) return;
      completionCount += 1;
      const scoreKey = `${attempt.quiz_id}:${attempt.user_id}`;
      if (attempt.proof_url && !scoreLookup.get(scoreKey)) {
        pendingScoreCount += 1;
      }
    });

    return {
      total: quizzes.length,
      activeCount,
      completionCount,
      pendingScoreCount,
    };
  }, [attempts, quizzes, scoreLookup]);

  const openScoreFromAttempt = (attempt: QuizAttempt) => {
    const key = `${attempt.quiz_id}:${attempt.user_id}`;
    const existingScore = scoreLookup.get(key) ?? null;
    setSelectedScore(existingScore);
    setScoreState({
      quiz_id: attempt.quiz_id,
      user_id: attempt.user_id,
      score: existingScore ? String(existingScore.score) : "",
    });
    setActionError(null);
    setIsScoreOpen(true);
  };

  const selectedScoreQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === scoreState.quiz_id) ?? null,
    [quizzes, scoreState.quiz_id]
  );

  const quizColumns = useMemo(
    () => [
      {
        key: "quiz",
        header: "Quiz",
        render: (quiz: Quiz) => (
          <div className="space-y-2">
            <div>
              <p className="font-semibold text-white">{quiz.title}</p>
              <p className="text-xs text-slate-400">{quiz.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={
                  quiz.status === "archived"
                    ? "badge-warning"
                    : quiz.status === "active" || !quiz.status
                      ? "badge-success"
                      : "badge-default"
                }
              >
                {quiz.status ?? "active"}
              </span>
              {quiz.link_url ? (
                <a
                  href={quiz.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white"
                >
                  Open link
                </a>
              ) : (
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  No link
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "assignment",
        header: "Assignment",
        render: (quiz: Quiz) => {
          const courseName = courses.find((course) => course.id === quiz.course_id)?.title;
          const userEmail = users.find((user) => user.id === quiz.assigned_user_id)?.email;
          return (
            <span className="text-xs text-slate-400">
              {courseName
                ? userEmail
                  ? `Course: ${courseName} · User: ${userEmail}`
                  : `Course: ${courseName} · All enrolled`
                : userEmail
                  ? `User: ${userEmail}`
                  : "All enrolled (any course)"}
            </span>
          );
        },
      },
      {
        key: "window",
        header: "Window",
        render: (quiz: Quiz) => (
          <span className="text-xs text-slate-400">
            {quiz.start_at ? new Date(quiz.start_at).toLocaleString() : "Anytime"}{" "}
            {quiz.end_at ? `-> ${new Date(quiz.end_at).toLocaleString()}` : ""}
          </span>
        ),
      },
      {
        key: "visibility",
        header: "Score visibility",
        render: (quiz: Quiz) => (
          <span className={quiz.show_score ? "badge-info" : "badge-default"}>
            {quiz.show_score ? "Shown" : "Hidden"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (quiz: Quiz) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(quiz)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(quiz.id)}
              className="btn-danger flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [courses, users]
  );

  const scoreColumns = useMemo(
    () => [
      {
        key: "quiz",
        header: "Quiz",
        render: (score: QuizScore) => (
          <span className="text-xs text-slate-300">
            {quizzes.find((quiz) => quiz.id === score.quiz_id)?.title ?? score.quiz_id}
          </span>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (score: QuizScore) => (
          <span className="text-xs text-slate-300">
            {users.find((user) => user.id === score.user_id)?.email ?? score.user_id}
          </span>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (score: QuizScore) => (
          <span className="text-xs text-slate-300">
            {(() => {
              const maxScore = quizzes.find((quiz) => quiz.id === score.quiz_id)?.max_score;
              return maxScore ? `${score.score} / ${maxScore}` : score.score;
            })()}
          </span>
        ),
      },
      {
        key: "graded",
        header: "Graded",
        render: (score: QuizScore) => (
          <span className="text-xs text-slate-400">
            {score.submitted_at ? new Date(score.submitted_at).toLocaleString() : "--"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (score: QuizScore) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openScoreEdit(score)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDeleteScore(score.id)}
              className="btn-danger flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [quizzes, users]
  );

  const attemptColumns = useMemo(
    () => [
      {
        key: "quiz",
        header: "Quiz",
        render: (attempt: QuizAttempt) => (
          <span className="text-xs text-slate-300">
            {quizzes.find((quiz) => quiz.id === attempt.quiz_id)?.title ?? attempt.quiz_id}
          </span>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (attempt: QuizAttempt) => (
          <span className="text-xs text-slate-300">
            {users.find((user) => user.id === attempt.user_id)?.email ?? attempt.user_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (attempt: QuizAttempt) => {
          const status = attempt.submitted_at ? "completed" : "pending";
          return (
            <span className={status === "completed" ? "badge-success" : "badge-warning"}>
              {status}
            </span>
          );
        },
      },
      {
        key: "score",
        header: "Score",
        render: (attempt: QuizAttempt) => {
          const score = scoreLookup.get(`${attempt.quiz_id}:${attempt.user_id}`);
          if (!score) {
            return <span className="badge-warning">Needs score</span>;
          }
          const maxScore = quizzes.find((quiz) => quiz.id === attempt.quiz_id)?.max_score;
          return (
            <span className="text-xs text-slate-300">
              {maxScore ? `${score.score} / ${maxScore}` : score.score}
            </span>
          );
        },
      },
      {
        key: "submitted",
        header: "Submitted",
        render: (attempt: QuizAttempt) => (
          <span className="text-xs text-slate-300">
            {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "--"}
          </span>
        ),
      },
      {
        key: "proof",
        header: "Proof",
        render: (attempt: QuizAttempt) =>
          attempt.proof_url ? (
            <button
              type="button"
              onClick={() => handleViewProof(attempt)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View proof
            </button>
          ) : (
            <span className="badge-warning">Missing</span>
          ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (attempt: QuizAttempt) => {
          const score = scoreLookup.get(`${attempt.quiz_id}:${attempt.user_id}`);
          return (
            <button
              type="button"
              onClick={() => openScoreFromAttempt(attempt)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {score ? "Edit score" : "Record score"}
            </button>
          );
        },
      },
    ],
    [quizzes, users, scoreLookup, handleViewProof]
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading quizzes...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Quizzes</h2>
          <p className="text-sm text-slate-300">
            Create external quizzes, assign learners, and record scores.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Quiz
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Total quizzes</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.total}</p>
          <p className="mt-1 text-xs text-slate-500">All quiz records in the system.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Open now</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.activeCount}</p>
          <p className="mt-1 text-xs text-slate-500">Active quizzes within their window.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Completions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.completionCount}</p>
          <p className="mt-1 text-xs text-slate-500">Learner submissions received.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Scores pending</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.pendingScoreCount}</p>
          <p className="mt-1 text-xs text-slate-500">Completions awaiting grading.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="text-sm font-semibold text-white">External quiz flow</p>
        <p className="mt-2 text-xs text-slate-400">
          1. Add the quiz link, window, and assignment. 2. Learners open the link and mark
          completion. 3. Record scores to publish results.
        </p>
      </div>

      <DataTable columns={quizColumns} data={quizzes} emptyMessage="No quizzes created yet." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-white">Quiz scores</h3>
          <p className="text-sm text-slate-400">Add scores from the external quiz.</p>
        </div>
        <button
          type="button"
          onClick={openScoreCreate}
          className="btn-secondary flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Score
        </button>
      </div>

      <DataTable columns={scoreColumns} data={scores} emptyMessage="No scores recorded yet." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-white">Quiz completions</h3>
          <p className="text-sm text-slate-400">Learner completion confirmations and proof uploads.</p>
        </div>
      </div>

      <DataTable
        columns={attemptColumns}
        data={attempts}
        emptyMessage="No quiz completions yet."
      />

      {actionError && <p className="text-xs text-rose-200">{actionError}</p>}

      <Modal
        isOpen={isFormOpen}
        title={selectedQuiz ? "Edit quiz" : "Create quiz"}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Quiz"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Title
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Description
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Status
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Assigned user (optional)
              <select
                value={formState.assigned_user_id}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, assigned_user_id: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="">All enrolled</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Leave blank to assign to all enrolled users (in selected course, or any course if none selected).
              </span>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Quiz link
              <input
                type="url"
                value={formState.link_url}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, link_url: event.target.value }))
                }
                placeholder="https://forms.office.com/..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Course (optional)
              <select
                value={formState.course_id}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, course_id: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="">Any course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Leave blank to show quiz to all enrolled learners regardless of course.
              </span>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Start date/time
              <input
                type="datetime-local"
                value={formState.start_at}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, start_at: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              End date/time
              <input
                type="datetime-local"
                value={formState.end_at}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, end_at: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Max score
              <input
                type="number"
                min="0"
                value={formState.max_score}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, max_score: event.target.value }))
                }
                placeholder="Optional"
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 text-xs uppercase tracking-[0.25em] text-slate-400">
              Show score to learners
              <input
                type="checkbox"
                checked={formState.show_score}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, show_score: event.target.checked }))
                }
                className="h-4 w-4 rounded border-white/20 bg-transparent text-accent-purple focus:ring-0"
              />
            </label>
          </div>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>

      <Modal
        isOpen={isScoreOpen}
        title={selectedScore ? "Edit quiz score" : "Add quiz score"}
        onClose={() => setIsScoreOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsScoreOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveScore}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Score"
              )}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Quiz
            <select
              value={scoreState.quiz_id}
              onChange={(event) =>
                setScoreState((prev) => ({ ...prev, quiz_id: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="">Select quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            User
            <select
              value={scoreState.user_id}
              onChange={(event) =>
                setScoreState((prev) => ({ ...prev, user_id: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Score
            <input
              type="number"
              value={scoreState.score}
              onChange={(event) =>
                setScoreState((prev) => ({ ...prev, score: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <div className="md:col-span-2 text-xs text-slate-400">
            {selectedScoreQuiz?.max_score
              ? `Max score: ${selectedScoreQuiz.max_score}. `
              : "No max score set. "}
            {selectedScoreQuiz
              ? selectedScoreQuiz.show_score
                ? "Scores will be visible to learners."
                : "Scores are hidden from learners."
              : "Select a quiz to see score visibility."}
          </div>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>
    </div>
  );
};

export default QuizzesSection;
