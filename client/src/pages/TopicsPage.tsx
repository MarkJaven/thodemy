import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/admin/Modal";
import Navbar from "../components/dashboard/Navbar";
import { useAuth } from "../context/AuthContext";
import { useTopicsData } from "../hooks/useTopicsData";
import { useUser } from "../hooks/useUser";
import { useUserRole } from "../hooks/useUserRole";
import { dashboardApi } from "../services/dashboardApi";
import { superAdminService } from "../services/superAdminService";
import type { Topic, TopicProgress } from "../types/dashboard";

type TopicFormState = {
  title: string;
  description: string;
  link_url: string;
  time_allocated: number;
  time_unit: "hours" | "days";
  pre_requisites: string[];
  co_requisites: string[];
};

const MAX_TOPIC_DESCRIPTION_LENGTH = 5000;

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const TopicsPage = () => {
  const { user, isLoading: userLoading } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { role } = useUserRole(user?.id);
  const { data, loading, error, refresh } = useTopicsData(user?.id);
  const isSuperAdmin = role === "superadmin";

  const [actionError, setActionError] = useState<string | null>(null);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [completingTopicId, setCompletingTopicId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [submissionTopic, setSubmissionTopic] = useState<Topic | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submittingSubmission, setSubmittingSubmission] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [formState, setFormState] = useState<TopicFormState>({
    title: "",
    description: "",
    link_url: "",
    time_allocated: 1,
    time_unit: "days",
    pre_requisites: [],
    co_requisites: [],
  });

  const progressByTopicId = useMemo(() => {
    return new Map(data.topicProgress.map((entry) => [entry.topic_id, entry]));
  }, [data.topicProgress]);

  const handleOpenCreate = () => {
    setActionError(null);
    setEditingTopic(null);
    setFormState({
      title: "",
      description: "",
      link_url: "",
      time_allocated: 1,
      time_unit: "days",
      pre_requisites: [],
      co_requisites: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (topic: Topic) => {
    setActionError(null);
    setEditingTopic(topic);
    setFormState({
      title: topic.title,
      description: topic.description ?? "",
      link_url: topic.link_url ?? "",
      time_allocated: Number(topic.time_allocated ?? 1),
      time_unit: topic.time_unit === "hours" ? "hours" : "days",
      pre_requisites: topic.pre_requisites ?? [],
      co_requisites: topic.co_requisites ?? [],
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (savingTopic) return;
    setIsModalOpen(false);
  };

  const handleSaveTopic = async () => {
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

    const payload = {
      title: formState.title.trim(),
      description: formState.description.trim() || null,
      link_url: formState.link_url.trim() || null,
      time_allocated: formState.time_allocated,
      time_unit: formState.time_unit,
      pre_requisites: Array.from(new Set(formState.pre_requisites)),
      co_requisites: Array.from(new Set(formState.co_requisites)),
    };

    setSavingTopic(true);
    setActionError(null);
    try {
      if (editingTopic) {
        await superAdminService.updateTopic(editingTopic.id, payload);
      } else {
        await superAdminService.createTopic(payload);
      }
      setIsModalOpen(false);
      void refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unable to save the topic.";
      setActionError(message);
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    const confirmed = window.confirm(
      `Archive "${topic.title}"? Learners will no longer see this topic.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      await superAdminService.deleteTopic(topic.id);
      await refresh();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete the topic.";
      setActionError(message);
    }
  };

  const handleOpenSubmission = (topic: Topic) => {
    setActionError(null);
    setSubmissionSuccess(null);
    setSubmissionTopic(topic);
    setSubmissionFile(null);
    setSubmissionMessage("");
  };

  const handleCloseSubmission = () => {
    if (submittingSubmission) return;
    setSubmissionTopic(null);
  };

  const handleSubmitProof = async () => {
    if (!submissionTopic || !user?.id) {
      setActionError("You must be signed in to submit a certificate.");
      return;
    }
    if (!submissionFile) {
      setActionError("Please attach a certificate file.");
      return;
    }

    setSubmittingSubmission(true);
    setActionError(null);
    try {
      await dashboardApi.submitTopicSubmission({
        topicId: submissionTopic.id,
        userId: user.id,
        file: submissionFile,
        message: submissionMessage.trim() || undefined,
      });
      setSubmissionTopic(null);
      setSubmissionFile(null);
      setSubmissionMessage("");
      setSubmissionSuccess("Submission received (pending review).");
      await refresh();
      setTimeout(() => setSubmissionSuccess(null), 4000);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the certificate.";
      setActionError(message);
    } finally {
      setSubmittingSubmission(false);
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

  const handleStartTopic = async (topic: Topic) => {
    if (!user?.id) {
      setActionError("You must be signed in to start a topic.");
      return;
    }
    setActionError(null);
    setStartingTopicId(topic.id);
    try {
      await dashboardApi.startTopic({
        topicId: topic.id,
        userId: user.id,
        timeAllocated: Number(topic.time_allocated),
        timeUnit: topic.time_unit ?? "days",
      });
      setActionError(null);
      setStartingTopicId(null);
      await refresh();
    } catch (startError) {
      const message =
        startError instanceof Error ? startError.message : "Unable to start the topic.";
      setActionError(message);
      setStartingTopicId(null);
    }
  };

  const handleCompleteTopic = async (topic: Topic) => {
    if (!user?.id) {
      setActionError("You must be signed in to complete a topic.");
      return;
    }
    setActionError(null);
    setCompletingTopicId(topic.id);
    try {
      await dashboardApi.completeTopic({ topicId: topic.id, userId: user.id });
      await refresh();
    } catch (completeError) {
      const message =
        completeError instanceof Error ? completeError.message : "Unable to complete the topic.";
      setActionError(message);
    } finally {
      setCompletingTopicId(null);
    }
  };

  const renderStatus = (progress?: TopicProgress) => {
    if (!progress) return "Not Started";
    if (progress.status === "completed") return "Completed";
    return "In Progress";
  };

  const visibleTopics = data.topics.filter(
    (topic) => topic.status !== "inactive" && !topic.deleted_at
  );

  const availableTopics = visibleTopics.filter((topic) =>
    editingTopic ? topic.id !== editingTopic.id : true
  );

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col gap-10">
          <Navbar
            userEmail={user?.email}
            onSignOut={async () => {
              await signOut();
              navigate("/");
            }}
          />

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Topics hub
              </p>
              <h1 className="mt-2 font-display text-3xl text-white">Your Topics</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Track each topic as you move from not started to completion.
              </p>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white transition hover:bg-white/20"
                aria-label="Create topic"
              >
                +
              </button>
            )}
          </div>

          {(error || actionError) && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {actionError || error}
            </div>
          )}
          {submissionSuccess && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              {submissionSuccess}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`topic-skeleton-${index}`}
                  className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          ) : visibleTopics.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No topics available yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleTopics.map((topic) => {
                const progress = progressByTopicId.get(topic.id);
                const status = renderStatus(progress);
                const prereqs = topic.pre_requisites ?? [];
                const missingPrereqs = prereqs.filter(
                  (id) => progressByTopicId.get(id)?.status !== "completed"
                );
                const canStart = status === "Not Started" && missingPrereqs.length === 0;
                return (
                  <div
                    key={topic.id}
                    className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{topic.title}</h3>
                          <p className="mt-1 text-sm text-slate-300">{topic.description}</p>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                          {status}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {topic.time_allocated} {topic.time_unit === "hours" ? "hours" : "days"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Start: {formatDate(progress?.start_date)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          End: {formatDate(progress?.end_date)}
                        </span>
                      </div>
                      {status === "Not Started" && missingPrereqs.length > 0 && (
                        <p className="mt-3 text-xs text-slate-400">
                          Complete prerequisites before starting this topic.
                        </p>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      {status === "Not Started" && (
                        <button
                          type="button"
                          onClick={() => handleStartTopic(topic)}
                          disabled={!canStart || startingTopicId === topic.id || !user?.id}
                          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {startingTopicId === topic.id ? "Starting..." : "Start"}
                        </button>
                      )}
                      {status === "In Progress" && (
                        <button
                          type="button"
                          onClick={() => handleCompleteTopic(topic)}
                          disabled={completingTopicId === topic.id}
                          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {completingTopicId === topic.id ? "Completing..." : "Mark complete"}
                        </button>
                      )}
                      {user?.id && (
                        <button
                          type="button"
                          onClick={() => handleOpenSubmission(topic)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/20"
                        >
                          Upload Certificate
                        </button>
                      )}
                      {isSuperAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(topic)}
                            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(topic)}
                            className="rounded-full border border-rose-500/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 transition hover:text-rose-100"
                          >
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {userLoading ? "Loading user..." : "Statuses update as you start and finish topics."}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingTopic ? "Edit topic" : "Create topic"}
        description="Set the core details and relationships for this topic."
        onClose={handleCloseModal}
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTopic}
              disabled={savingTopic}
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingTopic ? "Saving..." : "Save"}
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
              maxLength={MAX_TOPIC_DESCRIPTION_LENGTH}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-slate-500">
              {formState.description.length}/{MAX_TOPIC_DESCRIPTION_LENGTH} characters
            </span>
          </label>
          <label className="md:col-span-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            Topic link
            <input
              type="url"
              value={formState.link_url}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, link_url: event.target.value }))
              }
              placeholder="https://example.com"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
          </label>
          <div className="md:col-span-2 text-xs uppercase tracking-[0.25em] text-slate-400">
            Topic relationships
            <div className="mt-2 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              {availableTopics.map((topic) => (
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
              {availableTopics.length === 0 && (
                <p className="text-xs text-slate-400">No other topics available.</p>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Set each topic as prerequisite, corequisite, or none.
        </p>
      </Modal>

      <Modal
        isOpen={Boolean(submissionTopic)}
        title="Submit proof"
        description={
          submissionTopic ? `Upload a certificate for "${submissionTopic.title}".` : undefined
        }
        onClose={handleCloseSubmission}
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseSubmission}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitProof}
              disabled={submittingSubmission}
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submittingSubmission ? "Submitting..." : "Submit"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Certificate file (PDF/JPG/PNG)
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              onChange={(event) =>
                setSubmissionFile(event.target.files?.[0] ?? null)
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Notes (optional)
            <textarea
              rows={3}
              value={submissionMessage}
              onChange={(event) => setSubmissionMessage(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default TopicsPage;
