import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Modal from "../../../components/admin/Modal";
import {
  adminCourseService,
  CourseDetail,
  CourseSummary,
  type TopicGroup,
} from "../../../services/adminCourseService";
import { superAdminService } from "../../../services/superAdminService";
import type { Topic } from "../../../types/superAdmin";

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

const normalizeTitle = (value?: string | null) =>
  (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normalizeTopicIds = (
  ids: Array<string | null | undefined>,
  topicLookup: Map<string, Topic>
) => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const result: string[] = [];
  ids.forEach((rawId) => {
    if (typeof rawId !== "string") return;
    const id = rawId.trim();
    if (!id || seenIds.has(id)) return;
    const topic = topicLookup.get(id);
    if (topic) {
      const titleKey = normalizeTitle(topic.title);
      if (titleKey && seenTitles.has(titleKey)) {
        return;
      }
      if (titleKey) {
        seenTitles.add(titleKey);
      }
    }
    seenIds.add(id);
    result.push(id);
  });
  return result;
};

const normalizeRelationMap = (
  value?: Record<string, string[]> | null,
  keepIds?: Set<string>
) => {
  if (!value) return {};
  return Object.entries(value).reduce<Record<string, string[]>>((acc, [key, list]) => {
    if (keepIds && !keepIds.has(key)) return acc;
    const filtered = Array.isArray(list)
      ? list.filter((id) => typeof id === "string" && (!keepIds || keepIds.has(id)))
      : [];
    const unique = Array.from(new Set(filtered));
    if (unique.length > 0) {
      acc[key] = unique;
    }
    return acc;
  }, {});
};

const normalizeGroupName = (value: unknown, fallbackLabel: string) => {
  const normalized =
    typeof value === "string"
      ? value
          .normalize("NFKC")
          .replace(/\s+/g, " ")
          .trim()
      : "";
  return normalized || fallbackLabel;
};

const normalizeTopicGroups = (value: unknown, orderedIds: string[]): TopicGroup[] => {
  if (!Array.isArray(value) || orderedIds.length === 0) {
    return [];
  }
  const indexById = new Map(orderedIds.map((id, index) => [id, index]));
  const claimed = new Set<string>();
  let fallbackIndex = 1;

  const groups: Array<TopicGroup & { firstIndex: number }> = [];
  value.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const rawTopicIds = Array.isArray((entry as { topic_ids?: unknown[] }).topic_ids)
      ? (entry as { topic_ids: unknown[] }).topic_ids
      : [];
    const topicIds = Array.from(
      new Set(
        rawTopicIds
          .map((topicId) => String(topicId))
          .filter((topicId) => indexById.has(topicId))
          .filter((topicId) => !claimed.has(topicId))
      )
    );
    if (topicIds.length < 2) return;

    topicIds.sort((left, right) => (indexById.get(left) ?? 0) - (indexById.get(right) ?? 0));
    topicIds.forEach((topicId) => claimed.add(topicId));

    groups.push({
      name: normalizeGroupName((entry as { name?: unknown }).name, `Grouped Topics ${fallbackIndex}`),
      topic_ids: topicIds,
      firstIndex: indexById.get(topicIds[0]) ?? Number.MAX_SAFE_INTEGER,
    });
    fallbackIndex += 1;
  });

  groups.sort((left, right) => left.firstIndex - right.firstIndex);
  return groups.map((group, index) => ({
    name: normalizeGroupName(group.name, `Grouped Topics ${index + 1}`),
    topic_ids: group.topic_ids,
  }));
};

const buildTopicGroupsFromCorequisites = (
  coreqMap: Record<string, string[]>,
  orderedIds: string[]
): TopicGroup[] => {
  if (orderedIds.length === 0) {
    return [];
  }
  const keepIds = new Set(orderedIds);
  const normalizedCoreqs = normalizeRelationMap(coreqMap, keepIds);
  const parent = new Map(orderedIds.map((topicId) => [topicId, topicId]));

  const find = (topicId: string): string => {
    const parentId = parent.get(topicId);
    if (!parentId || parentId === topicId) return topicId;
    const root = find(parentId);
    parent.set(topicId, root);
    return root;
  };

  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    parent.set(rightRoot, leftRoot);
  };

  Object.entries(normalizedCoreqs).forEach(([topicId, linked]) => {
    linked.forEach((linkedId) => {
      if (!parent.has(linkedId)) return;
      union(topicId, linkedId);
    });
  });

  const groupsByRoot = new Map<string, { topic_ids: string[]; firstIndex: number }>();
  orderedIds.forEach((topicId, index) => {
    const root = find(topicId);
    const existing = groupsByRoot.get(root);
    if (!existing) {
      groupsByRoot.set(root, { topic_ids: [topicId], firstIndex: index });
      return;
    }
    existing.topic_ids.push(topicId);
    existing.firstIndex = Math.min(existing.firstIndex, index);
  });

  return Array.from(groupsByRoot.values())
    .filter((group) => group.topic_ids.length > 1)
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map((group, index) => ({
      name: `Grouped Topics ${index + 1}`,
      topic_ids: group.topic_ids,
    }));
};

const MAX_COURSE_DESCRIPTION_LENGTH = 5000;

const CoursesSection = () => {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastClickedTopicId, setLastClickedTopicId] = useState<string | null>(null);
  const [pendingGroupTopicIds, setPendingGroupTopicIds] = useState<Set<string>>(new Set());
  const [groupNameInput, setGroupNameInput] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "draft",
    topic_ids: [] as string[],
    topic_groups: [] as TopicGroup[],
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const topicLookup = useMemo(() => new Map(topics.map((topic) => [topic.id.trim(), topic])), [topics]);

  const selectedTopics = useMemo(
    () =>
      formState.topic_ids
        .map((id) => topicLookup.get(id.trim()))
        .filter(Boolean) as Topic[],
    [formState.topic_ids, topicLookup]
  );
  const selectedTitleKeys = useMemo(
    () => selectedTopics.map((topic) => normalizeTitle(topic.title)).filter(Boolean),
    [selectedTopics]
  );
  const selectedIdSet = useMemo(
    () => new Set(formState.topic_ids.map((id) => id.trim())),
    [formState.topic_ids]
  );
  const availableTopics = useMemo(() => {
    const selectedTitles = new Set(selectedTitleKeys);
    const seenTitles = new Set<string>();
    return topics.filter((topic) => {
      if (selectedIdSet.has(topic.id.trim())) return false;
      const titleKey = normalizeTitle(topic.title);
      if (titleKey) {
        if (selectedTitles.has(titleKey)) return false;
        if (seenTitles.has(titleKey)) return false;
        seenTitles.add(titleKey);
      }
      return true;
    });
  }, [topics, selectedIdSet, selectedTitleKeys]);
  const topicGroupNameByTopicId = useMemo(() => {
    const map = new Map<string, string>();
    formState.topic_groups.forEach((group) => {
      group.topic_ids.forEach((topicId) => {
        map.set(topicId, group.name);
      });
    });
    return map;
  }, [formState.topic_groups]);
  const pendingTopicIdsInOrder = useMemo(
    () => formState.topic_ids.filter((topicId) => pendingGroupTopicIds.has(topicId)),
    [formState.topic_ids, pendingGroupTopicIds]
  );

  const totals = useMemo(() => buildTotals(selectedTopics), [selectedTopics]);
  const orderedDetailTopics = useMemo(() => {
    if (!detail) return [];
    const ordered =
      detail.course.topic_ids?.map((id) => detail.topics.find((topic) => topic.id === id)) ??
      detail.topics;
    return ordered.filter(Boolean) as Topic[];
  }, [detail]);
  const detailTopicGroupNameByTopicId = useMemo(() => {
    const map = new Map<string, string>();
    if (!detail) return map;
    const orderedIds = detail.course.topic_ids ?? [];
    const groups = normalizeTopicGroups(
      detail.course.topic_groups ??
        buildTopicGroupsFromCorequisites(
          normalizeRelationMap(detail.course.topic_corequisites, new Set(orderedIds)),
          orderedIds
        ),
      orderedIds
    );
    groups.forEach((group) => {
      group.topic_ids.forEach((topicId) => {
        map.set(topicId, group.name);
      });
    });
    return map;
  }, [detail]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const status = course.status ?? "draft";
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const haystack = `${course.title} ${course.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [courses, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, pageSize, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
      topic_groups: [],
    });
    setPendingGroupTopicIds(new Set());
    setGroupNameInput("");
    setLastClickedTopicId(null);
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = async (course: CourseSummary) => {
    const uniqueTopicIds = normalizeTopicIds(course.topic_ids ?? [], topicLookup);
    const keepIds = new Set(uniqueTopicIds);
    const initialGroups = normalizeTopicGroups(
      course.topic_groups ??
        buildTopicGroupsFromCorequisites(
          normalizeRelationMap(course.topic_corequisites, keepIds),
          uniqueTopicIds
        ),
      uniqueTopicIds
    );
    setSelectedCourse(course);
    setFormState({
      title: course.title,
      description: course.description ?? "",
      status: course.status ?? "draft",
      topic_ids: uniqueTopicIds,
      topic_groups: initialGroups,
    });
    setPendingGroupTopicIds(new Set());
    setGroupNameInput("");
    setLastClickedTopicId(null);
    setActionError(null);
    setIsFormOpen(true);

    setFormLoading(true);
    try {
      const detail = await adminCourseService.getCourseDetail(course.id);
      const detailCourse = detail.course;
      const detailTopicIds = normalizeTopicIds(detailCourse.topic_ids ?? [], topicLookup);
      const detailKeepIds = new Set(detailTopicIds);
      const detailGroups = normalizeTopicGroups(
        detailCourse.topic_groups ??
          buildTopicGroupsFromCorequisites(
            normalizeRelationMap(detailCourse.topic_corequisites, detailKeepIds),
            detailTopicIds
          ),
        detailTopicIds
      );
      setSelectedCourse((prev) => ({
        ...prev,
        ...detailCourse,
      }));
      setFormState({
        title: detailCourse.title,
        description: detailCourse.description ?? "",
        status: detailCourse.status ?? "draft",
        topic_ids: detailTopicIds,
        topic_groups: detailGroups,
      });
      setPendingGroupTopicIds(new Set());
      setGroupNameInput("");
      setLastClickedTopicId(null);
    } catch (detailError) {
      setActionError(
        detailError instanceof Error ? detailError.message : "Unable to load course details."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const updateTopicIds = (nextIds: string[]) => {
    const uniqueIds = normalizeTopicIds(nextIds, topicLookup);
    const keepIds = new Set(uniqueIds);
    setFormState((prev) => {
      return {
        ...prev,
        topic_ids: uniqueIds,
        topic_groups: normalizeTopicGroups(prev.topic_groups, uniqueIds),
      };
    });
    setPendingGroupTopicIds((prev) => {
      const nextSelection = new Set<string>();
      prev.forEach((topicId) => {
        if (keepIds.has(topicId)) {
          nextSelection.add(topicId);
        }
      });
      return nextSelection;
    });
    if (lastClickedTopicId && !keepIds.has(lastClickedTopicId)) {
      setLastClickedTopicId(null);
    }
  };

  const handleCreateTopicGroup = () => {
    if (pendingTopicIdsInOrder.length < 2) {
      setActionError("Shift+click to select at least two topics for a group.");
      return;
    }

    setFormState((prev) => {
      const selectedSet = new Set(pendingTopicIdsInOrder);
      const baseGroups = prev.topic_groups
        .map((group) => ({
          ...group,
          topic_ids: group.topic_ids.filter((topicId) => !selectedSet.has(topicId)),
        }))
        .filter((group) => group.topic_ids.length > 1);

      const fallbackName = `Grouped Topics ${baseGroups.length + 1}`;
      const nextGroups = normalizeTopicGroups(
        [
          ...baseGroups,
          {
            name: normalizeGroupName(groupNameInput, fallbackName),
            topic_ids: pendingTopicIdsInOrder,
          },
        ],
        prev.topic_ids
      );

      return {
        ...prev,
        topic_groups: nextGroups,
      };
    });

    setPendingGroupTopicIds(new Set());
    setGroupNameInput("");
    setActionError(null);
  };

  const handleRemoveTopicGroup = (groupIndex: number) => {
    setFormState((prev) => ({
      ...prev,
      topic_groups: prev.topic_groups.filter((_, index) => index !== groupIndex),
    }));
  };

  const handleTopicClick = (topicId: string, event: MouseEvent<HTMLDivElement>) => {
    if (event.shiftKey && lastClickedTopicId && lastClickedTopicId !== topicId) {
      const index = formState.topic_ids.indexOf(topicId);
      const lastIndex = formState.topic_ids.indexOf(lastClickedTopicId);
      if (index !== -1 && lastIndex !== -1) {
        const start = Math.min(index, lastIndex);
        const end = Math.max(index, lastIndex);
        setPendingGroupTopicIds(new Set(formState.topic_ids.slice(start, end + 1)));
        setLastClickedTopicId(topicId);
        return;
      }
    }
    setPendingGroupTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
    setLastClickedTopicId(topicId);
  };

  const handleAddTopic = (topicId: string) => {
    const trimmedId = topicId.trim();
    if (selectedIdSet.has(trimmedId)) return;
    setActionError(null);
    updateTopicIds([...formState.topic_ids, trimmedId]);
  };

  const handleRemoveTopic = (topicId: string) => {
    const trimmedId = topicId.trim();
    updateTopicIds(formState.topic_ids.filter((id) => id.trim() !== trimmedId));
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

  const handleSave = async () => {
    if (!formState.title.trim()) {
      setActionError("Course title is required.");
      return;
    }
    if (!formState.description.trim()) {
      setActionError("Course description is required.");
      return;
    }
    if (formState.description.trim().length > MAX_COURSE_DESCRIPTION_LENGTH) {
      setActionError(
        `Course description must be ${MAX_COURSE_DESCRIPTION_LENGTH} characters or fewer.`
      );
      return;
    }
    const uniqueTopicIds = normalizeTopicIds(formState.topic_ids, topicLookup);
    if (uniqueTopicIds.length === 0) {
      setActionError("Select at least one topic.");
      return;
    }

    setSaving(true);
    setActionError(null);
    const normalizedGroups = normalizeTopicGroups(formState.topic_groups, uniqueTopicIds);
    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim(),
      status: formState.status,
      topic_ids: uniqueTopicIds,
      topic_prerequisites: {},
      topic_groups: normalizedGroups,
      topic_corequisites: {},
      enrollment_enabled: selectedCourse?.enrollment_enabled ?? true,
      enrollment_limit: selectedCourse?.enrollment_limit ?? null,
      start_at: selectedCourse?.start_at ?? null,
    };

    try {
      if (selectedCourse) {
        await adminCourseService.updateCourse(selectedCourse.id, payload);
      } else {
        await adminCourseService.createCourse(payload);
      }
      setIsFormOpen(false);
      void loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async (course: CourseSummary) => {
    const nextStatus = course.status === "archived" ? "draft" : "archived";
    const confirmed = window.confirm(
      `${nextStatus === "archived" ? "Deactivate" : "Activate"} "${course.title}"?`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      const normalizedTopicIds = normalizeTopicIds(course.topic_ids ?? [], topicLookup);
      const keepIds = new Set(normalizedTopicIds);
      const normalizedGroups = normalizeTopicGroups(
        course.topic_groups ??
          buildTopicGroupsFromCorequisites(
            normalizeRelationMap(course.topic_corequisites, keepIds),
            normalizedTopicIds
          ),
        normalizedTopicIds
      );
      await adminCourseService.updateCourse(course.id, {
        title: course.title,
        description: course.description ?? "",
        status: nextStatus,
        topic_ids: normalizedTopicIds,
        topic_prerequisites: {},
        topic_groups: normalizedGroups,
        topic_corequisites: {},
        enrollment_enabled: course.enrollment_enabled ?? true,
        enrollment_limit: course.enrollment_limit ?? null,
        start_at: course.start_at ?? null,
      });
      await loadData();
    } catch (toggleError) {
      setActionError(
        toggleError instanceof Error ? toggleError.message : "Unable to update course status."
      );
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

  return (
    <div className="space-y-10">
      <div className="h-px w-full bg-white/10" />
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-white">Courses</h2>
            <p className="mt-2 text-sm text-slate-300">
              Build courses and organize topics for learners.
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
          New Course
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search courses, descriptions..."
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
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
            <button type="button" onClick={loadData} className="ml-auto text-xs uppercase tracking-widest hover:text-white">
              Retry
            </button>
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{actionError}</span>
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
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
            No courses match your filters.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedCourses.map((course) => {
                const status = course.status ?? "draft";
                const statusConfig: Record<string, string> = {
                  draft: "border-white/10 bg-white/5 text-slate-300",
                  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                  archived: "border-amber-500/30 bg-amber-500/10 text-amber-300",
                };
                return (
                  <div
                    key={course.id}
                    className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {course.description || "No description"}
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
                        <span className="text-slate-400">Topics</span>
                        <span>{course.topic_ids?.length ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Grouped Topics</span>
                        <span>{course.topic_groups?.length ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400">Hours / Days</span>
                        <span>
                          {course.total_hours ?? 0}h / {course.total_days ?? 0}d
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDetail(course)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(course)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchiveToggle(course)}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20"
                      >
                        {course.status === "archived" ? "Activate" : "Deactivate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span>
                Showing {paginatedCourses.length} of {filteredCourses.length} courses
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || formLoading}
                className="btn-primary flex items-center gap-2"
              >
                {saving || formLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {saving ? "Saving..." : "Loading..."}
                  </>
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
                    maxLength={MAX_COURSE_DESCRIPTION_LENGTH}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                  <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    {formState.description.length}/{MAX_COURSE_DESCRIPTION_LENGTH} characters
                  </span>
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
                      (() => {
                        const groupName = topicGroupNameByTopicId.get(topic.id);
                        const isPendingSelection = pendingGroupTopicIds.has(topic.id);
                        return (
                          <div
                            key={topic.id}
                            draggable
                            onDragStart={() => handleDragStart(topic.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(topic.id)}
                            onClick={(event) => handleTopicClick(topic.id, event)}
                            className={`group flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2.5 transition active:cursor-grabbing ${
                              isPendingSelection
                                ? "border-indigo-400/60 bg-indigo-500/10"
                                : "border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent hover:border-indigo-500/30 hover:from-indigo-500/5"
                            }`}
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
                            {groupName ? (
                              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">
                                {groupName}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRemoveTopic(topic.id);
                              }}
                              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-slate-500 opacity-0 transition hover:bg-rose-500/20 hover:text-rose-300 group-hover:opacity-100"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Tip: Shift+click to select a topic range, then name and create a grouped topic set.
              </p>
              <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(event) => setGroupNameInput(event.target.value)}
                    placeholder="Grouped Topics name"
                    className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTopicGroup}
                    disabled={pendingTopicIdsInOrder.length < 2}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Create Group
                  </button>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Selected for group: {pendingTopicIdsInOrder.length}
                </p>
                {formState.topic_groups.length > 0 ? (
                  <div className="space-y-2">
                    {formState.topic_groups.map((group, groupIndex) => (
                      <div
                        key={`${group.name}-${groupIndex}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                            {group.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">
                            {group.topic_ids
                              .map((topicId) => topicLookup.get(topicId)?.title || topicId)
                              .join(" • ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopicGroup(groupIndex)}
                          className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No grouped topics created yet.</p>
                )}
              </div>

              {/* Available Topics */}
              {availableTopics.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                    Available Topics
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableTopics.map((topic) => (
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
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <span className="text-slate-400">Grouped Topics</span>
                    <span className="font-medium text-white">{formState.topic_groups.length}</span>
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
            className="btn-secondary"
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
              <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-4">
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
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Grouped Topics</p>
                  <p className="mt-1 text-sm text-white">{detail.course.topic_groups?.length ?? 0}</p>
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
                    (() => {
                      const groupName = detailTopicGroupNameByTopicId.get(topic.id);
                      return (
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
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Topic {index + 1}
                            </p>
                            {groupName ? (
                              <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200">
                                {groupName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()
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
