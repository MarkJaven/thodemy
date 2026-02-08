import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Activity } from "../../types/dashboard";

type UploadWidgetProps = {
  activities: Activity[];
  assignedProjects?: Activity[];
  showForm?: boolean;
  onUpload: (payload: {
    title: string;
    file?: File | null;
    activityId?: string | null;
    description?: string | null;
    githubUrl?: string | null;
  }) => Promise<void>;
  onDelete?: (activityId: string) => Promise<void>;
  isUploading?: boolean;
  deletingId?: string | null;
  error?: string | null;
  deleteError?: string | null;
};

const statusColor = (status?: string | null) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "approved":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    case "in_progress":
    case "pending":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "resubmit":
      return "border-orange-400/30 bg-orange-400/10 text-orange-300";
    case "rejected":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-slate-400";
  }
};

const UploadWidget = ({
  activities,
  assignedProjects,
  showForm = true,
  onUpload,
  onDelete,
  isUploading,
  deletingId,
  error,
  deleteError,
}: UploadWidgetProps) => {
  const normalizeUrl = (value: string) =>
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const selectedProject = useMemo(
    () => assignedProjects?.find((project) => project.id === selectedProjectId) ?? null,
    [assignedProjects, selectedProjectId]
  );

  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (selectedProject) setTitle(selectedProject.title);
  }, [selectedProject]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setGithubUrl("");
    setSelectedFile(null);
    setSelectedProjectId("");
  };

  const openModal = (projectId?: string) => {
    resetForm();
    if (projectId) {
      setSelectedProjectId(projectId);
      const project = assignedProjects?.find((p) => p.id === projectId);
      if (project) setTitle(project.title);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isUploading) {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;
    if (!selectedFile && !githubUrl.trim() && !description.trim()) return;
    try {
      await onUpload({
        title: title.trim() || selectedFile?.name || "Project submission",
        file: selectedFile ?? null,
        activityId: selectedProjectId || null,
        description: description.trim() || null,
        githubUrl: githubUrl.trim() || null,
      });
      setIsModalOpen(false);
      resetForm();
    } catch {
      // Modal stays open so user can see the error and retry
    }
  };

  const isPdf = selectedFile?.type === "application/pdf";

  const getSubmissionForProject = (projectId: string) =>
    activities.find((a) => a.activity_id === projectId);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Assigned Projects */}
      {showForm && assignedProjects && assignedProjects.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-white">Assigned projects</h3>
              <p className="mt-1 text-sm text-slate-400">
                Submit your work for each assigned project.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {assignedProjects.map((project) => {
              const submission = getSubmissionForProject(project.id);
              const hasSubmitted = Boolean(submission);
              const submissionStatus = submission?.status?.toLowerCase();
              const isCompleted = submissionStatus === "completed" || submissionStatus === "approved";
              const isRejected = submissionStatus === "rejected";
              const needsResubmit = submissionStatus === "resubmit";
              const canResubmit = hasSubmitted && !isCompleted;
              return (
                <div
                  key={project.id}
                  className={`rounded-xl border px-5 py-4 ${
                    isCompleted
                      ? "border-emerald-400/20 bg-emerald-400/5"
                      : isRejected
                        ? "border-rose-400/20 bg-rose-400/5"
                        : needsResubmit
                          ? "border-amber-400/20 bg-amber-400/5"
                          : "border-white/10 bg-ink-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-white">{project.title}</p>
                        {hasSubmitted && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] ${statusColor(submission?.status)}`}
                          >
                            {submission?.status ?? "submitted"}
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="mt-1.5 text-xs text-slate-400">{project.description}</p>
                      )}
                      {hasSubmitted && (
                        <div className="mt-2.5 flex items-center gap-3">
                          {submission?.score !== null && submission?.score !== undefined && (
                            <span className="text-sm font-semibold text-white">
                              Score: <span className="text-base text-emerald-300">{submission.score}</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            {formatDate(submission?.created_at)}
                          </span>
                        </div>
                      )}
                    </div>
                    {isCompleted ? (
                      <span className="ml-4 shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">
                        Completed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openModal(project.id)}
                        className={`ml-4 shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                          canResubmit
                            ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                            : "bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] text-white shadow-[0_6px_20px_rgba(94,59,219,0.35)] hover:opacity-90"
                        }`}
                      >
                        {canResubmit ? "Resubmit" : "Submit"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-white">Recent uploads</h3>
            <p className="mt-1 text-sm text-slate-400">
              {activities.length > 0
                ? `${activities.length} upload${activities.length === 1 ? "" : "s"}`
                : "No uploads yet."}
            </p>
          </div>
        </div>
        {deleteError && (
          <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
            {deleteError}
          </p>
        )}
        <div className="mt-5 space-y-3">
          {activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">
                Your uploads will appear here.
              </p>
            </div>
          ) : (
            activities.map((activity) => {
              const feedbackStatus = activity.status?.toLowerCase();
              const isApproved = feedbackStatus === "completed" || feedbackStatus === "approved";
              const isRejected = feedbackStatus === "rejected";
              const needsResubmit = feedbackStatus === "resubmit";
              const hasFeedback = isApproved || isRejected || needsResubmit;
              const feedbackLabel = isApproved
                ? "Approved"
                : isRejected
                  ? "Rejected"
                  : needsResubmit
                    ? "Resubmit"
                    : activity.status ?? "pending";

              return (
                <div
                  key={activity.id}
                  className={`rounded-xl border px-5 py-4 ${
                    isApproved
                      ? "border-emerald-400/20 bg-emerald-400/5"
                      : isRejected
                        ? "border-rose-400/20 bg-rose-400/5"
                        : needsResubmit
                          ? "border-amber-400/20 bg-amber-400/5"
                          : "border-white/10 bg-ink-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{activity.title}</p>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusColor(activity.status)}`}
                        >
                          {feedbackLabel}
                        </span>
                        {activity.score !== null && activity.score !== undefined && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                            Score: {activity.score}
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                          {activity.description}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        {activity.file_name && (
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
                            {(activity.file_type || "").includes("pdf") ? "PDF" : "Image"}:{" "}
                            {activity.file_name}
                          </span>
                        )}
                        {activity.github_url && (
                          <a
                            href={normalizeUrl(activity.github_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-accent-purple hover:underline"
                          >
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-purple" />
                            GitHub
                          </a>
                        )}
                        {activity.created_at && (
                          <span className="text-[11px] text-slate-500">
                            {formatDate(activity.created_at)}
                          </span>
                        )}
                      </div>
                      {/* Admin feedback section */}
                      {hasFeedback && activity.review_notes && (
                        <div className={`mt-3 rounded-lg border px-3 py-2 ${
                          isApproved
                            ? "border-emerald-400/10 bg-emerald-400/5"
                            : isRejected
                              ? "border-rose-400/10 bg-rose-400/5"
                              : "border-amber-400/10 bg-amber-400/5"
                        }`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${
                            isApproved
                              ? "text-emerald-400"
                              : isRejected
                                ? "text-rose-400"
                                : "text-amber-400"
                          }`}>
                            Admin feedback
                          </p>
                          <p className="mt-1 text-xs text-slate-300">{activity.review_notes}</p>
                        </div>
                      )}
                      {!hasFeedback && activity.review_notes && (
                        <div className="mt-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                            Admin feedback
                          </p>
                          <p className="mt-1 text-xs text-slate-300">{activity.review_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {needsResubmit && (
                        <button
                          type="button"
                          onClick={() => openModal(activity.activity_id ?? undefined)}
                          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_4px_14px_rgba(94,59,219,0.3)] transition hover:opacity-90"
                        >
                          Resubmit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(activity.id)}
                          disabled={deletingId === activity.id}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === activity.id ? "..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
            onKeyDown={(e) => e.key === "Escape" && closeModal()}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Details
                </p>
                <h3 className="mt-1 font-display text-xl text-white">
                  {selectedProject ? `Submit: ${selectedProject.title}` : "New submission"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {assignedProjects && assignedProjects.length > 0 && !selectedProjectId && (
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                  Assigned project
                  <select
                    value={selectedProjectId}
                    onChange={(event) => {
                      setSelectedProjectId(event.target.value);
                      const p = assignedProjects.find((proj) => proj.id === event.target.value);
                      if (p) setTitle(p.title);
                    }}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-0"
                  >
                    <option value="">Select project (optional)</option>
                    {assignedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Reflection or assignment title"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                GitHub link
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(event) => setGithubUrl(event.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Description
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Share what you built or learned"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                File (optional)
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.15em] file:text-white"
                />
              </label>
              {selectedFile && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Preview
                  </p>
                  {isPdf ? (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                      <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] uppercase">
                        PDF
                      </span>
                      {selectedFile.name}
                    </div>
                  ) : (
                    <img
                      src={previewUrl}
                      alt={selectedFile.name}
                      className="mt-2 h-32 w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              )}
              {error && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs text-rose-300">
                  {error}
                </p>
              )}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isUploading}
                  className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !title.trim() ||
                    (!selectedFile && !githubUrl.trim() && !description.trim()) ||
                    isUploading
                  }
                  className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-[0_6px_20px_rgba(94,59,219,0.35)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadWidget;
