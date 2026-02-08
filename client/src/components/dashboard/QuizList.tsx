import { useMemo } from "react";
import type { Quiz, QuizAttempt, QuizScore } from "../../types/dashboard";

type QuizListProps = {
  quizzes: Quiz[];
  quizScores: QuizScore[];
  quizAttempts: QuizAttempt[];
  onUploadProof?: (quiz: Quiz) => void;
  uploadingQuizId?: string | null;
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getQuizAvailability = (quiz: Quiz) => {
  const now = new Date();
  const status = (quiz.status ?? "active").toLowerCase();
  const statusAllowsOpen = ["active", "open", "published"].includes(status);
  const start = quiz.start_at ? new Date(quiz.start_at) : null;
  const end = quiz.end_at ? new Date(quiz.end_at) : null;

  let isOpen = statusAllowsOpen;
  if (start && now < start) isOpen = false;
  if (end && now > end) isOpen = false;

  let label = isOpen ? "Open" : "Closed";
  if (!statusAllowsOpen) {
    label = status === "archived" ? "Archived" : status;
  } else if (start && now < start) {
    label = `Opens ${formatDateTime(start)}`;
  } else if (end && now > end) {
    label = `Closed ${formatDateTime(end)}`;
  } else if (end) {
    label = `Closes ${formatDateTime(end)}`;
  }

  const windowLabel =
    start || end
      ? `${start ? formatDateTime(start) : "Anytime"}${end ? ` -> ${formatDateTime(end)}` : ""}`
      : "Anytime";

  const badgeClass = !statusAllowsOpen
    ? "badge-default"
    : isOpen
      ? "badge-success"
      : "badge-warning";

  return { isOpen, label, windowLabel, badgeClass };
};

const buildLatestScoreMap = (scores: QuizScore[]) => {
  const map = new Map<string, QuizScore>();
  scores.forEach((score) => {
    const existing = map.get(score.quiz_id);
    if (!existing) {
      map.set(score.quiz_id, score);
      return;
    }
    const existingTime = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
    const currentTime = score.submitted_at ? new Date(score.submitted_at).getTime() : 0;
    if (currentTime >= existingTime) {
      map.set(score.quiz_id, score);
    }
  });
  return map;
};

const buildLatestAttemptMap = (attempts: QuizAttempt[]) => {
  const map = new Map<string, QuizAttempt>();
  attempts.forEach((attempt) => {
    const existing = map.get(attempt.quiz_id);
    if (!existing) {
      map.set(attempt.quiz_id, attempt);
      return;
    }
    const existingTime = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
    const currentTime = attempt.submitted_at ? new Date(attempt.submitted_at).getTime() : 0;
    if (currentTime >= existingTime) {
      map.set(attempt.quiz_id, attempt);
    }
  });
  return map;
};

const QuizList = ({
  quizzes,
  quizScores,
  quizAttempts,
  onUploadProof,
  uploadingQuizId,
}: QuizListProps) => {
  const scoreLookup = useMemo(() => buildLatestScoreMap(quizScores), [quizScores]);
  const attemptLookup = useMemo(() => buildLatestAttemptMap(quizAttempts), [quizAttempts]);

  if (quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No quizzes assigned yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => {
        const score = scoreLookup.get(quiz.id) ?? null;
        const attempt = attemptLookup.get(quiz.id) ?? null;
        const isCompleted = Boolean(attempt?.submitted_at);
        const hasProof = Boolean(attempt?.proof_url);
        const availability = getQuizAvailability(quiz);
        const status = (quiz.status ?? "active").toLowerCase();
        const isArchived = status === "archived";
        const canShowScore = quiz.show_score !== false;
        const hasScore = score !== null && typeof score.score === "number";
        const maxScore = quiz.max_score ?? null;
        const scoreLabel = hasScore
          ? maxScore
            ? `${score?.score} / ${maxScore}`
            : `${score?.score}`
          : canShowScore
            ? "Awaiting score"
            : "Hidden";
        const scoreNote = canShowScore
          ? hasScore
            ? score?.submitted_at
              ? `Posted ${formatDateTime(score.submitted_at)}.`
              : "Score posted."
            : isCompleted
              ? "Your admin will post the score after review."
              : "Upload proof after completing the quiz."
          : "Score is hidden by your instructor.";

        const isClosed = !availability.isOpen;
        const isDone = isCompleted && hasScore;
        const canOpen = availability.isOpen && !isDone && Boolean(quiz.link_url);
        const canUploadProof = Boolean(onUploadProof) && !isArchived && !isClosed && !isDone && uploadingQuizId !== quiz.id;

        const handleUploadProofClick = () => {
          if (!onUploadProof || !canUploadProof) return;
          onUploadProof(quiz);
        };

        return (
          <div key={quiz.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Quiz</p>
                <h3 className="mt-2 font-display text-xl text-white">{quiz.title}</h3>
                {quiz.description && (
                  <p className="mt-2 text-sm text-slate-300">{quiz.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className={availability.badgeClass}>{availability.label}</span>
                  <span className={isCompleted ? "badge-success" : "badge-default"}>
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                  <span className={hasProof ? "badge-success" : "badge-warning"}>
                    {hasProof ? "Proof submitted" : "Proof required"}
                  </span>
                  <span className="badge-default">{availability.windowLabel}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
                  {quiz.total_questions ? `${quiz.total_questions} questions` : "External quiz"}
                </span>
                <span>
                  {attempt?.submitted_at
                    ? `Submitted ${formatDateTime(attempt.submitted_at)}`
                    : "Not submitted yet"}
                </span>
                <span>
                  {hasProof
                    ? `Proof uploaded ${formatDateTime(attempt?.proof_submitted_at ?? attempt?.submitted_at)}`
                    : "Proof not uploaded"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr_0.9fr]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Score</p>
                <p className="mt-2 text-xl font-semibold text-white">{scoreLabel}</p>
                <p className="mt-1 text-xs text-slate-400">{scoreNote}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">How it works</p>
                <p className="mt-2 text-xs text-slate-300">
                  1. Open the quiz link. 2. Submit your responses. 3. Upload proof so your
                  admin can verify and grade.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={quiz.link_url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-full border px-5 py-2 text-center text-xs uppercase tracking-[0.25em] transition ${
                    canOpen
                      ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                      : "pointer-events-none border-white/5 bg-white/[0.02] text-slate-600"
                  }`}
                  aria-disabled={!canOpen}
                  tabIndex={canOpen ? undefined : -1}
                  onClick={(event) => {
                    if (!canOpen) {
                      event.preventDefault();
                    }
                  }}
                >
                  Open quiz
                </a>
                <button
                  type="button"
                  onClick={handleUploadProofClick}
                  disabled={!canUploadProof}
                  className={`rounded-full border px-5 py-2 text-xs uppercase tracking-[0.25em] transition ${
                    canUploadProof
                      ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                      : "border-white/5 bg-white/[0.02] text-slate-600 cursor-not-allowed"
                  }`}
                >
                  {uploadingQuizId === quiz.id
                    ? "Uploading..."
                    : hasProof
                      ? "Replace proof"
                      : "Upload proof"}
                </button>
                {!quiz.link_url && !isClosed && (
                  <p className="text-xs text-slate-500">Quiz link unavailable. Contact your admin.</p>
                )}
                {isClosed && (
                  <p className="text-xs text-rose-400/70">This quiz is currently closed.</p>
                )}
                {isArchived && (
                  <p className="text-xs text-slate-500">This quiz has been archived.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuizList;
