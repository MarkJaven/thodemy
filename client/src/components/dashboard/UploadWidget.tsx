import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Activity } from "../../types/dashboard";

type UploadWidgetProps = {
  activities: Activity[];
  onUpload: (payload: { title: string; file: File }) => Promise<void>;
  onDelete?: (activityId: string) => Promise<void>;
  isUploading?: boolean;
  deletingId?: string | null;
  error?: string | null;
  deleteError?: string | null;
};

const UploadWidget = ({
  activities,
  onUpload,
  onDelete,
  isUploading,
  deletingId,
  error,
  deleteError,
}: UploadWidgetProps) => {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!selectedFile) return "";
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) return;
    await onUpload({ title: title.trim() || selectedFile.name, file: selectedFile });
    setTitle("");
    setSelectedFile(null);
  };

  const isPdf = selectedFile?.type === "application/pdf";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-6"
      >
        <h3 className="font-display text-xl text-white">Upload activity</h3>
        <p className="mt-2 text-sm text-slate-300">
          Add images or PDFs to capture your learning artifacts.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Reflection or assignment title"
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
            File
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.2em] file:text-white"
            />
          </label>
          {selectedFile && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Preview</p>
              {isPdf ? (
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px]">
                    PDF
                  </span>
                  {selectedFile.name}
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="mt-3 h-40 w-full rounded-lg object-cover"
                />
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Submit activity"}
          </button>
          {error && <p className="text-xs text-rose-200">{error}</p>}
        </div>
      </form>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-white">Recent uploads</h3>
          <span className="text-xs text-slate-400">{activities.length} files</span>
        </div>
        <div className="mt-4 space-y-3">
          {deleteError && <p className="text-xs text-rose-200">{deleteError}</p>}
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400">No uploads yet.</p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <div>
                  <p className="text-white">{activity.title}</p>
                  <p className="text-xs text-slate-400">{activity.file_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {(activity.file_type || "").includes("pdf") ? "PDF" : "Image"}
                  </span>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(activity.id)}
                      disabled={deletingId === activity.id}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Delete ${activity.title}`}
                    >
                      {deletingId === activity.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadWidget;
