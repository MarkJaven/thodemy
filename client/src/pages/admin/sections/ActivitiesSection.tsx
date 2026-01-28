import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { useUser } from "../../../hooks/useUser";
import { superAdminService } from "../../../services/superAdminService";
import type {
  Activity,
  ActivitySubmission,
  AdminUser,
  Course,
  Enrollment,
  Topic,
  TopicCompletionRequest,
  TopicProgress,
} from "../../../types/superAdmin";

const ActivitiesSection = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [completionRequests, setCompletionRequests] = useState<TopicCompletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    course_id: "",
    user_id: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const { user } = useUser();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        activityData,
        submissionData,
        courseData,
        userData,
        enrollmentData,
        topicData,
        topicProgressData,
        completionData,
      ] = await Promise.all([
        superAdminService.listActivities(),
        superAdminService.listActivitySubmissions(),
        superAdminService.listCourses(),
        superAdminService.listUsers(),
        superAdminService.listEnrollments(),
        superAdminService.listTopics(),
        superAdminService.listTopicProgress(),
        superAdminService.listTopicCompletionRequests(),
      ]);
      setActivities(activityData);
      setSubmissions(submissionData);
      setCourses(courseData);
      setUsers(userData);
      setEnrollments(enrollmentData);
      setTopics(topicData);
      setTopicProgress(topicProgressData);
      setCompletionRequests(completionData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load activities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setSelectedActivity(null);
    setFormState({ title: "", description: "", course_id: "", user_id: "", status: "active" });
    setActionError(null);
    setIsFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    setSelectedActivity(activity);
    setFormState({
      title: activity.title,
      description: activity.description ?? "",
      course_id: activity.course_id ?? "",
      user_id: activity.user_id ?? "",
      status: activity.status ?? "active",
    });
    setActionError(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setActionError(null);
    const payload = {
      title: formState.title,
      description: formState.description,
      course_id: formState.course_id || null,
      user_id: formState.user_id || null,
      status: formState.status,
    };
    try {
      if (selectedActivity) {
        await superAdminService.updateActivity(selectedActivity.id, payload);
      } else {
        await superAdminService.createActivity(payload);
      }
      setIsFormOpen(false);
      await loadData();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save activity.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (activityId: string) => {
    const previous = activities;
    setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteActivity(activityId);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete activity.");
      setActivities(previous);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    const previous = submissions;
    setSubmissions((prev) => prev.filter((submission) => submission.id !== submissionId));
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteActivitySubmission(submissionId);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Unable to delete submission."
      );
      setSubmissions(previous);
    } finally {
      setSaving(false);
    }
  };

  const handleViewSubmission = async (submission: ActivitySubmission) => {
    setViewError(null);
    try {
      const url = await superAdminService.getActivitySubmissionUrl(submission.storage_path);
      if (!url) {
        setViewError("No file available for this submission.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (loadError) {
      setViewError(
        loadError instanceof Error ? loadError.message : "Unable to open submission file."
      );
    }
  };

  const handleViewProof = async (request: TopicCompletionRequest) => {
    setViewError(null);
    try {
      const url = await superAdminService.getTopicProofUrl(request.storage_path);
      if (!url) {
        setViewError("No file available for this proof.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (loadError) {
      setViewError(loadError instanceof Error ? loadError.message : "Unable to open proof file.");
    }
  };

  const handleApproveRequest = async (request: TopicCompletionRequest) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateTopicCompletionRequest(request.id, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      });
      await superAdminService.updateTopicProgressStatus({
        topicId: request.topic_id,
        userId: request.user_id,
        status: "completed",
        end_date: new Date().toISOString(),
      });
      await loadData();
    } catch (approveError) {
      setActionError(
        approveError instanceof Error ? approveError.message : "Unable to approve proof."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (request: TopicCompletionRequest) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateTopicCompletionRequest(request.id, {
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      });
      await loadData();
    } catch (rejectError) {
      setActionError(
        rejectError instanceof Error ? rejectError.message : "Unable to reject proof."
      );
    } finally {
      setSaving(false);
    }
  };

  const activityColumns = useMemo(
    () => [
      {
        key: "title",
        header: "Activity",
        render: (activity: Activity) => (
          <div>
            <p className="font-semibold text-white">{activity.title}</p>
            <p className="text-xs text-slate-400">{activity.description}</p>
          </div>
        ),
      },
      {
        key: "course",
        header: "Course",
        render: (activity: Activity) => (
          <span className="text-xs text-slate-400">{activity.course_id ?? "Unassigned"}</span>
        ),
      },
      {
        key: "assignee",
        header: "Assigned user",
        render: (activity: Activity) => {
          const user = users.find((entry) => entry.id === activity.user_id);
          return (
            <span className="text-xs text-slate-400">
              {user?.email ?? activity.user_id ?? "Unassigned"}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (activity: Activity) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {activity.status ?? "active"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (activity: Activity) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(activity)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(activity.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const submissionColumns = useMemo(
    () => [
      {
        key: "submission",
        header: "Submission",
        render: (submission: ActivitySubmission) => (
          <div>
            <p className="font-semibold text-white">{submission.title}</p>
            <p className="text-xs text-slate-400">{submission.file_name}</p>
          </div>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (submission: ActivitySubmission) => (
          <span className="text-xs text-slate-400">{submission.user_id}</span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (submission: ActivitySubmission) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewSubmission(submission)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => handleDeleteSubmission(submission.id)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const progressRows = useMemo(() => {
    const activeEnrollments = enrollments.filter(
      (entry) => !["removed", "rejected"].includes(entry.status ?? "")
    );
    return activeEnrollments.map((enrollment) => {
      const course = courses.find((item) => item.id === enrollment.course_id);
      const courseTopics = (course?.topic_ids ?? [])
        .map((id) => topics.find((topic) => topic.id === id))
        .filter(Boolean) as Topic[];
      const completed = courseTopics.filter(
        (topic) =>
          topicProgress.find(
            (entry) => entry.user_id === enrollment.user_id && entry.topic_id === topic.id
          )?.status === "completed"
      ).length;
      const total = courseTopics.length;
      const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: enrollment.id,
        enrollment,
        course,
        completed,
        total,
        completion,
      };
    });
  }, [enrollments, courses, topics, topicProgress]);

  const progressColumns = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (row: (typeof progressRows)[number]) => {
          const profile = users.find((entry) => entry.id === row.enrollment.user_id);
          return (
            <span className="text-xs text-slate-300">
              {profile?.email ?? row.enrollment.user_id}
            </span>
          );
        },
      },
      {
        key: "course",
        header: "Course",
        render: (row: (typeof progressRows)[number]) => (
          <span className="text-xs text-slate-300">{row.course?.title ?? "Unknown course"}</span>
        ),
      },
      {
        key: "status",
        header: "Enrollment",
        render: (row: (typeof progressRows)[number]) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {row.enrollment.status ?? "pending"}
          </span>
        ),
      },
      {
        key: "progress",
        header: "Progress",
        render: (row: (typeof progressRows)[number]) => (
          <span className="text-xs text-slate-300">
            {row.completed}/{row.total} ({row.completion}%)
          </span>
        ),
      },
    ],
    [progressRows, users]
  );

  const pendingCompletionRequests = useMemo(
    () => completionRequests.filter((request) => request.status === "pending"),
    [completionRequests]
  );

  const completionColumns = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (request: TopicCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {users.find((entry) => entry.id === request.user_id)?.email ?? request.user_id}
          </span>
        ),
      },
      {
        key: "course",
        header: "Course",
        render: (request: TopicCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {courses.find((course) => course.id === request.course_id)?.title ?? "Unassigned"}
          </span>
        ),
      },
      {
        key: "topic",
        header: "Topic",
        render: (request: TopicCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {topics.find((topic) => topic.id === request.topic_id)?.title ?? request.topic_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (request: TopicCompletionRequest) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {request.status ?? "pending"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (request: TopicCompletionRequest) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewProof(request)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => handleApproveRequest(request)}
              disabled={request.status === "approved" || saving}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => handleRejectRequest(request)}
              disabled={request.status === "rejected" || saving}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    [users, courses, topics, saving]
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading activities...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-white">Course progress</h2>
          <p className="text-sm text-slate-300">Track enrollment progress by user.</p>
        </div>
        <DataTable
          columns={progressColumns}
          data={progressRows}
          emptyMessage="No enrollments available."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">Activities</h2>
          <p className="text-sm text-slate-300">
            Create activities and review submitted artifacts.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
        >
          New activity
        </button>
      </div>

      <DataTable columns={activityColumns} data={activities} emptyMessage="No activities yet." />

      <div>
        <h3 className="font-display text-xl text-white">Submissions</h3>
        <p className="text-sm text-slate-400">Review files uploaded by learners.</p>
        <div className="mt-4">
          <DataTable
            columns={submissionColumns}
            data={submissions}
            emptyMessage="No submissions yet."
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-display text-xl text-white">Completion proofs</h3>
          <p className="text-sm text-slate-400">
            Review user proof uploads before marking topics complete.
          </p>
        </div>
        <DataTable
          columns={completionColumns}
          data={pendingCompletionRequests}
          emptyMessage="No completion proofs yet."
        />
      </div>

      {actionError && <p className="text-xs text-rose-200">{actionError}</p>}
      {viewError && <p className="text-xs text-rose-200">{viewError}</p>}

      <Modal
        isOpen={isFormOpen}
        title={selectedActivity ? "Edit activity" : "Create activity"}
        onClose={() => setIsFormOpen(false)}
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
              className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Title
            <input
              type="text"
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Description
            <textarea
              value={formState.description}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Course
            <select
              value={formState.course_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, course_id: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="">Unassigned</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Assign to user
            <select
              value={formState.user_id}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, user_id: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="">All users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Status
            <select
              value={formState.status}
              onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>
        {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
      </Modal>
    </div>
  );
};

export default ActivitiesSection;
