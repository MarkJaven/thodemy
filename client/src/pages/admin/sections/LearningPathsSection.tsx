import { useEffect, useMemo, useState } from "react";
import Modal from "../../../components/admin/Modal";
import ConfirmationModal from "../../../components/admin/ConfirmationModal";
import {
  adminLearningPathService,
  type LearningPathSummary,
  type LearningPathDetail,
} from "../../../services/adminLearningPathService";
import {
  adminCourseService,
  type CourseSummary,
} from "../../../services/adminCourseService";

const statusOptions = ["draft", "published", "archived"] as const;

type ConfirmDialogState = {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

const LearningPathsSection = () => {
  const [learningPaths, setLearningPaths] = useState<LearningPathSummary[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<LearningPathSummary | null>(
    null
  );
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "draft" as string,
    enrollment_enabled: true,
    enrollment_limit: "",
    start_at: "",
    course_ids: [] as string[],
  });

  // Detail modal state
  const [detail, setDetail] = useState<LearningPathDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState<
    string | null
  >(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const courseLookup = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses]
  );

  const selectedCourses = useMemo(
    () =>
      formState.course_ids
        .map((id) => courseLookup.get(id))
        .filter(Boolean) as CourseSummary[],
    [formState.course_ids, courseLookup]
  );

  const availableCourses = useMemo(
    () => courses.filter((c) => !formState.course_ids.includes(c.id)),
    [courses, formState.course_ids]
  );

  const filteredLearningPaths = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return learningPaths.filter((path) => {
      const status = path.status ?? "draft";
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack = `${path.title} ${path.description ?? ""} ${path.enrollment_code ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [learningPaths, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLearningPaths.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLearningPaths = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLearningPaths.slice(start, start + pageSize);
  }, [filteredLearningPaths, pageSize, safePage]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pathData, courseData] = await Promise.all([
        adminLearningPathService.listLearningPaths(),
        adminCourseService.listCourses(),
      ]);
      setLearningPaths(pathData);
      setCourses(courseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setSelectedPath(null);
    setFormState({
      title: "",
      description: "",
      status: "draft",
      enrollment_enabled: true,
      enrollment_limit: "",
      start_at: "",
      course_ids: [],
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (path: LearningPathSummary) => {
    setSelectedPath(path);
    setFormState({
      title: path.title,
      description: path.description ?? "",
      status: path.status ?? "draft",
      enrollment_enabled: path.enrollment_enabled ?? true,
      enrollment_limit: path.enrollment_limit
        ? String(path.enrollment_limit)
        : "",
      start_at: path.start_at ? path.start_at.slice(0, 10) : "",
      course_ids: path.course_ids ?? [],
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const hasFormChanges = useMemo(() => {
    if (!isFormOpen) return false;
    const baseline = selectedPath
      ? {
          title: selectedPath.title,
          description: selectedPath.description ?? "",
          status: selectedPath.status ?? "draft",
          enrollment_enabled: selectedPath.enrollment_enabled ?? true,
          enrollment_limit: selectedPath.enrollment_limit
            ? String(selectedPath.enrollment_limit)
            : "",
          start_at: selectedPath.start_at ? selectedPath.start_at.slice(0, 10) : "",
          course_ids: selectedPath.course_ids ?? [],
        }
      : {
          title: "",
          description: "",
          status: "draft",
          enrollment_enabled: true,
          enrollment_limit: "",
          start_at: "",
          course_ids: [],
        };
    return JSON.stringify(formState) !== JSON.stringify(baseline);
  }, [formState, isFormOpen, selectedPath]);

  const requestCloseForm = () => {
    if (saving) return;
    if (!hasFormChanges) {
      setIsFormOpen(false);
      return;
    }
    setConfirmDialog({
      title: "Discard learning path changes?",
      description:
        "You have unsaved learning path changes. Leaving now will discard them.",
      confirmLabel: "Discard",
      variant: "danger",
      onConfirm: () => {
        setIsFormOpen(false);
        setActionError(null);
      },
    });
  };

  const handleAddCourse = (courseId: string) => {
    if (formState.course_ids.includes(courseId)) return;
    setFormState((prev) => ({
      ...prev,
      course_ids: [...prev.course_ids, courseId],
    }));
  };

  const handleRemoveCourse = (courseId: string) => {
    setFormState((prev) => ({
      ...prev,
      course_ids: prev.course_ids.filter((id) => id !== courseId),
    }));
  };

  const handleSave = async () => {
    if (!formState.title.trim()) {
      setActionError("Learning path title is required.");
      return;
    }
    if (!formState.description.trim()) {
      setActionError("Learning path description is required.");
      return;
    }
    if (formState.course_ids.length === 0) {
      setActionError("Select at least one course.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      enrollment_enabled: formState.enrollment_enabled,
      enrollment_limit: formState.enrollment_limit
        ? Number(formState.enrollment_limit)
        : null,
      start_at: formState.start_at
        ? new Date(formState.start_at).toISOString()
        : null,
      course_ids: formState.course_ids,
    };

    try {
      if (selectedPath) {
        await adminLearningPathService.updateLearningPath(
          selectedPath.id,
          payload
        );
      } else {
        await adminLearningPathService.createLearningPath(payload);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save learning path."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (path: LearningPathSummary) => {
    const nextStatus = path.status === "archived" ? "draft" : "archived";
    setConfirmDialog({
      title: `${nextStatus === "archived" ? "Deactivate" : "Activate"} learning path?`,
      description: `${nextStatus === "archived" ? "Deactivate" : "Activate"} "${path.title}"?`,
      confirmLabel: nextStatus === "archived" ? "Deactivate" : "Activate",
      variant: "danger",
      onConfirm: async () => {
        setActionError(null);
        try {
          await adminLearningPathService.updateLearningPath(path.id, { status: nextStatus });
          await loadData();
        } catch (toggleError) {
          setActionError(
            toggleError instanceof Error
              ? toggleError.message
              : "Unable to update learning path status."
          );
        }
      },
    });
  };

  const handleViewDetail = async (path: LearningPathSummary) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    setDetail(null);
    try {
      const response = await adminLearningPathService.getLearningPathDetail(
        path.id
      );
      setDetail(response);
    } catch (detailError) {
      setActionError(
        detailError instanceof Error
          ? detailError.message
          : "Unable to load learning path details."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateEnrollment = async (
    enrollmentId: string,
    status: string
  ) => {
    setActionError(null);
    setRemovingEnrollmentId(enrollmentId);
    try {
      await adminLearningPathService.updateLPEnrollmentStatus(
        enrollmentId,
        status
      );
      if (detail) {
        const updatedEnrollments = detail.enrollments.map((entry) =>
          entry.id === enrollmentId ? { ...entry, status } : entry
        );
        setDetail({ ...detail, enrollments: updatedEnrollments });
      }
      await loadData();
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update enrollment."
      );
    } finally {
      setRemovingEnrollmentId(null);
    }
  };

  const handleKickEnrollment = async (enrollmentId: string) => {
    setConfirmDialog({
      title: "Remove learner?",
      description: "Remove this student from the learning path?",
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: async () => {
        setActionError(null);
        setRemovingEnrollmentId(enrollmentId);
        try {
          await adminLearningPathService.updateLPEnrollmentStatus(
            enrollmentId,
            "removed"
          );
          if (detail) {
            const updatedEnrollments = detail.enrollments.map((entry) =>
              entry.id === enrollmentId
                ? { ...entry, status: "removed" }
                : entry
            );
            setDetail({ ...detail, enrollments: updatedEnrollments });
          }
          await loadData();
        } catch (removeError) {
          setActionError(
            removeError instanceof Error
              ? removeError.message
              : "Unable to remove enrollment."
          );
        } finally {
          setRemovingEnrollmentId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white">Learning Paths</h2>
          <p className="mt-2 text-sm text-slate-300">
            Combine courses into structured learning paths for learners.
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
          New Learning Path
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search learning paths, codes, descriptions..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | "draft" | "published" | "archived")
          }
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={String(pageSize)}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="6">6 per page</option>
          <option value="9">9 per page</option>
          <option value="12">12 per page</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`lp-skeleton-${index}`}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : filteredLearningPaths.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
          No learning paths match your filters.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedLearningPaths.map((path) => {
              const status = path.status ?? "draft";
              const statusConfig: Record<string, string> = {
                draft: "border-white/10 bg-white/5 text-slate-300",
                published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                archived: "border-amber-500/30 bg-amber-500/10 text-amber-300",
              };

              return (
                <div
                  key={path.id}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{path.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {path.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        statusConfig[status] || statusConfig.draft
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="grid gap-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Code</span>
                      <span className="font-mono text-[11px] text-slate-200">
                        {path.enrollment_code || "--"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Courses</span>
                      <span>{path.course_ids?.length ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Hours / Days</span>
                      <span>
                        {path.total_hours ?? 0}h / {path.total_days ?? 0}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Enrolled</span>
                      <span>{path.enrollment_count ?? 0}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(path)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(path)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveToggle(path)}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20"
                    >
                      {path.status === "archived" ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Showing {paginatedLearningPaths.length} of {filteredLearningPaths.length} learning paths
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-slate-300">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage >= totalPages}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        title={selectedPath ? "Edit Learning Path" : "Create New Learning Path"}
        description="Build a structured learning path by combining courses and configuring enrollment settings."
        onClose={requestCloseForm}
        size="full"
        topAligned
        footer={
          <>
            <button
              type="button"
              onClick={requestCloseForm}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save Learning Path"
              )}
            </button>
          </>
        }
      >
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          {/* Main Content - Left Side */}
          <div className="space-y-6">
            {/* Learning Path Details Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-white">
                  Learning Path Details
                </h4>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="e.g., Full-Stack Developer Path"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={formState.description}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of what learners will achieve..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Settings Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Status
                </label>
                <select
                  value={formState.status}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-indigo-500/50 focus:outline-none"
                >
                  {statusOptions.map((status) => (
                    <option
                      key={status}
                      value={status}
                      className="bg-[#1c1436]"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Enrollment
                </label>
                <select
                  value={
                    formState.enrollment_enabled ? "enabled" : "disabled"
                  }
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      enrollment_enabled: e.target.value === "enabled",
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-indigo-500/50 focus:outline-none"
                >
                  <option value="enabled" className="bg-[#1c1436]">
                    Open
                  </option>
                  <option value="disabled" className="bg-[#1c1436]">
                    Closed
                  </option>
                </select>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Max Seats
                </label>
                <input
                  type="number"
                  min={1}
                  value={formState.enrollment_limit}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      enrollment_limit: e.target.value,
                    }))
                  }
                  placeholder="Unlimited"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formState.start_at}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      start_at: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-indigo-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Course Picker Section */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      Courses
                    </h4>
                    <p className="text-xs text-slate-400">
                      {selectedCourses.length} selected
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Course Dropdown */}
              <div className="mb-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Add a Course
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleAddCourse(e.target.value);
                  }}
                  disabled={availableCourses.length === 0}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" className="bg-[#1c1436]">
                    {availableCourses.length > 0
                      ? "-- Select a course to add --"
                      : "No available courses"}
                  </option>
                  {availableCourses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                      className="bg-[#1c1436]"
                    >
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Courses List */}
              <div className="min-h-[120px] rounded-xl border border-dashed border-white/10 bg-black/20 p-3">
                {selectedCourses.length === 0 ? (
                  <div className="flex h-[96px] items-center justify-center text-sm text-slate-500">
                    Select courses from above to build your learning path
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {selectedCourses.map((course, index) => (
                      <div
                        key={course.id}
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent px-3 py-2.5 transition hover:border-indigo-500/30 hover:from-indigo-500/5"
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {course.title}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {course.topic_ids?.length ?? 0} topics
                            {" \u00B7 "}
                            {course.topic_groups?.length ?? 0} grouped
                            {" \u00B7 "}
                            {course.total_hours ?? 0}h
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(course.id)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 opacity-0 transition hover:bg-rose-500/20 hover:text-rose-300 group-hover:opacity-100"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {courses.length === 0 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  No courses available. Create courses first.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-4">
            <div className="sticky top-0 rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/5 to-transparent p-5">
              <h4 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Path Summary
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-2xl font-semibold text-white">
                      {selectedCourses.reduce(
                        (sum, c) => sum + (c.total_hours ?? 0),
                        0
                      )}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      Total Hours
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-2xl font-semibold text-white">
                      {selectedCourses.reduce(
                        (sum, c) => sum + (c.total_days ?? 0),
                        0
                      )}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      Total Days
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Courses</span>
                    <span className="font-medium text-white">
                      {selectedCourses.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Status</span>
                    <span className="font-medium capitalize text-white">
                      {formState.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Enrollment</span>
                    <span className="font-medium text-white">
                      {formState.enrollment_enabled ? "Open" : "Closed"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detail / Tracking Modal */}
      <Modal
        isOpen={isDetailOpen}
        title="Learning Path Tracking"
        description="Monitor enrollments and learner progress across all courses."
        onClose={() => setIsDetailOpen(false)}
        size="lg"
        topAligned
        footer={
          <button
            type="button"
            onClick={() => setIsDetailOpen(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        }
      >
        {detailLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Loading learning path details...
          </div>
        )}
        {!detailLoading && detail && (
          <div className="space-y-4">
            {/* Header Stats */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                    Enrollment code
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">
                    {detail.learningPath.enrollment_code ?? "--"}
                  </h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  {detail.learningPath.status ?? "draft"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Hours
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {detail.learningPath.total_hours ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Days
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {detail.learningPath.total_days ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Enrollments
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {detail.enrollments.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrollments List */}
            {detail.enrollments.length === 0 ? (
              <p className="text-sm text-slate-400">No enrolled users yet.</p>
            ) : (
              detail.enrollments.map((enrollment) => {
                const progressForUser = new Map(
                  detail.topicProgress
                    .filter((entry) => entry.user_id === enrollment.user_id)
                    .map((entry) => [entry.topic_id, entry])
                );

                const displayName =
                  enrollment.user?.email ||
                  enrollment.user?.username ||
                  enrollment.user_id;
                const enrollmentStatus = enrollment.status ?? "pending";
                const isPending = enrollmentStatus === "pending";
                const isRejected = enrollmentStatus === "rejected";
                const isRemoved = enrollmentStatus === "removed";

                return (
                  <div
                    key={`enrollment-${enrollment.id}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-white">{displayName}</p>
                        <p className="text-xs text-slate-400">
                          Status: {enrollmentStatus}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateEnrollment(
                                  enrollment.id,
                                  "approved"
                                )
                              }
                              disabled={
                                removingEnrollmentId === enrollment.id
                              }
                              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200 disabled:opacity-50"
                            >
                              {removingEnrollmentId === enrollment.id
                                ? "Updating..."
                                : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateEnrollment(
                                  enrollment.id,
                                  "rejected"
                                )
                              }
                              disabled={
                                removingEnrollmentId === enrollment.id
                              }
                              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 disabled:opacity-50"
                            >
                              {removingEnrollmentId === enrollment.id
                                ? "Updating..."
                                : "Reject"}
                            </button>
                          </>
                        )}
                        {!isPending && !isRejected && (
                          <button
                            type="button"
                            onClick={() =>
                              handleKickEnrollment(enrollment.id)
                            }
                            disabled={
                              removingEnrollmentId === enrollment.id ||
                              isRemoved
                            }
                            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 disabled:opacity-50"
                          >
                            {isRemoved
                              ? "Removed"
                              : removingEnrollmentId === enrollment.id
                              ? "Removing..."
                              : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Per-enrollment: courses with topic progress */}
                    <div className="mt-3 space-y-3">
                      {detail.courses.map((course) => {
                        const courseTopicIds = course.topic_ids ?? [];
                        const groupedTopicNameById = new Map<string, string>();
                        (course.topic_groups ?? []).forEach((group) => {
                          group.topic_ids.forEach((topicId) => {
                            groupedTopicNameById.set(topicId, group.name);
                          });
                        });
                        const courseTopics = courseTopicIds
                          .map((tid) =>
                            detail.topics.find((t) => t.id === tid)
                          )
                          .filter(Boolean) as typeof detail.topics;

                        const completedCount = courseTopics.filter(
                          (topic) =>
                            progressForUser.get(topic.id)?.status ===
                            "completed"
                        ).length;
                        const courseCompletion =
                          courseTopics.length > 0
                            ? Math.round(
                                (completedCount / courseTopics.length) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={`course-progress-${enrollment.id}-${course.id}`}
                            className="rounded-xl border border-white/5 bg-black/20 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium text-white">
                                {course.title}
                              </p>
                              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                {courseCompletion}% complete
                              </span>
                            </div>
                            <div className="grid gap-1.5 md:grid-cols-2">
                              {courseTopics.map((topic) => {
                                const progress = progressForUser.get(
                                  topic.id
                                );
                                const topicStatus = progress?.status
                                  ? progress.status === "completed"
                                    ? "Completed"
                                    : "In Progress"
                                  : "Not Started";
                                const groupName = groupedTopicNameById.get(topic.id);
                                return (
                                  <div
                                    key={`tp-${enrollment.id}-${course.id}-${topic.id}`}
                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-slate-300"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{topic.title}</span>
                                      {groupName ? (
                                        <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-amber-200">
                                          {groupName}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                      {topicStatus}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? "Confirm action"}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
        variant={confirmDialog?.variant ?? "default"}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          if (action) await action();
        }}
      />
    </div>
  );
};

export default LearningPathsSection;
