import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { Topic } from "../../../types/superAdmin";

type TopicFormState = {
  title: string;
  description: string;
  time_allocated: number;
  time_unit: "hours" | "days";
  pre_requisites: string[];
  co_requisites: string[];
};

const TopicsSection = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formState, setFormState] = useState<TopicFormState>({
    title: "",
    description: "",
    time_allocated: 1,
    time_unit: "days",
    pre_requisites: [],
    co_requisites: [],
  });

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

  const topicMap = useMemo(() => {
    return new Map(topics.map((topic) => [topic.id, topic.title]));
  }, [topics]);

  const openCreate = () => {
    setSelectedTopic(null);
    setFormState({
      title: "",
      description: "",
      time_allocated: 1,
      time_unit: "days",
      pre_requisites: [],
      co_requisites: [],
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (topic: Topic) => {
    setSelectedTopic(topic);
    setFormState({
      title: topic.title,
      description: topic.description ?? "",
      time_allocated: Number(topic.time_allocated ?? 1),
      time_unit: topic.time_unit === "hours" ? "hours" : "days",
      pre_requisites: topic.pre_requisites ?? [],
      co_requisites: topic.co_requisites ?? [],
    });
    setActionError(null);
    setIsFormOpen(true);
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

    setSaving(true);
    setActionError(null);
    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      time_allocated: formState.time_allocated,
      time_unit: formState.time_unit,
      pre_requisites: Array.from(new Set(formState.pre_requisites)),
      co_requisites: Array.from(new Set(formState.co_requisites)),
    };

    try {
      if (selectedTopic) {
        await superAdminService.updateTopic(selectedTopic.id, payload);
      } else {
        await superAdminService.createTopic(payload);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save topic.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (topic: Topic) => {
    const confirmed = window.confirm(`Delete "${topic.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await superAdminService.deleteTopic(topic.id);
      await loadData();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete topic.");
    }
  };

  const getRelation = (topicId: string) => {
    if (formState.pre_requisites.includes(topicId)) return "pre";
    if (formState.co_requisites.includes(topicId)) return "co";
    return "none";
  };

  const handleRelationChange = (topicId: string, value: "none" | "pre" | "co") => {
    setFormState((prev) => {
      const pre = new Set(prev.pre_requisites);
      const co = new Set(prev.co_requisites);
      pre.delete(topicId);
      co.delete(topicId);
      if (value === "pre") pre.add(topicId);
      if (value === "co") co.add(topicId);
      return {
        ...prev,
        pre_requisites: Array.from(pre),
        co_requisites: Array.from(co),
      };
    });
  };

  const columns = [
    {
      key: "title",
      header: "Topic",
      render: (topic: Topic) => (
        <div>
          <p className="text-white">{topic.title}</p>
          <p className="text-xs text-slate-400">{topic.description || "No description"}</p>
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (topic: Topic) => (
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          {topic.time_allocated} {topic.time_unit === "hours" ? "hours" : "days"}
        </span>
      ),
    },
    {
      key: "reqs",
      header: "Requirements",
      render: (topic: Topic) => {
        const preList = topic.pre_requisites ?? [];
        const coList = topic.co_requisites ?? [];
        const preNames = preList.map((id) => topicMap.get(id) || "Unknown");
        const coNames = coList.map((id) => topicMap.get(id) || "Unknown");
        return (
          <div className="text-xs text-slate-300">
            <p>Pre: {preNames.length ? preNames.join(", ") : "None"}</p>
            <p>Co: {coNames.length ? coNames.join(", ") : "None"}</p>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      align: "right" as const,
      render: (topic: Topic) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openEdit(topic)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(topic)}
            className="rounded-full border border-rose-500/40 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white transition hover:bg-white/20"
          aria-label="Create topic"
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
              key={`topic-skeleton-${index}`}
              className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : (
        <DataTable columns={columns} data={topics} emptyMessage="No topics yet." />
      )}

      <Modal
        isOpen={isFormOpen}
        title={selectedTopic ? "Edit topic" : "Create topic"}
        description="Set the core details and relationships for this topic."
        onClose={() => (saving ? null : setIsFormOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
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
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
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
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
          </label>
          <div className="md:col-span-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            Topic relationships
            <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {topics
                .filter((topic) => topic.id !== selectedTopic?.id)
                .map((topic) => (
                  <div
                    key={`rel-${topic.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-white">{topic.title}</span>
                    <select
                      value={getRelation(topic.id)}
                      onChange={(event) =>
                        handleRelationChange(
                          topic.id,
                          event.target.value as "none" | "pre" | "co"
                        )
                      }
                      className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white"
                    >
                      <option value="none">None</option>
                      <option value="pre">Prerequisite</option>
                      <option value="co">Corequisite</option>
                    </select>
                  </div>
                ))}
              {topics.filter((topic) => topic.id !== selectedTopic?.id).length === 0 && (
                <p className="text-xs text-slate-400">No other topics available.</p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Set each topic as prerequisite, corequisite, or none.
        </p>
      </Modal>
    </div>
  );
};

export default TopicsSection;
