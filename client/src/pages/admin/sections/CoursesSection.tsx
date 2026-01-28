import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { adminCourseService, CourseDetail, CourseSummary } from "../../../services/adminCourseService";
import { superAdminService } from "../../../services/superAdminService";
import type { Topic } from "../../../types/superAdmin";
import LearningPathsSection from "./LearningPathsSection";

const statusOptions = ["draft", "published", "archived"] as const;

const buildTotals = (topics: Topic[]) => {
  const totalHours = topics.reduce((sum, topic) => {
    const hours = Number(topic.time_allocated ?? 0);
    if (topic.time_unit === "days") {
      return sum + hours * 8;
    }
    return sum + hours;
  }, 0);
  const totalDays = totalHours > 0 ? Math.ceil(totalHours / 8) : 0;
  return { totalHours, totalDays };
};

const normalizeRelationMap = (value?: Record<string, string[]> | null) => {
  if (!value) return {};
  return Object.entries(value).reduce<Record<string, string[]>>((acc, [key, list]) => {
    acc[key] = Array.isArray(list) ? Array.from(new Set(list)) : [];
    return acc;
  }, {});
};

const CoursesSection = () => {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "draft",
    topic_ids: [] as string[],
    topic_prerequisites: {} as Record<string, string[]>,
    topic_corequisites: {} as Record<string, string[]>,
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const topicLookup = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics]);

  const selectedTopics = useMemo(
    () =>
      formState.topic_ids
        .map((id) => topicLookup.get(id))
        .filter(Boolean) as Topic[],
    [formState.topic_ids, topicLookup]
  );

  const totals = useMemo(() => buildTotals(selectedTopics), [selectedTopics]);
  const orderedDetailTopics = useMemo(() => {
    if (!detail) return [];
    const ordered =
      detail.course.topic_ids?.map((id) => detail.topics.find((topic) => topic.id === id)) ??
      detail.topics;
    return ordered.filter(Boolean) as Topic[];
  }, [detail]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseData, topicData] = await Promise.all([
        adminCourseService.listCourses(),
        superAdminService.listTopics(),
      ]);
      setCourses(courseData);
      setTopics(topicData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedCourse(null);
    setFormState({
      title: "",
      description: "",
      status: "draft",
      topic_ids: [],
      topic_prerequisites: {},
      topic_corequisites: {},
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (course: CourseSummary) => {
    setSelectedCourse(course);
    setFormState({
      title: course.title,
      description: course.description ?? "",
      status: course.status ?? "draft",
      topic_ids: course.topic_ids ?? [],
      topic_prerequisites: normalizeRelationMap(course.topic_prerequisites),
      topic_corequisites: normalizeRelationMap(course.topic_corequisites),
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const updateTopicIds = (nextIds: string[]) => {
    setFormState((prev) => {
      const keep = new Set(nextIds);
      const prune = (map: Record<string, string[]>) =>
        Object.entries(map).reduce<Record<string, string[]>>((acc, [key, list]) => {
          if (!keep.has(key)) return acc;
          acc[key] = list.filter((id) => keep.has(id));
          return acc;
        }, {});
      return {
        ...prev,
        topic_ids: nextIds,
        topic_prerequisites: prune(prev.topic_prerequisites),
        topic_corequisites: prune(prev.topic_corequisites),
      };
    });
  };

  const handleAddTopic = (topicId: string) => {
    if (formState.topic_ids.includes(topicId)) return;
    updateTopicIds([...formState.topic_ids, topicId]);
  };

  const handleRemoveTopic = (topicId: string) => {
    updateTopicIds(formState.topic_ids.filter((id) => id !== topicId));
  };

  const handleDragStart = (topicId: string) => {
    setDraggingId(topicId);
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const next = [...formState.topic_ids];
    const from = next.indexOf(draggingId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    updateTopicIds(next);
    setDraggingId(null);
  };

  const handleRelationChange = (
    topicId: string,
    type: "pre" | "co",
    values: string[]
  ) => {
    setFormState((prev) => ({
      ...prev,
      topic_prerequisites:
        type === "pre" ? { ...prev.topic_prerequisites, [topicId]: values } : prev.topic_prerequisites,
      topic_corequisites:
        type === "co" ? { ...prev.topic_corequisites, [topicId]: values } : prev.topic_corequisites,
    }));
  };

  const handleSave = async () => {
    if (!formState.title.trim()) {
      setActionError("Course title is required.");
      return;
    }
    if (!formState.description.trim()) {
      setActionError("Course description is required.");
      return;
    }
    if (formState.topic_ids.length === 0) {
      setActionError("Select at least one topic.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      topic_ids: formState.topic_ids,
      topic_prerequisites: formState.topic_prerequisites,
      topic_corequisites: formState.topic_corequisites,
    };

    try {
      if (selectedCourse) {
        await adminCourseService.updateCourse(selectedCourse.id, payload);
      } else {
        await adminCourseService.createCourse(payload);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (courseId: string) => {
    const confirmed = window.confirm("Delete this course? This cannot be undone.");
    if (!confirmed) return;
    setActionError(null);
    try {
      await adminCourseService.deleteCourse(courseId);
      await loadData();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete course.");
    }
  };

  const openDetail = async (course: CourseSummary) => {
    setDetailLoading(true);
    setIsDetailOpen(true);
    setDetail(null);
    try {
      const response = await adminCourseService.getCourseDetail(course.id);
      setDetail(response);
    } catch (detailError) {
      setActionError(detailError instanceof Error ? detailError.message : "Unable to load course.");
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "course",
        header: "Course",
        render: (course: CourseSummary) => (
          <div>
            <p className="font-semibold text-white">{course.title}</p>
            <p className="text-xs text-slate-400">{course.description}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (course: CourseSummary) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {course.status ?? "draft"}
          </span>
        ),
      },
      {
        key: "hours",
        header: "Total Hours",
        render: (course: CourseSummary) => (
          <span className="text-xs text-slate-300">{course.total_hours ?? "--"}</span>
        ),
      },
      {
        key: "days",
        header: "Total Days",
        render: (course: CourseSummary) => (
          <span className="text-xs text-slate-300">{course.total_days ?? "--"}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (course: CourseSummary) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openDetail(course)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => openEdit(course)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(course.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [topics]
  );

  return (
    <div className="space-y-10">
      <LearningPathsSection />
      <div className="h-px w-full bg-white/10" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-white">Courses</h2>
            <p className="mt-2 text-sm text-slate-300">
              Build courses and topics that roll up into learning paths.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white transition hover:bg-white/20"
            aria-label="Create course"
          >
            +
          </button>
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
                key={`course-skeleton-${index}`}
                className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={courses} emptyMessage="No courses yet." />
        )}

        <Modal
          isOpen={isFormOpen}
          title={selectedCourse ? "Edit Course" : "Create New Course"}
          description="Design your course by adding topics and estimating duration."
          onClose={() => (saving ? null : setIsFormOpen(false))}
          size="full"
          topAligned
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 disabled:opacity-60"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Save Course"
                )}
              </button>
            </>
          }
        >
        <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
          {/* Main Content - Left Side */}
          <div className="space-y-6">
            {/* Course Details Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-white">Course Details</h4>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Advanced Web Development"
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
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what learners will achieve..."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Settings Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Status
                </label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-indigo-500/50 focus:outline-none"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status} className="bg-[#1c1436]">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topics Section */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Course Topics</h4>
                    <p className="text-xs text-slate-400">Drag to reorder • {selectedTopics.length} selected</p>
                  </div>
                </div>
              </div>

              {/* Selected Topics */}
              <div className="mb-4 min-h-[120px] rounded-xl border border-dashed border-white/10 bg-black/20 p-3">
                {selectedTopics.length === 0 ? (
                  <div className="flex h-[96px] items-center justify-center text-sm text-slate-500">
                    Select topics from below to build your course
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedTopics.map((topic, index) => (
                      <div
                        key={topic.id}
                        draggable
                        onDragStart={() => handleDragStart(topic.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(topic.id)}
                        className="group flex cursor-grab items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent px-3 py-2.5 transition hover:border-indigo-500/30 hover:from-indigo-500/5 active:cursor-grabbing"
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{topic.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {topic.time_allocated} {topic.time_unit === "hours" ? "hrs" : "days"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(topic.id)}
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 opacity-0 transition hover:bg-rose-500/20 hover:text-rose-300 group-hover:opacity-100"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Topics */}
              {topics.filter((t) => !formState.topic_ids.includes(t.id)).length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Available Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topics
                      .filter((topic) => !formState.topic_ids.includes(topic.id))
                      .map((topic) => (
                        <button
                          key={`add-${topic.id}`}
                          type="button"
                          onClick={() => handleAddTopic(topic.id)}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          {topic.title}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {topics.length === 0 && (
                <p className="text-center text-xs text-slate-500">No topics available. Create topics in Superadmin first.</p>
              )}
            </div>

            {/* Prerequisites Section */}
            {selectedTopics.length > 1 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Topic Dependencies</h4>
                    <p className="text-xs text-slate-400">Define prerequisites and corequisites</p>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {selectedTopics.map((topic) => {
                    const otherTopics = selectedTopics.filter((t) => t.id !== topic.id);
                    return (
                      <div key={`relations-${topic.id}`} className="rounded-xl border border-white/5 bg-black/20 p-4">
                        <p className="mb-3 text-sm font-medium text-white">{topic.title}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                              Prerequisites
                            </label>
                            <select
                              multiple
                              value={formState.topic_prerequisites[topic.id] ?? []}
                              onChange={(e) =>
                                handleRelationChange(topic.id, "pre", Array.from(e.target.selectedOptions).map((o) => o.value))
                              }
                              className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-indigo-500/50 focus:outline-none"
                            >
                              {otherTopics.map((t) => (
                                <option key={`pre-${topic.id}-${t.id}`} value={t.id} className="bg-[#1c1436] py-1">
                                  {t.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                              Corequisites
                            </label>
                            <select
                              multiple
                              value={formState.topic_corequisites[topic.id] ?? []}
                              onChange={(e) =>
                                handleRelationChange(topic.id, "co", Array.from(e.target.selectedOptions).map((o) => o.value))
                              }
                              className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-indigo-500/50 focus:outline-none"
                            >
                              {otherTopics.map((t) => (
                                <option key={`co-${topic.id}-${t.id}`} value={t.id} className="bg-[#1c1436] py-1">
                                  {t.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="sticky top-0 rounded-2xl border border-white/10 bg-gradient-to-b from-indigo-500/5 to-transparent p-5">
              <h4 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Course Summary
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-2xl font-semibold text-white">{totals.totalHours || 0}</p>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Total Hours</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                    <p className="text-2xl font-semibold text-white">{totals.totalDays || 0}</p>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Total Days</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Topics</span>
                    <span className="font-medium text-white">{selectedTopics.length}</span>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Total days are calculated at 8 hours per day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        title="Course Overview"
        description="Review the topics and estimated duration for this course."
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
            Loading course details...
          </div>
        )}
        {!detailLoading && detail && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Course</p>
                  <h3 className="mt-2 font-display text-xl text-white">{detail.course.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{detail.course.description}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  {detail.course.status ?? "draft"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Hours</p>
                  <p className="mt-1 text-sm text-white">{detail.course.total_hours ?? 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Days</p>
                  <p className="mt-1 text-sm text-white">{detail.course.total_days ?? 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Topics</p>
                  <p className="mt-1 text-sm text-white">{orderedDetailTopics.length}</p>
                </div>
              </div>
            </div>

            {orderedDetailTopics.length === 0 ? (
              <p className="text-sm text-slate-400">No topics assigned to this course yet.</p>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Topics</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {orderedDetailTopics.map((topic, index) => (
                    <div
                      key={`course-topic-${topic.id}`}
                      className="rounded-xl border border-white/10 bg-ink-800/50 px-4 py-3 text-sm text-slate-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white">{topic.title}</p>
                          {topic.description && (
                            <p className="text-xs text-slate-400">{topic.description}</p>
                          )}
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {topic.time_allocated} {topic.time_unit === "hours" ? "hrs" : "days"}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                        Topic {index + 1}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </Modal>
      </div>
    </div>
  );
};

export default CoursesSection;
