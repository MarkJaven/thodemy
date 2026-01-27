import type { Form } from "../../types/dashboard";

type FormListProps = {
  forms: Form[];
};

const FormList = ({ forms }: FormListProps) => {
  if (forms.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No forms assigned yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {forms.map((form) => {
        const startAt = form.start_at ? new Date(form.start_at) : null;
        const endAt = form.end_at ? new Date(form.end_at) : null;
        const now = new Date();
        const isOpen =
          (!startAt || now >= startAt) && (!endAt || now <= endAt);
        const statusLabel = isOpen
          ? "Open"
          : startAt && now < startAt
          ? `Opens ${startAt.toLocaleString()}`
          : endAt
          ? `Closed ${endAt.toLocaleString()}`
          : "Closed";

        return (
          <div
            key={form.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Form</p>
              <h3 className="mt-2 font-display text-xl text-white">{form.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{form.description}</p>
              <p className="mt-2 text-xs text-slate-400">{statusLabel}</p>
            </div>
            <a
              href={form.link_url || "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition ${
                isOpen && form.link_url
                  ? "bg-white/10 hover:bg-white/20"
                  : "cursor-not-allowed bg-white/5 text-slate-400"
              }`}
              aria-disabled={!isOpen || !form.link_url}
              onClick={(event) => {
                if (!isOpen || !form.link_url) {
                  event.preventDefault();
                }
              }}
            >
              Open form
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default FormList;
