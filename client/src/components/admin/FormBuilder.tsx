import type { QuestionDraft } from "../../types/superAdmin";

type FormBuilderProps = {
  mode: "quiz" | "form";
  questions: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
};

const FormBuilder = ({ mode, questions, onChange }: FormBuilderProps) => {
  const handleAdd = () => {
    onChange([
      ...questions,
      {
        id: `q-${Date.now()}`,
        prompt: "",
        options: [""],
        correctAnswer: "",
      },
    ]);
  };

  const handleUpdate = (id: string, updates: Partial<QuestionDraft>) => {
    onChange(questions.map((question) => (question.id === id ? { ...question, ...updates } : question)));
  };

  const handleRemove = (id: string) => {
    onChange(questions.filter((question) => question.id !== id));
  };

  const handleOptionChange = (questionId: string, index: number, value: string) => {
    const target = questions.find((question) => question.id === questionId);
    if (!target) return;
    const nextOptions = [...target.options];
    nextOptions[index] = value;
    handleUpdate(questionId, { options: nextOptions });
  };

  const handleAddOption = (questionId: string) => {
    const target = questions.find((question) => question.id === questionId);
    if (!target) return;
    handleUpdate(questionId, { options: [...target.options, ""] });
  };

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <div key={question.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Question {index + 1}
            </p>
            <button
              type="button"
              onClick={() => handleRemove(question.id)}
              className="text-xs uppercase tracking-[0.2em] text-rose-200"
            >
              Remove
            </button>
          </div>
          <label className="mt-3 block text-xs uppercase tracking-[0.25em] text-slate-400">
            Prompt
            <input
              type="text"
              value={question.prompt}
              onChange={(event) => handleUpdate(question.id, { prompt: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Options</p>
            {question.options.map((option, optionIndex) => (
              <input
                key={`${question.id}-opt-${optionIndex}`}
                type="text"
                value={option}
                onChange={(event) => handleOptionChange(question.id, optionIndex, event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                placeholder={`Option ${optionIndex + 1}`}
              />
            ))}
            <button
              type="button"
              onClick={() => handleAddOption(question.id)}
              className="text-xs uppercase tracking-[0.2em] text-slate-300"
            >
              + Add option
            </button>
          </div>
          {mode === "quiz" && (
            <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-slate-400">
              Correct answer
              <input
                type="text"
                value={question.correctAnswer ?? ""}
                onChange={(event) => handleUpdate(question.id, { correctAnswer: event.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              />
            </label>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
      >
        Add question
      </button>
    </div>
  );
};

export default FormBuilder;
