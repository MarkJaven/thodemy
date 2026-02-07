import { useEffect, useMemo, useRef, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { useUser } from "../../../hooks/useUser";
import { superAdminService } from "../../../services/superAdminService";
import { topicSubmissionService } from "../../../services/topicSubmissionService";
import type {
  Activity,
  ActivitySubmission,
  AdminUser,
  Course,
  CourseCompletionRequest,
  Enrollment,
  LearningPath,
  LearningPathEnrollment,
  Topic,
  TopicProgress,
  TopicSubmission,
} from "../../../types/superAdmin";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeUrl = (value: string) =>
  value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

type ActivitiesSectionProps = {
  focusSubmissionId?: string | null;
  focusSection?:
    | "topic_submissions"
    | "course_completion"
    | "learning_path_enrollments"
    | "course_enrollments"
    | null;
  onFocusHandled?: () => void;
  variant?: "full" | "approvals";
};

const ActivitiesSection = ({
  focusSubmissionId = null,
  focusSection = null,
  onFocusHandled,
  variant = "full",
}: ActivitiesSectionProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [learningPathEnrollments, setLearningPathEnrollments] = useState<
    LearningPathEnrollment[]
  >([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [topicSubmissions, setTopicSubmissions] = useState<TopicSubmission[]>([]);
  const [courseCompletionRequests, setCourseCompletionRequests] = useState<
    CourseCompletionRequest[]
  >([]);
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
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<string | null>(null);
  const [updatingLPEnrollmentId, setUpdatingLPEnrollmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<TopicSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedProjectSubmission, setSelectedProjectSubmission] =
    useState<ActivitySubmission | null>(null);
  const [viewingSubmission, setViewingSubmission] = useState<ActivitySubmission | null>(null);
  const [projectStatus, setProjectStatus] = useState("pending");
  const [projectScore, setProjectScore] = useState("");
  const [projectReviewNotes, setProjectReviewNotes] = useState("");
  const [reviewingSubmission, setReviewingSubmission] = useState(false);
  const [submissionFilters, setSubmissionFilters] = useState({
    status: "pending",
    topicId: "",
    userId: "",
    from: "",
    to: "",
  });
  const { user } = useUser();
  const topicSubmissionsRef = useRef<HTMLDivElement | null>(null);
  const courseProofsRef = useRef<HTMLDivElement | null>(null);
  const learningPathEnrollmentsRef = useRef<HTMLDivElement | null>(null);
  const courseEnrollmentsRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        activityData,
        submissionData,
        courseData,
        learningPathData,
        userData,
        enrollmentData,
        learningPathEnrollmentData,
        topicData,
        topicProgressData,
        courseCompletionData,
      ] = await Promise.all([
        superAdminService.listActivities(),
        superAdminService.listActivitySubmissions(),
        superAdminService.listCourses(),
        superAdminService.listLearningPaths(),
        superAdminService.listUsers(),
        superAdminService.listEnrollments(),
        superAdminService.listLearningPathEnrollments(),
        superAdminService.listTopics(),
        superAdminService.listTopicProgress(),
        superAdminService.listCourseCompletionRequests(),
      ]);
      setActivities(activityData);
      setSubmissions(submissionData);
      setCourses(courseData);
      setLearningPaths(learningPathData);
      setUsers(userData);
      setEnrollments(enrollmentData);
      setLearningPathEnrollments(learningPathEnrollmentData);
      setTopics(topicData);
      setTopicProgress(topicProgressData);
      setCourseCompletionRequests(courseCompletionData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  };

  const loadTopicSubmissions = async () => {
    setSubmissionsLoading(true);
    setSubmissionError(null);
    try {
      const data = await topicSubmissionService.listSubmissions({
        status: submissionFilters.status || undefined,
        topicId: submissionFilters.topicId || undefined,
        userId: submissionFilters.userId || undefined,
        from: submissionFilters.from || undefined,
        to: submissionFilters.to || undefined,
      });
      setTopicSubmissions(data);
    } catch (loadError) {
      setSubmissionError(
        loadError instanceof Error ? loadError.message : "Unable to load submissions."
      );
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTopicSubmissions();
  }, [submissionFilters]);

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
      setActionError(saveError instanceof Error ? saveError.message : "Unable to save project.");
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
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete project.");
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

  const openProjectReview = (submission: ActivitySubmission) => {
    setSelectedProjectSubmission(submission);
    setProjectStatus(submission.status ?? "pending");
    setProjectScore(
      submission.score !== null && submission.score !== undefined ? String(submission.score) : ""
    );
    setProjectReviewNotes(submission.review_notes ?? "");
    setActionError(null);
  };

  const handleProjectReviewSave = async () => {
    if (!selectedProjectSubmission) return;
    setSaving(true);
    setActionError(null);
    const normalizedScore = projectScore.trim();
    const scoreValue = normalizedScore === "" ? null : Number(normalizedScore);
    if (scoreValue !== null && Number.isNaN(scoreValue)) {
      setActionError("Score must be a number.");
      setSaving(false);
      return;
    }
    const now = new Date().toISOString();
    try {
      await superAdminService.updateActivitySubmission(selectedProjectSubmission.id, {
        status: projectStatus,
        score: scoreValue,
        review_notes: projectReviewNotes.trim() || null,
        reviewed_by: user?.id ?? null,
        reviewed_at: projectStatus !== "pending" || scoreValue !== null ? now : null,
      });
      setSelectedProjectSubmission(null);
      await loadData();
    } catch (reviewError) {
      setActionError(
        reviewError instanceof Error ? reviewError.message : "Unable to update project."
      );
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

  const handleViewCourseProof = async (request: CourseCompletionRequest) => {
    setViewError(null);
    try {
      const url = await superAdminService.getCourseProofUrl(request.storage_path);
      if (!url) {
        setViewError("No file available for this proof.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (loadError) {
      setViewError(loadError instanceof Error ? loadError.message : "Unable to open proof file.");
    }
  };

  const handleViewTopicSubmission = async (submission: TopicSubmission) => {
    setViewError(null);
    try {
      const url = await topicSubmissionService.getSubmissionFileUrl(submission.id);
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

  const openSubmissionReview = (submission: TopicSubmission) => {
    setSelectedSubmission(submission);
    setReviewNotes(submission.review_notes ?? "");
    setActionError(null);
  };

  useEffect(() => {
    if (!focusSection) return;
    const target =
      focusSection === "topic_submissions"
        ? topicSubmissionsRef.current
        : focusSection === "course_completion"
        ? courseProofsRef.current
        : focusSection === "learning_path_enrollments"
        ? learningPathEnrollmentsRef.current
        : focusSection === "course_enrollments"
        ? courseEnrollmentsRef.current
        : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (onFocusHandled && !focusSubmissionId) {
      onFocusHandled();
    }
  }, [focusSection, focusSubmissionId, onFocusHandled]);

  useEffect(() => {
    if (!focusSubmissionId || submissionsLoading) return;
    const match = topicSubmissions.find((submission) => submission.id === focusSubmissionId);
    if (!match) return;
    openSubmissionReview(match);
    if (topicSubmissionsRef.current) {
      topicSubmissionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (onFocusHandled) {
      onFocusHandled();
    }
  }, [focusSubmissionId, submissionsLoading, topicSubmissions, onFocusHandled]);

  const handleSubmissionAction = async (
    status: "completed" | "rejected" | "in_progress"
  ) => {
    if (!selectedSubmission) return;
    setReviewingSubmission(true);
    setActionError(null);
    try {
      await topicSubmissionService.updateSubmissionStatus(selectedSubmission.id, {
        status,
        review_notes: reviewNotes.trim() || undefined,
      });
      setSelectedSubmission(null);
      setReviewNotes("");
      await loadTopicSubmissions();
    } catch (updateError) {
      setActionError(
        updateError instanceof Error ? updateError.message : "Unable to update submission."
      );
    } finally {
      setReviewingSubmission(false);
    }
  };

  const handleApproveCourseRequest = async (request: CourseCompletionRequest) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateCourseCompletionRequest(request.id, {
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
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

  const handleRejectCourseRequest = async (request: CourseCompletionRequest) => {
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.updateCourseCompletionRequest(request.id, {
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

  const handleEnrollmentAction = async (enrollmentId: string, status: string) => {
    setUpdatingEnrollmentId(enrollmentId);
    setActionError(null);
    try {
      await superAdminService.updateEnrollmentStatus(enrollmentId, { status });
      setEnrollments((prev) =>
        prev.map((entry) =>
          entry.id === enrollmentId ? { ...entry, status } : entry
        )
      );
    } catch (updateError) {
      setActionError(
        updateError instanceof Error ? updateError.message : "Unable to update enrollment."
      );
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleLearningPathEnrollmentAction = async (
    enrollmentId: string,
    status: string
  ) => {
    setUpdatingLPEnrollmentId(enrollmentId);
    setActionError(null);
    try {
      await superAdminService.updateLearningPathEnrollmentStatus(enrollmentId, status);
      setLearningPathEnrollments((prev) =>
        prev.map((entry) =>
          entry.id === enrollmentId ? { ...entry, status } : entry
        )
      );
    } catch (updateError) {
      setActionError(
        updateError instanceof Error ? updateError.message : "Unable to update enrollment."
      );
    } finally {
      setUpdatingLPEnrollmentId(null);
    }
  };

  const learningPathEnrollmentRows = useMemo(
    () =>
      learningPathEnrollments.map((enrollment) => ({
        enrollment,
        user: users.find((entry) => entry.id === enrollment.user_id),
        learningPath: learningPaths.find(
          (entry) => entry.id === enrollment.learning_path_id
        ),
      })),
    [learningPathEnrollments, users, learningPaths]
  );

  const learningPathEnrollmentColumns = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (row: (typeof learningPathEnrollmentRows)[number]) => (
          <span className="text-xs text-slate-300">
            {row.user?.email ?? row.enrollment.user_id}
          </span>
        ),
      },
      {
        key: "learningPath",
        header: "Learning Path",
        render: (row: (typeof learningPathEnrollmentRows)[number]) => (
          <span className="text-xs text-slate-300">
            {row.learningPath?.title ?? row.enrollment.learning_path_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: (typeof learningPathEnrollmentRows)[number]) => {
          const status = row.enrollment.status ?? "pending";
          const statusConfig: Record<string, string> = {
            pending: "badge-warning",
            approved: "badge-success",
            active: "badge-success",
            enrolled: "badge-success",
            rejected: "badge-error",
            removed: "badge-default",
          };
          return (
            <span className={statusConfig[status] || "badge-default"}>
              {status}
            </span>
          );
        },
      },
      {
        key: "date",
        header: "Enrolled",
        render: (row: (typeof learningPathEnrollmentRows)[number]) => (
          <span className="text-xs text-slate-400">
            {formatDate(row.enrollment.enrolled_at ?? row.enrollment.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row: (typeof learningPathEnrollmentRows)[number]) => {
          const status = row.enrollment.status ?? "pending";
          const isPending = status === "pending";
          const isActive = ["approved", "active", "enrolled"].includes(status);
          const isUpdating = updatingLPEnrollmentId === row.enrollment.id;
          if (!isPending && !isActive) return null;
          return (
            <div className="flex flex-wrap items-center gap-2">
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleLearningPathEnrollmentAction(row.enrollment.id, "approved")
                    }
                    disabled={isUpdating}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Accept"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleLearningPathEnrollmentAction(row.enrollment.id, "rejected")
                    }
                    disabled={isUpdating}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Reject"}
                  </button>
                </>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() =>
                    handleLearningPathEnrollmentAction(row.enrollment.id, "removed")
                  }
                  disabled={isUpdating}
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {isUpdating ? "Removing..." : "Kick"}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [learningPathEnrollmentRows, updatingLPEnrollmentId, handleLearningPathEnrollmentAction]
  );

  const activityColumns = useMemo(
    () => [
      {
        key: "title",
        header: "Project",
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
        render: (activity: Activity) => {
          const status = activity.status ?? "active";
          const statusConfig: Record<string, string> = {
            active: "badge-success",
            archived: "badge-warning",
          };
          return (
            <span className={statusConfig[status] || "badge-default"}>
              {status}
            </span>
          );
        },
      },
      {
        key: "actions",
        header: "Actions",
        render: (activity: Activity) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(activity)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(activity.id)}
              className="btn-danger flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
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
        header: "Project submission",
        render: (submission: ActivitySubmission) => (
          <p className="font-semibold text-white">{submission.title}</p>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (submission: ActivitySubmission) => {
          const submitter = users.find((entry) => entry.id === submission.user_id);
          return (
            <span className="text-xs text-slate-300">
              {submitter?.email ?? submission.user_id}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (submission: ActivitySubmission) => {
          const status = submission.status ?? "pending";
          const statusStyles: Record<string, string> = {
            pending: "badge-warning",
            in_progress: "badge-info",
            completed: "badge-success",
            resubmit: "badge-warning",
            rejected: "badge-error",
          };
          return <span className={statusStyles[status] || "badge-default"}>{status}</span>;
        },
      },
      {
        key: "score",
        header: "Score",
        render: (submission: ActivitySubmission) => (
          <span className="text-xs text-slate-300">
            {submission.score ?? "--"}
          </span>
        ),
      },
      {
        key: "submitted",
        header: "Submitted",
        render: (submission: ActivitySubmission) => (
          <span className="text-xs text-slate-400">
            {formatDate(submission.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (submission: ActivitySubmission) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewingSubmission(submission)}
              className="btn-ghost flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View
            </button>
            <button
              type="button"
              onClick={() => openProjectReview(submission)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Grade
            </button>
            <button
              type="button"
              onClick={() => handleDeleteSubmission(submission.id)}
              className="btn-danger flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [handleViewSubmission, openProjectReview]
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
        render: (row: (typeof progressRows)[number]) => {
          const status = row.enrollment.status ?? "pending";
          const statusConfig: Record<string, string> = {
            pending: "badge-warning",
            approved: "badge-success",
            active: "badge-success",
            enrolled: "badge-success",
            rejected: "badge-error",
            removed: "badge-default",
          };
          return (
            <span className={statusConfig[status] || "badge-default"}>
              {status}
            </span>
          );
        },
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
      {
        key: "actions",
        header: "Actions",
        render: (row: (typeof progressRows)[number]) => {
          const status = row.enrollment.status ?? "pending";
          const isPending = status === "pending";
          const isActive = ["approved", "active", "enrolled"].includes(status);
          const isUpdating = updatingEnrollmentId === row.enrollment.id;
          if (!isPending && !isActive) return null;
          return (
            <div className="flex flex-wrap items-center gap-2">
              {isPending && (
                <>
                  <button
                    type="button"
                    onClick={() => handleEnrollmentAction(row.enrollment.id, "approved")}
                    disabled={isUpdating}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnrollmentAction(row.enrollment.id, "rejected")}
                    disabled={isUpdating}
                    className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Reject"}
                  </button>
                </>
              )}
              {isActive && (
                <button
                  type="button"
                  onClick={() => handleEnrollmentAction(row.enrollment.id, "removed")}
                  disabled={isUpdating}
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {isUpdating ? "Removing..." : "Kick"}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [progressRows, users, updatingEnrollmentId]
  );

  const topicSubmissionRows = useMemo(
    () =>
      topicSubmissions.map((submission) => ({
        submission,
        topic: topics.find((entry) => entry.id === submission.topic_id),
        user: users.find((entry) => entry.id === submission.user_id),
      })),
    [topicSubmissions, topics, users]
  );

  const topicSubmissionColumns = useMemo(
    () => [
      {
        key: "topic",
        header: "Topic",
        render: (row: (typeof topicSubmissionRows)[number]) => (
          <div>
            <p className="font-semibold text-white">
              {row.topic?.title ?? row.submission.topic_id}
            </p>
            {row.submission.message && (
              <p className="text-xs text-slate-400">{row.submission.message}</p>
            )}
          </div>
        ),
      },
      {
        key: "user",
        header: "User",
        render: (row: (typeof topicSubmissionRows)[number]) => (
          <span className="text-xs text-slate-300">
            {row.user?.email ?? row.submission.user_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row: (typeof topicSubmissionRows)[number]) => {
          const status = row.submission.status ?? "pending";
          const statusConfig: Record<string, string> = {
            pending: "badge-warning",
            in_progress: "badge-info",
            completed: "badge-success",
            rejected: "badge-error",
          };
          return (
            <span className={statusConfig[status] || "badge-default"}>
              {status}
            </span>
          );
        },
      },
      {
        key: "submitted",
        header: "Submitted",
        render: (row: (typeof topicSubmissionRows)[number]) => (
          <span className="text-xs text-slate-400">
            {formatDate(row.submission.submitted_at ?? row.submission.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row: (typeof topicSubmissionRows)[number]) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewTopicSubmission(row.submission)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => openSubmissionReview(row.submission)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-200"
            >
              Review
            </button>
          </div>
        ),
      },
    ],
    [topicSubmissionRows]
  );

  const pendingCourseCompletionRequests = useMemo(
    () => courseCompletionRequests.filter((request) => request.status === "pending"),
    [courseCompletionRequests]
  );

  const courseCompletionColumns = useMemo(
    () => [
      {
        key: "user",
        header: "User",
        render: (request: CourseCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {users.find((entry) => entry.id === request.user_id)?.email ?? request.user_id}
          </span>
        ),
      },
      {
        key: "learningPath",
        header: "Learning Path",
        render: (request: CourseCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {learningPaths.find((path) => path.id === request.learning_path_id)?.title ??
              request.learning_path_id}
          </span>
        ),
      },
      {
        key: "course",
        header: "Course",
        render: (request: CourseCompletionRequest) => (
          <span className="text-xs text-slate-300">
            {courses.find((course) => course.id === request.course_id)?.title ?? request.course_id}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (request: CourseCompletionRequest) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {request.status ?? "pending"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (request: CourseCompletionRequest) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewCourseProof(request)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              View
            </button>
            <button
              type="button"
              onClick={() => handleApproveCourseRequest(request)}
              disabled={request.status === "approved" || saving}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => handleRejectCourseRequest(request)}
              disabled={request.status === "rejected" || saving}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    [users, courses, learningPaths, saving]
  );

  if (loading) {
    return <p className="text-sm text-slate-400">Loading projects...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div ref={learningPathEnrollmentsRef} className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-white">Learning path enrollments</h2>
          <p className="text-sm text-slate-300">
            Review users who requested access via learning path code.
          </p>
        </div>
        <DataTable
          columns={learningPathEnrollmentColumns}
          data={learningPathEnrollmentRows}
          emptyMessage="No learning path enrollment requests yet."
        />
      </div>

      <div ref={courseEnrollmentsRef} className="space-y-4">
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

      {variant === "full" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-white">Projects</h2>
              <p className="text-sm text-slate-300">
                Create projects and review submitted artifacts.
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
              New Project
            </button>
          </div>

          <DataTable columns={activityColumns} data={activities} emptyMessage="No projects yet." />

          <div>
            <h3 className="font-display text-xl text-white">Project submissions</h3>
            <p className="text-sm text-slate-400">Review files uploaded by learners.</p>
            <div className="mt-4">
              <DataTable
                columns={submissionColumns}
                data={submissions}
                emptyMessage="No submissions yet."
              />
            </div>
          </div>
        </>
      )}

      <div ref={topicSubmissionsRef} className="space-y-3">
        <div>
          <h3 className="font-display text-xl text-white">Topic submissions</h3>
          <p className="text-sm text-slate-400">
            Review learner-uploaded certificates and mark completion status.
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300 md:grid-cols-5">
          <label className="flex flex-col gap-2">
            Status
            <select
              value={submissionFilters.status}
              onChange={(event) =>
                setSubmissionFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-white"
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            Topic
            <select
              value={submissionFilters.topicId}
              onChange={(event) =>
                setSubmissionFilters((prev) => ({ ...prev, topicId: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-white"
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            User
            <select
              value={submissionFilters.userId}
              onChange={(event) =>
                setSubmissionFilters((prev) => ({ ...prev, userId: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-white"
            >
              <option value="">All users</option>
              {users.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.email ?? entry.id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            From
            <input
              type="date"
              value={submissionFilters.from}
              onChange={(event) =>
                setSubmissionFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-white"
            />
          </label>
          <label className="flex flex-col gap-2">
            To
            <input
              type="date"
              value={submissionFilters.to}
              onChange={(event) =>
                setSubmissionFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-ink-800/60 px-3 py-2 text-xs text-white"
            />
          </label>
        </div>
        {submissionsLoading ? (
          <p className="text-sm text-slate-400">Loading submissions...</p>
        ) : (
          <DataTable
            columns={topicSubmissionColumns}
            data={topicSubmissionRows}
            emptyMessage="No topic submissions yet."
          />
        )}
        {submissionError && <p className="text-xs text-rose-200">{submissionError}</p>}
      </div>

      <div ref={courseProofsRef} className="space-y-3">
        <div>
          <h3 className="font-display text-xl text-white">Course completion proofs</h3>
          <p className="text-sm text-slate-400">
            Review uploaded course proofs before unlocking the next course.
          </p>
        </div>
        <DataTable
          columns={courseCompletionColumns}
          data={pendingCourseCompletionRequests}
          emptyMessage="No course proofs yet."
        />
      </div>

      {actionError && <p className="text-xs text-rose-200">{actionError}</p>}
      {viewError && <p className="text-xs text-rose-200">{viewError}</p>}

      <Modal
        isOpen={Boolean(selectedProjectSubmission)}
        title="Review project submission"
        description="Approve and grade the learner's project submission."
        onClose={() => (saving ? null : setSelectedProjectSubmission(null))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedProjectSubmission(null)}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleProjectReviewSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save review"}
            </button>
          </>
        }
      >
        {selectedProjectSubmission && (
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Project</p>
              <p className="font-semibold text-white">{selectedProjectSubmission.title}</p>
            </div>
            {selectedProjectSubmission.github_url && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">GitHub</p>
                <a
                  href={normalizeUrl(selectedProjectSubmission.github_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-purple hover:underline"
                >
                  {selectedProjectSubmission.github_url}
                </a>
              </div>
            )}
            {selectedProjectSubmission.description && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Description</p>
                <p>{selectedProjectSubmission.description}</p>
              </div>
            )}
            {selectedProjectSubmission.storage_path && (
              <button
                type="button"
                onClick={() => handleViewSubmission(selectedProjectSubmission)}
                className="btn-ghost"
              >
                View file
              </button>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Status
                <select
                  value={projectStatus}
                  onChange={(event) => setProjectStatus(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                >
                  <option value="pending">pending</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="resubmit">resubmit</option>
                  <option value="rejected">rejected</option>
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Score
                <input
                  type="number"
                  value={projectScore}
                  onChange={(event) => setProjectScore(event.target.value)}
                  placeholder="Enter score"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
            </div>
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Review notes
              <textarea
                rows={3}
                value={projectReviewNotes}
                onChange={(event) => setProjectReviewNotes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white"
              />
            </label>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(viewingSubmission)}
        title="Submission details"
        description="View the learner's project submission."
        onClose={() => setViewingSubmission(null)}
        footer={
          <button
            type="button"
            onClick={() => setViewingSubmission(null)}
            className="btn-secondary"
          >
            Close
          </button>
        }
      >
        {viewingSubmission && (
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Project</p>
              <p className="font-semibold text-white">{viewingSubmission.title}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Submitted by</p>
                <p className="text-white">
                  {users.find((entry) => entry.id === viewingSubmission.user_id)?.email ??
                    viewingSubmission.user_id}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Date</p>
                <p>{formatDate(viewingSubmission.created_at)}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
                <span
                  className={`mt-1 inline-block ${
                    {
                      pending: "badge-warning",
                      in_progress: "badge-info",
                      completed: "badge-success",
                      rejected: "badge-error",
                      resubmit: "badge-warning",
                    }[viewingSubmission.status ?? "pending"] || "badge-default"
                  }`}
                >
                  {viewingSubmission.status ?? "pending"}
                </span>
              </div>
              {(viewingSubmission.score !== null && viewingSubmission.score !== undefined) && (
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Score</p>
                  <p className="text-white">{viewingSubmission.score}</p>
                </div>
              )}
            </div>
            {viewingSubmission.description && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{viewingSubmission.description}</p>
              </div>
            )}
            {viewingSubmission.github_url && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">GitHub link</p>
                <a
                  href={normalizeUrl(viewingSubmission.github_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-accent-purple hover:underline"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                  </svg>
                  {viewingSubmission.github_url}
                </a>
              </div>
            )}
            {viewingSubmission.file_name && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Uploaded file</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
                    {viewingSubmission.file_name}
                  </span>
                  {viewingSubmission.storage_path && (
                    <button
                      type="button"
                      onClick={() => handleViewSubmission(viewingSubmission)}
                      className="btn-ghost flex items-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                        <path d="M15 3h6v6" />
                        <path d="M10 14L21 3" />
                      </svg>
                      View file
                    </button>
                  )}
                </div>
              </div>
            )}
            {viewingSubmission.review_notes && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Admin feedback</p>
                <p className="mt-1 whitespace-pre-wrap">{viewingSubmission.review_notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isFormOpen}
        title={selectedActivity ? "Edit project" : "Create project"}
        onClose={() => setIsFormOpen(false)}
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
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Project"
              )}
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

      <Modal
        isOpen={Boolean(selectedSubmission)}
        title="Review topic submission"
        description="Verify the learner's proof and update their completion status."
        onClose={() => (reviewingSubmission ? null : setSelectedSubmission(null))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelectedSubmission(null)}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSubmissionAction("in_progress")}
              disabled={reviewingSubmission}
              className="btn-ghost"
            >
              {reviewingSubmission ? "Saving..." : "Request info"}
            </button>
            <button
              type="button"
              onClick={() => handleSubmissionAction("rejected")}
              disabled={reviewingSubmission}
              className="btn-danger"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => handleSubmissionAction("completed")}
              disabled={reviewingSubmission}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
            >
              Mark completed
            </button>
          </>
        }
      >
        {selectedSubmission && (
          <div className="space-y-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Topic</p>
                <p className="font-semibold text-white">
                  {topics.find((t) => t.id === selectedSubmission.topic_id)?.title ??
                    selectedSubmission.topic_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleViewTopicSubmission(selectedSubmission)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white"
              >
                View file
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">User</p>
                <p>
                  {users.find((u) => u.id === selectedSubmission.user_id)?.email ??
                    selectedSubmission.user_id}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Submitted</p>
                <p>{formatDate(selectedSubmission.submitted_at ?? selectedSubmission.created_at)}</p>
              </div>
            </div>
            {selectedSubmission.message && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Message</p>
                <p>{selectedSubmission.message}</p>
              </div>
            )}
            <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Review notes
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white"
              />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ActivitiesSection;
