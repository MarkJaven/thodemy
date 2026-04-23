import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../../components/admin/Modal";
import ConfirmationModal from "../../../components/admin/ConfirmationModal";
import CharacterCounter from "../../../components/CharacterCounter";
import { superAdminService } from "../../../services/superAdminService";
import type { Topic, TopicResource } from "../../../types/superAdmin";

type TopicsSectionProps = {
  role?: "admin" | "superadmin";
};

type TopicFormState = {
  title: string;
  description: string;
  link_url: string;
  time_allocated: number;
  time_unit: "hours" | "days";
};

type ConfirmDialogState = {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

const MAX_TOPIC_DESCRIPTION_LENGTH = 500;

const TopicsSection = ({ role = "superadmin" }: TopicsSectionProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isSuperAdmin = role === "superadmin";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [pageSize, setPageSize] = useState(6);
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState<TopicFormState>({
    title: "",
    description: "",
    link_url: "",
    time_allocated: 1,
    time_unit: "days",
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [resourcesTopic, setResourcesTopic] = useState<Topic | null>(null);
  const [resources, setResources] = useState<TopicResource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceUploading, setResourceUploading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const resourceFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const topicData = await superAdminService.listTopics();
      setTopics(topicData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load topics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTopics = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return topics.filter((topic) => {
      const status = topic.status ?? "active";
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const author =
        topic.author?.username ||
        topic.author?.email ||
        topic.author_id ||
        topic.created_by ||
        "";
      const haystack = `${topic.title} ${topic.description ?? ""} ${author}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [topics, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTopics = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTopics.slice(start, start + pageSize);
  }, [filteredTopics, pageSize, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openCreate = () => {
    setSelectedTopic(null);
    setFormState({
      title: "",
      description: "",
      link_url: "",
      time_allocated: 1,
      time_unit: "days",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setSelectedTopic(topic);
    setFormState({
      title: topic.title,
      description: topic.description ?? "",
      link_url: topic.link_url ?? "",
      time_allocated: Number(topic.time_allocated ?? 1),
      time_unit: topic.time_unit === "hours" ? "hours" : "days",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openResourcesManager = (topic: Topic) => {
    setResourcesTopic(topic);
    setResources([]);
    setResourceError(null);
    void loadResources(topic.id);
  };

  const closeResourcesManager = () => {
    if (resourceUploading) return;
    setResourcesTopic(null);
    setResources([]);
    setResourceError(null);
  };

  const loadResources = async (topicId: string) => {
    setResourcesLoading(true);
    setResourceError(null);
    try {
      const list = await superAdminService.listTopicResources(topicId, {
        status: "all",
      });
      setResources(list);
    } catch (loadError) {
      setResourceError(
        loadError instanceof Error ? loadError.message : "Unable to load resources."
      );
      setResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleResourceUpload = async (file: File) => {
    if (!resourcesTopic) return;
    setResourceUploading(true);
    setResourceError(null);
    try {
      await superAdminService.uploadTopicResource({
        topicId: resourcesTopic.id,
        file,
      });
      await loadResources(resourcesTopic.id);
    } catch (uploadError) {
      setResourceError(
        uploadError instanceof Error ? uploadError.message : "Unable to upload resource."
      );
    } finally {
      setResourceUploading(false);
      if (resourceFileInputRef.current) {
        resourceFileInputRef.current.value = "";
      }
    }
  };

  const handleResourceDelete = (resource: TopicResource) => {
    setConfirmDialog({
      title: "Permanently delete resource?",
      description: `Permanently remove "${resource.file_name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setResourceError(null);
        try {
          await superAdminService.deleteTopicResource(resource.id);
          if (resourcesTopic) {
            await loadResources(resourcesTopic.id);
          }
        } catch (deleteError) {
          setResourceError(
            deleteError instanceof Error
              ? deleteError.message
              : "Unable to delete resource."
          );
        }
      },
    });
  };

  const handleResourceToggleStatus = (resource: TopicResource) => {
    const nextStatus = resource.status === "inactive" ? "active" : "inactive";
    setConfirmDialog({
      title: nextStatus === "inactive" ? "Deactivate resource?" : "Activate resource?",
      description:
        nextStatus === "inactive"
          ? `Hide "${resource.file_name}" from learners? You can reactivate it later.`
          : `Make "${resource.file_name}" visible to learners again?`,
      confirmLabel: nextStatus === "inactive" ? "Deactivate" : "Activate",
      variant: nextStatus === "inactive" ? "danger" : "default",
      onConfirm: async () => {
        setResourceError(null);
        try {
          await superAdminService.updateTopicResourceStatus(resource.id, nextStatus);
          if (resourcesTopic) {
            await loadResources(resourcesTopic.id);
          }
        } catch (toggleError) {
          setResourceError(
            toggleError instanceof Error
              ? toggleError.message
              : "Unable to update resource status."
          );
        }
      },
    });
  };

  const handleResourceOpen = async (resource: TopicResource) => {
    setResourceError(null);
    try {
      const url = await superAdminService.getTopicResourceUrl(resource.id);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (openError) {
      setResourceError(
        openError instanceof Error ? openError.message : "Unable to open resource."
      );
    }
  };

  const hasFormChanges = useMemo(() => {
    if (!isFormOpen) return false;
    const baseline = selectedTopic
      ? {
          title: selectedTopic.title,
          description: selectedTopic.description ?? "",
          link_url: selectedTopic.link_url ?? "",
          time_allocated: Number(selectedTopic.time_allocated ?? 1),
          time_unit: selectedTopic.time_unit === "hours" ? "hours" : "days",
        }
      : {
          title: "",
          description: "",
          link_url: "",
          time_allocated: 1,
          time_unit: "days" as const,
        };
    return JSON.stringify(formState) !== JSON.stringify(baseline);
  }, [formState, isFormOpen, selectedTopic]);

  const requestCloseForm = () => {
    if (saving) return;
    if (!hasFormChanges) {
      setIsFormOpen(false);
      return;
    }
    setConfirmDialog({
      title: "Discard topic changes?",
      description: "You have unsaved topic changes. Leaving now will discard them.",
      confirmLabel: "Discard",
      variant: "danger",
      onConfirm: () => {
        setIsFormOpen(false);
        setActionError(null);
      },
    });
  };

  const openStatusConfirm = (topic: Topic) => {
    const nextStatus = topic.status === "inactive" ? "active" : "inactive";
    setConfirmDialog({
      title: `${nextStatus === "active" ? "Activate" : "Deactivate"} topic?`,
      description: `${nextStatus === "active" ? "Activate" : "Deactivate"} "${topic.title}"?`,
      confirmLabel: nextStatus === "active" ? "Activate" : "Deactivate",
      variant: "danger",
      onConfirm: async () => {
        setActionError(null);
        try {
          await superAdminService.updateTopic(topic.id, { status: nextStatus });
          await loadData();
        } catch (toggleError) {
          setActionError(
            toggleError instanceof Error
              ? toggleError.message
              : "Unable to update topic status."
          );
        }
      },
    });
  };

  const handleSave = async () => {
    if (!formState.title.trim()) {
      setActionError("Topic title is required.");
      return;
    }
    if (!Number.isFinite(formState.time_allocated) || formState.time_allocated <= 0) {
      setActionError("Time allocated must be a positive number.");
      return;
    }
    if (formState.description.trim().length > MAX_TOPIC_DESCRIPTION_LENGTH) {
      setActionError(`Description must be ${MAX_TOPIC_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }

    setSaving(true);
    setActionError(null);
    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      link_url: formState.link_url.trim() || null,
      time_allocated: formState.time_allocated,
      time_unit: formState.time_unit,
    };

    try {
      if (selectedTopic) {
        await superAdminService.updateTopic(selectedTopic.id, payload);
      } else {
        await superAdminService.createTopic(payload);
      }
      setIsFormOpen(false);
      void loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save topic.");
    } finally {
      setSaving(false);
    }
  };



  const gridTemplate = isSuperAdmin
    ? "lg:grid-cols-[2.4fr_1fr_0.7fr_0.9fr_1.4fr]"
    : "lg:grid-cols-[2.2fr_1fr_0.7fr_0.9fr_1.1fr]";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-white">Topics</h2>
          <p className="mt-2 text-sm text-slate-300">
            Create and manage the training topics available to learners.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-purple-glow transition hover:shadow-purple-glow-lg"
        >
          + New Topic
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <input
            type="search"
            value={searchQuery}
            maxLength={100}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search topics, authors, descriptions..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200" role="alert" aria-live="assertive">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200" role="alert" aria-live="assertive">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`topic-skeleton-${index}`}
              className="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
          No topics match your filters.
        </div>
      ) : isSuperAdmin ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedTopics.map((topic) => {
              return (
                <div
                  key={topic.id}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-card transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{topic.title}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {topic.description || "No description"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        topic.status === "inactive"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {topic.status ?? "active"}
                    </span>
                  </div>

                  <div className="grid gap-3 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Author</span>
                      <span>
                        {topic.author?.username ||
                          topic.author?.email ||
                          topic.author_id ||
                          topic.created_by ||
                          "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400">Time</span>
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-200">
                        {topic.time_allocated} {topic.time_unit === "hours" ? (Number(topic.time_allocated) === 1 ? "hour" : "hours") : (Number(topic.time_allocated) === 1 ? "day" : "days")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(topic)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openResourcesManager(topic)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      Resources
                    </button>
                    <button
                      type="button"
                      onClick={() => openStatusConfirm(topic)}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20"
                    >
                      {topic.status === "inactive" ? "Activate" : "Deactivate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              Showing {paginatedTopics.length} of {filteredTopics.length} topics
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
      ) : (
        <div className="space-y-4">
          <div
            className={`hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 lg:grid ${gridTemplate}`}
          >
            <span>Topic</span>
            <span>Author</span>
            <span>Time</span>
            <span>Status</span>
            <span className="text-right">{isSuperAdmin ? "Actions" : "Resources"}</span>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {filteredTopics.map((topic) => {
              return (
                <div
                  key={topic.id}
                  className={`grid gap-4 py-4 lg:items-center ${gridTemplate}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{topic.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {topic.description || "No description"}
                    </p>
                  </div>
                  <div className="text-xs text-slate-300">
                    {topic.author?.username ||
                      topic.author?.email ||
                      topic.author_id ||
                      topic.created_by ||
                      "Unknown"}
                  </div>
                  <div>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {topic.time_allocated} {topic.time_unit === "hours" ? (Number(topic.time_allocated) === 1 ? "hour" : "hours") : (Number(topic.time_allocated) === 1 ? "day" : "days")}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        topic.status === "inactive"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      }`}
                    >
                      {topic.status ?? "active"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => openEdit(topic)}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openResourcesManager(topic)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    >
                      Resources
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => openStatusConfirm(topic)}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/20"
                      >
                        {topic.status === "inactive" ? "Activate" : "Deactivate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500">Showing {filteredTopics.length} items</p>
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        title={selectedTopic ? "Edit topic" : "Create topic"}
        description="Set the core details for this topic."
        onClose={requestCloseForm}
        footer={
          <>
            <button
              type="button"
              onClick={requestCloseForm}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Title
            <input
              type="text"
              value={formState.title}
              maxLength={100}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <CharacterCounter current={formState.title.length} max={100} />
          </label>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Time allocated
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                step={formState.time_unit === "hours" ? 0.5 : 1}
                value={formState.time_allocated}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    time_allocated: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              />
              <select
                value={formState.time_unit}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    time_unit: event.target.value as "hours" | "days",
                  }))
                }
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
          <label className="md:col-span-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            Description
            <textarea
              rows={3}
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              maxLength={MAX_TOPIC_DESCRIPTION_LENGTH}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <CharacterCounter current={formState.description.length} max={MAX_TOPIC_DESCRIPTION_LENGTH} />
          </label>
          <label className="md:col-span-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            Topic link
            <input
              type="url"
              placeholder="https://example.com/lesson"
              value={formState.link_url}
              maxLength={2048}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, link_url: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
          </label>

        </div>
      </Modal>

      <Modal
        isOpen={Boolean(resourcesTopic)}
        title="Topic resources"
        description={
          resourcesTopic
            ? `Manage uploaded learning materials for "${resourcesTopic.title}".`
            : undefined
        }
        onClose={closeResourcesManager}
        footer={
          <button
            type="button"
            onClick={closeResourcesManager}
            disabled={resourceUploading}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              PDF, Office docs, images, zip (max 15MB)
            </span>
          </div>

          {resourceError && (
            <div
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              role="alert"
            >
              {resourceError}
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              ref={resourceFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,image/*"
              disabled={resourceUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleResourceUpload(file);
              }}
              className="w-full text-xs text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.2em] file:text-white"
              aria-label="Upload topic resource"
            />
            {resourceUploading && (
              <p className="mt-2 text-[11px] text-slate-400">Uploading...</p>
            )}
          </div>

          <div className="space-y-2">
            {resourcesLoading ? (
              <p className="text-xs text-slate-400">Loading resources...</p>
            ) : resources.length === 0 ? (
              <p className="text-xs text-slate-500">No resources uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {resources.map((resource) => {
                  const isInactive = resource.status === "inactive";
                  return (
                    <li
                      key={resource.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                        isInactive
                          ? "border-white/5 bg-white/[0.02] opacity-70"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleResourceOpen(resource)}
                        className="min-w-0 flex-1 truncate text-left text-xs text-slate-200 transition hover:text-white"
                        title={resource.file_name}
                      >
                        {resource.file_name}
                      </button>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                          isInactive
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {isInactive ? "Inactive" : "Active"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResourceToggleStatus(resource)}
                        className="rounded-full border border-amber-500/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-200 transition hover:bg-amber-500/10"
                      >
                        {isInactive ? "Activate" : "Deactivate"}
                      </button>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleResourceDelete(resource)}
                          className="rounded-full border border-rose-500/30 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/10"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
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

export default TopicsSection;
