import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Course, Quiz, QuizScore } from "../../../types/superAdmin";

const QuizzesSection = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    course_id: "",
    assigned_user_id: "",
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
      const [quizData, scoreData, courseData, userData] = await Promise.all([
        superAdminService.listQuizzes(),
        superAdminService.listQuizScores(),
        superAdminService.listCourses(),
        superAdminService.listUsers(),
      ]);
      setQuizzes(quizData);
      setScores(scoreData);
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
      course_id: "",
      assigned_user_id: "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setFormState({
      title: quiz.title,
      description: quiz.description ?? "",
      course_id: quiz.course_id ?? "",
      assigned_user_id: quiz.assigned_user_id ?? "",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionError(null);
    try {
      if (selectedQuiz) {
        await superAdminService.updateQuiz({
          quizId: selectedQuiz.id,
          updates: {
            title: formState.title,
            description: formState.description,
            course_id: formState.course_id || null,
            assigned_user_id: formState.assigned_user_id || null,
          },
          questions: [],
        });
      } else {
        await superAdminService.createQuiz({
          quiz: {
            title: formState.title,
            description: formState.description,
            course_id: formState.course_id || null,
            assigned_user_id: formState.assigned_user_id || null,
            show_score: true,
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
    const numericScore = Number(scoreState.score);
    if (Number.isNaN(numericScore)) {
      setActionError("Enter a valid numeric score.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      if (selectedScore) {
        await superAdminService.updateQuizScore(selectedScore.id, numericScore);
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

  const quizColumns = useMemo(
    () => [
      {
        key: "quiz",
        header: "Quiz",
        render: (quiz: Quiz) => (
          <div>
            <p className="font-semibold text-white">{quiz.title}</p>
            <p className="text-xs text-slate-400">{quiz.description}</p>
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
              {courseName ? `Course: ${courseName}` : userEmail ? `User: ${userEmail}` : "Unassigned"}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        render: (quiz: Quiz) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(quiz)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(quiz.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
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
          <span className="text-xs text-slate-300">{score.score}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (score: QuizScore) => (
          <button
            type="button"
            onClick={() => openScoreEdit(score)}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
          >
            Edit
          </button>
        ),
      },
    ],
    [quizzes, users]
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
            Create quiz metadata and track Microsoft Form scores.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
        >
          New quiz
        </button>
      </div>

      <DataTable columns={quizColumns} data={quizzes} emptyMessage="No quizzes created yet." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-white">Quiz scores</h3>
          <p className="text-sm text-slate-400">Add scores from Microsoft Forms.</p>
        </div>
        <button
          type="button"
          onClick={openScoreCreate}
          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
        >
          Add score
        </button>
      </div>

      <DataTable columns={scoreColumns} data={scores} emptyMessage="No scores recorded yet." />

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
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
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
              Course
              <select
                value={formState.course_id}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, course_id: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="">Unassigned</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Assign to user (optional)
              <select
                value={formState.assigned_user_id}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, assigned_user_id: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
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
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveScore}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save score"}
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
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>
    </div>
  );
};

export default QuizzesSection;
