import type { Quiz, QuizAttempt, QuizScore } from "../../types/dashboard";

type QuizListProps = {
  quizzes: Quiz[];
  quizScores: QuizScore[];
  quizAttempts: QuizAttempt[];
  onCompleteQuiz?: (quiz: Quiz) => void;
  completingQuizId?: string | null;
};

const QuizList = ({
  quizzes,
  quizScores,
  quizAttempts,
  onCompleteQuiz,
  completingQuizId,
}: QuizListProps) => {
  if (quizzes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No quizzes assigned yet.
      </div>
    );
  }

  const getQuizAvailability = (quiz: Quiz) => {
    const now = new Date();
    const status = (quiz.status ?? "active").toLowerCase();
    let isOpen = status === "active" || status === "open" || status === "published";
    if (quiz.start_at) {
      const start = new Date(quiz.start_at);
      if (!Number.isNaN(start.getTime()) && now < start) {
        isOpen = false;
      }
    }
    if (quiz.end_at) {
      const end = new Date(quiz.end_at);
      if (!Number.isNaN(end.getTime()) && now > end) {
        isOpen = false;
      }
    }
    return { isOpen, label: isOpen ? "Open" : "Closed" };
  };

  return (
    <div className="space-y-4">
      {quizzes.map((quiz) => {
        const score = quizScores.find((entry) => entry.quiz_id === quiz.id);
        const scoreVisible = score?.score ?? null;
        const attempt = quizAttempts.find((entry) => entry.quiz_id === quiz.id);
        const isCompleted = Boolean(attempt?.submitted_at);
        const availability = getQuizAvailability(quiz);

        return (
          <div
            key={quiz.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Quiz</p>
                <h3 className="mt-2 font-display text-xl text-white">{quiz.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{quiz.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
                    {availability.label}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
                    {isCompleted ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">
                {quiz.total_questions ? `${quiz.total_questions} questions` : "Self paced"}
              </div>
            </div>
            <div className="mt-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <p className="text-slate-300">Quiz score</p>
                <p className="text-xl font-semibold text-white">
                  {scoreVisible !== null ? scoreVisible : "Pending"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {quiz.link_url && (
                <a
                  href={quiz.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
                >
                  Open quiz
                </a>
              )}
              <button
                type="button"
                onClick={() => onCompleteQuiz?.(quiz)}
                disabled={isCompleted || completingQuizId === quiz.id}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCompleted
                  ? "Completed"
                  : completingQuizId === quiz.id
                  ? "Updating..."
                  : "Mark completed"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuizList;
