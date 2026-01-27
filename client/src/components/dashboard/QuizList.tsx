import type { Quiz, QuizScore } from "../../types/dashboard";

type QuizListProps = {
  quizzes: Quiz[];
  quizScores: QuizScore[];
};

const QuizList = ({ quizzes, quizScores }: QuizListProps) => {
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
        const score = quizScores.find((entry) => entry.quiz_id === quiz.id);
        const scoreVisible = score?.score ?? null;

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
          </div>
        );
      })}
    </div>
  );
};

export default QuizList;
