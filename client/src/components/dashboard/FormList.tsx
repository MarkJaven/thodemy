import { useState } from "react";
import { apiClient } from "../../lib/apiClient";
import type { Form } from "../../types/dashboard";

type FormListProps = {
  forms: Form[];
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

const getFormAvailability = (form: Form) => {
  const now = new Date();
  const start = form.start_at ? new Date(form.start_at) : null;
  const end = form.end_at ? new Date(form.end_at) : null;

  let isOpen = true;
  if (start && now < start) isOpen = false;
  if (end && now > end) isOpen = false;

  let label = isOpen ? "Open" : "Closed";
  if (start && now < start) {
    label = `Opens ${formatDateTime(start)}`;
  } else if (end && now > end) {
    label = `Closed ${formatDateTime(end)}`;
  } else if (end) {
    label = `Closes ${formatDateTime(end)}`;
  }

  const windowLabel =
    start || end
      ? `${start ? formatDateTime(start) : "Anytime"}${end ? ` - ${formatDateTime(end)}` : ""}`
      : "Anytime";

  const badgeClass = isOpen ? "badge-success" : "badge-warning";

  return { isOpen, label, windowLabel, badgeClass };
};

const FormList = ({ forms }: FormListProps) => {
  const [openingFormId, setOpeningFormId] = useState<string | null>(null);

  if (forms.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        No forms assigned yet.
      </div>
    );
  }

  const handleOpenForm = async (formId: string) => {
    setOpeningFormId(formId);
    try {
      const { data } = await apiClient.post(`/api/forms/${formId}/open`);
      const url = data?.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message || "Unable to open form. Please try again.";
      alert(message);
    } finally {
      setOpeningFormId(null);
    }
  };

  return (
    <div className="space-y-4">
      {forms.map((form) => {
        const availability = getFormAvailability(form);
        const isSubmitted = Boolean(form.submitted_at);
        const isClosed = !availability.isOpen;
        const isMissed = isClosed && !isSubmitted;
        const hasLink = form.has_link ?? Boolean(form.link_url);
        const canOpen = availability.isOpen && hasLink && !isSubmitted;

        const statusLabel = isSubmitted
          ? "Submitted"
          : isMissed
            ? "Missed"
            : "Pending";
        const statusBadge = isSubmitted
          ? "badge-success"
          : isMissed
            ? "badge-error"
            : "badge-default";

        const statusNote = isSubmitted
          ? `Submitted ${formatDateTime(form.submitted_at)}`
          : isMissed
            ? "This form was not submitted before the deadline."
            : "Complete and submit before the deadline.";

        return (
          <div key={form.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Form</p>
                <h3 className="mt-1 font-display text-base text-white">{form.title}</h3>
                {form.description && (
                  <p className="mt-2 text-sm text-slate-300">{form.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className={availability.badgeClass}>{availability.label}</span>
                  <span className={statusBadge}>{statusLabel}</span>
                  <span className="badge-default">{availability.windowLabel}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-slate-300">
                <span className="text-xs text-slate-400">{statusNote}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {canOpen ? (
                <button
                  type="button"
                  onClick={() => handleOpenForm(form.id)}
                  disabled={openingFormId === form.id}
                  className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-center text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  {openingFormId === form.id ? "Opening..." : "Open form"}
                </button>
              ) : (
                <span
                  className="rounded-full border border-white/5 bg-white/[0.02] px-5 py-2 text-center text-xs uppercase tracking-[0.25em] text-slate-600 cursor-not-allowed select-none"
                  aria-disabled
                >
                  {isSubmitted ? "Already submitted" : "Open form"}
                </span>
              )}
              {isClosed && !isSubmitted && (
                <p className="text-xs text-rose-400/70">This form is currently closed.</p>
              )}
              {!hasLink && availability.isOpen && (
                <p className="text-xs text-slate-500">Form link unavailable. Contact your admin.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FormList;
