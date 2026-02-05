import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormList from "../components/dashboard/FormList";
import Navbar from "../components/dashboard/Navbar";
import ProfileModal from "../components/auth/ProfileModal";
import ProfileSetupModal from "../components/auth/ProfileSetupModal";
import QuizList from "../components/dashboard/QuizList";
import TabShell, { TabDefinition, TabKey } from "../components/dashboard/TabShell";
import UploadWidget from "../components/dashboard/UploadWidget";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useTopicsData } from "../hooks/useTopicsData";
import { useUser } from "../hooks/useUser";
import { supabase } from "../lib/supabaseClient";
import { dashboardApi } from "../services/dashboardApi";
import type {
  Activity,
  Course,
  LearningPath,
  LearningPathEnrollment,
  QuizAttempt,
  QuizScore,
  Topic,
  TopicProgress,
  TopicSubmission,
  Quiz,
} from "../types/dashboard";

const tabs: TabDefinition[] = [
  { key: "enroll", label: "Enroll Learning Path" },
  { key: "track", label: "Track Courses" },
  { key: "activity", label: "Activity" },
  { key: "quiz", label: "Quiz" },
  { key: "forms", label: "Forms" },
];

const SkeletonCard = () => (
  <div className="h-36 rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(10,8,18,0.35)]">
    <div className="h-full animate-pulse rounded-2xl bg-white/5" />
  </div>
);

type LearningPathCardProps = {
  path: LearningPath;
  enrollment?: LearningPathEnrollment | null;
  onDelete?: () => void;
  deleting?: boolean;
};

const LearningPathCard = ({ path, enrollment, onDelete, deleting }: LearningPathCardProps) => {
  const enrollmentLabel = enrollment?.status
    ? enrollment.status.replace(/_/g, " ")
    : null;
  const statusLabel = path.status ? path.status.replace(/_/g, " ") : "draft";
  const courseCount = path.course_ids?.length ?? 0;
  const totalHours =
    path.total_hours ?? (path.total_days ? path.total_days * 8 : null);
  const totalDays = path.total_days ?? (totalHours ? Math.ceil(totalHours / 8) : null);
  const canDelete = Boolean(
    onDelete && ["rejected", "removed"].includes(enrollment?.status ?? "")
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_40px_rgba(10,8,18,0.35)]">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Learning Path
          </p>
          <h3 className="mt-2 font-display text-xl text-white">{path.title}</h3>
        </div>
        <p className="text-sm text-slate-300">{path.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 px-3 py-1">
            {courseCount} course{courseCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            {totalHours ? `${totalHours}h` : "Self paced"}
          </span>
          {totalDays ? (
            <span className="rounded-full border border-white/10 px-3 py-1">
              {totalDays} day{totalDays === 1 ? "" : "s"}
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
            {statusLabel}
          </span>
          {enrollmentLabel && (
            <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.2em]">
              {enrollmentLabel}
            </span>
          )}
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
          >
            {deleting ? "Removing..." : "Remove request"}
          </button>
        )}
      </div>
    </div>
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getSubmissionTimestamp = (submission?: TopicSubmission | null) => {
  if (!submission) return 0;
  const stamp = submission.submitted_at ?? submission.created_at ?? null;
  if (!stamp) return 0;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getTopicStatusLabel = (
  progress?: TopicProgress | null,
  submission?: TopicSubmission | null
) => {
  if (submission?.status === "completed" || progress?.status === "completed") {
    return "Completed";
  }
  if (submission?.status === "pending") return "Pending Review";
  if (submission?.status === "in_progress") return "Needs Info";
  if (submission?.status === "rejected") return "Rejected";
  if (progress?.status === "in_progress") return "In Progress";
  return "Not Started";
};

const topicStatusStyles: Record<string, string> = {
  Completed: "border-emerald-400/40 text-emerald-200",
  "Pending Review": "border-amber-400/40 text-amber-200",
  "Needs Info": "border-sky-400/40 text-sky-200",
  Rejected: "border-rose-400/40 text-rose-200",
  "In Progress": "border-white/10 text-slate-200",
  "Not Started": "border-white/10 text-slate-400",
};

const Dashboard = () => {
  const { user, isLoading: userLoading, verified } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useDashboardData(user?.id);
  const {
    data: topicsData,
    loading: topicsLoading,
    error: topicsError,
    refresh: refreshTopics,
  } = useTopicsData(user?.id);
  const [activeTab, setActiveTab] = useState<TabKey>("enroll");

  // Redirect to auth page if not logged in or not verified
  useEffect(() => {
    if (!userLoading && (!user || !verified)) {
      navigate("/auth/login", { replace: true });
    }
  }, [user, userLoading, verified, navigate]);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !supabase) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setProfile(data);
        if (!data.profile_setup_completed) {
          setIsProfileSetupOpen(true);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const [activityEntries, setActivityEntries] = useState<Activity[]>([]);
  const [quizScoreEntries, setQuizScoreEntries] = useState<QuizScore[]>([]);
  const [quizAttemptEntries, setQuizAttemptEntries] = useState<QuizAttempt[]>([]);
  const [enrollmentEntries, setEnrollmentEntries] = useState(data.enrollments);
  const [learningPathEnrollmentEntries, setLearningPathEnrollmentEntries] = useState<
    LearningPathEnrollment[]
  >(data.learningPathEnrollments);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [quizStatusError, setQuizStatusError] = useState<string | null>(null);
  const [learningPathEnrollError, setLearningPathEnrollError] = useState<string | null>(null);
  const [learningPathEnrollSuccess, setLearningPathEnrollSuccess] = useState<string | null>(null);
  const [learningPathCode, setLearningPathCode] = useState("");
  const [learningPathDeleteError, setLearningPathDeleteError] = useState<string | null>(null);
  const [deleteActivityError, setDeleteActivityError] = useState<string | null>(null);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [startingLearningPathId, setStartingLearningPathId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollingLearningPathId, setEnrollingLearningPathId] = useState<string | null>(
    null
  );
  const [deletingLearningPathEnrollmentId, setDeletingLearningPathEnrollmentId] = useState<
    string | null
  >(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [completingQuizId, setCompletingQuizId] = useState<string | null>(null);
  const [isTopicProofOpen, setIsTopicProofOpen] = useState(false);
  const [proofTopic, setProofTopic] = useState<Topic | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    setActivityEntries(data.activities);
  }, [data.activities]);

  useEffect(() => {
    setQuizScoreEntries(data.quizScores);
  }, [data.quizScores]);

  useEffect(() => {
    setQuizAttemptEntries(data.quizAttempts);
  }, [data.quizAttempts]);

  useEffect(() => {
    setEnrollmentEntries(data.enrollments);
  }, [data.enrollments]);

  useEffect(() => {
    setLearningPathEnrollmentEntries(data.learningPathEnrollments);
  }, [data.learningPathEnrollments]);

  const courseLookup = useMemo(
    () => new Map(data.courses.map((course) => [course.id, course])),
    [data.courses]
  );

  const topicLookup = useMemo(
    () => new Map(topicsData.topics.map((topic) => [topic.id, topic])),
    [topicsData.topics]
  );

  const progressLookup = useMemo(
    () => new Map(topicsData.topicProgress.map((entry) => [entry.topic_id, entry])),
    [topicsData.topicProgress]
  );

  const topicSubmissionLookup = useMemo(() => {
    const map = new Map<string, TopicSubmission>();
    topicsData.topicSubmissions.forEach((submission) => {
      const existing = map.get(submission.topic_id);
      if (!existing) {
        map.set(submission.topic_id, submission);
        return;
      }
      if (getSubmissionTimestamp(submission) >= getSubmissionTimestamp(existing)) {
        map.set(submission.topic_id, submission);
      }
    });
    return map;
  }, [topicsData.topicSubmissions]);

  const learningPathEnrollmentLookup = useMemo(
    () =>
      new Map(
        learningPathEnrollmentEntries.map((entry) => [entry.learning_path_id, entry])
      ),
    [learningPathEnrollmentEntries]
  );

  const activeLearningPathIds = useMemo(
    () =>
      new Set(
        learningPathEnrollmentEntries
          .filter((entry) =>
            ["approved", "active", "completed", "enrolled"].includes(
              entry.status ?? ""
            )
          )
          .map((entry) => entry.learning_path_id)
      ),
    [learningPathEnrollmentEntries]
  );

  const startedLearningPathIds = useMemo(
    () =>
      new Set(
        learningPathEnrollmentEntries
          .filter((entry) => Boolean(entry.start_date))
          .map((entry) => entry.learning_path_id)
      ),
    [learningPathEnrollmentEntries]
  );

  const activeLearningPathCourseIds = useMemo(() => {
    const ids = new Set<string>();
    data.learningPaths.forEach((path) => {
      if (!startedLearningPathIds.has(path.id)) return;
      (path.course_ids ?? []).forEach((courseId) => ids.add(courseId));
    });
    return ids;
  }, [data.learningPaths, startedLearningPathIds]);

  const activeEnrollmentCourseIds = useMemo(() => {
    const ids = new Set<string>();
    enrollmentEntries.forEach((entry) => {
      if (
        ["pending", "approved", "active", "completed", "enrolled"].includes(
          entry.status ?? ""
        )
      ) {
        ids.add(entry.course_id);
      }
    });
    activeLearningPathCourseIds.forEach((courseId) => ids.add(courseId));
    return ids;
  }, [enrollmentEntries, activeLearningPathCourseIds]);

  const hasActiveEnrollment = activeEnrollmentCourseIds.size > 0;

  const visibleQuizzes = data.quizzes.filter((quiz) => {
    if (!hasActiveEnrollment) return false;
    const assignedMatch = !quiz.assigned_user_id || quiz.assigned_user_id === user?.id;
    const courseMatch = quiz.course_id ? activeEnrollmentCourseIds.has(quiz.course_id) : false;
    return assignedMatch && courseMatch;
  });

  const visibleForms = hasActiveEnrollment
    ? data.forms.filter((form) => form.assigned_user_id === user?.id || !form.assigned_user_id)
    : [];

  const assignedActivities = activityEntries.filter((activity) => {
    const isAssignment = !activity.file_name && !activity.file_type;
    if (!isAssignment) return false;
    const assignedToUser = activity.user_id === user?.id;
    const assignedToCourse =
      activity.course_id && activeEnrollmentCourseIds.has(activity.course_id);
    return assignedToUser || assignedToCourse;
  });

  const uploadedActivities = activityEntries.filter(
    (activity) => activity.file_name || activity.file_type
  );

  const handleStartTopic = async (topic: Topic) => {
    if (!user?.id) {
      setProgressError("You must be signed in to start a topic.");
      return;
    }
    if (progressLookup.get(topic.id)) {
      return;
    }
    setProgressError(null);
    setStartingTopicId(topic.id);
    try {
      await dashboardApi.startTopic({
        topicId: topic.id,
        userId: user.id,
        timeAllocated: Number(topic.time_allocated),
        timeUnit: topic.time_unit ?? "days",
      });
      await refreshTopics();
    } catch (startError) {
      const message =
        startError instanceof Error ? startError.message : "Unable to start the topic.";
      setProgressError(message);
    } finally {
      setStartingTopicId(null);
    }
  };

  const handleOpenTopic = (topic: Topic) => {
    if (!topic.link_url) return;
    window.open(topic.link_url, "_blank", "noopener,noreferrer");
    void handleStartTopic(topic);
  };

  const openTopicProofModal = (topic: Topic) => {
    setSubmissionSuccess(null);
    setProofTopic(topic);
    setProofFile(null);
    setProofMessage("");
    setProofError(null);
    setIsTopicProofOpen(true);
  };

  const closeTopicProofModal = () => {
    setIsTopicProofOpen(false);
    setProofTopic(null);
    setProofFile(null);
    setProofMessage("");
    setProofError(null);
  };

  const handleSubmitTopicProof = async () => {
    if (!user?.id || !proofTopic || !proofFile) {
      setProofError("Upload a JPG, PNG, or PDF certificate before submitting.");
      return;
    }
    setSubmittingProof(true);
    setProofError(null);
    try {
      await dashboardApi.submitTopicSubmission({
        topicId: proofTopic.id,
        userId: user.id,
        file: proofFile,
        message: proofMessage.trim() || undefined,
      });
      closeTopicProofModal();
      setSubmissionSuccess("Certificate submitted. Awaiting admin review.");
      await refreshTopics();
      setTimeout(() => setSubmissionSuccess(null), 4000);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to submit certificate.";
      setProofError(message);
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleStartLearningPath = async (path: LearningPath) => {
    if (!user?.id) {
      setProgressError("You must be signed in to start a learning path.");
      return;
    }
    const enrollment = learningPathEnrollmentLookup.get(path.id);
    if (!enrollment?.id) return;
    const totalDays =
      path.total_days ??
      (path.total_hours ? Math.ceil(path.total_hours / 8) : 0);
    setStartingLearningPathId(enrollment.id);
    setProgressError(null);
    try {
      const { start_date, end_date } = await dashboardApi.startLearningPathEnrollment({
        enrollmentId: enrollment.id,
        userId: user.id,
        totalDays,
      });
      setLearningPathEnrollmentEntries((prev) =>
        prev.map((entry) =>
          entry.id === enrollment.id
            ? { ...entry, start_date, end_date, status: "active" }
            : entry
        )
      );
      await refresh();
    } catch (startError) {
      const message =
        startError instanceof Error
          ? startError.message
          : "Unable to start the learning path.";
      setProgressError(message);
    } finally {
      setStartingLearningPathId(null);
    }
  };

  const handleUploadActivity = async (payload: { title: string; file: File }) => {
    setActivityError(null);
    setDeleteActivityError(null);
    setIsUploading(true);
    try {
      await dashboardApi.submitActivity({
        title: payload.title,
        fileName: payload.file.name,
        fileType: payload.file.type,
      });
      setActivityEntries((prev) => [
        {
          id: `activity-${Date.now()}`,
          user_id: user?.id ?? "demo-user",
          title: payload.title,
          file_name: payload.file.name,
          file_type: payload.file.type,
          file_url: "",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to upload activity.";
      setActivityError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCompleteQuiz = async (quiz: Quiz) => {
    if (!user?.id) {
      setQuizStatusError("You must be signed in to update quiz status.");
      return;
    }
    setQuizStatusError(null);
    setCompletingQuizId(quiz.id);
    try {
      const attempt = await dashboardApi.completeQuiz({ quizId: quiz.id, userId: user.id });
      setQuizAttemptEntries((prev) => {
        if (prev.some((entry) => entry.quiz_id === quiz.id)) {
          return prev;
        }
        return [...prev, attempt];
      });
      await refresh();
    } catch (completeError) {
      const message =
        completeError instanceof Error ? completeError.message : "Unable to update quiz status.";
      setQuizStatusError(message);
    } finally {
      setCompletingQuizId(null);
    }
  };
  const handleDeleteActivity = async (activityId: string) => {
    setDeleteActivityError(null);
    setDeletingActivityId(activityId);
    try {
      await dashboardApi.deleteActivity(activityId);
      setActivityEntries((prev) => prev.filter((entry) => entry.id !== activityId));
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete activity.";
      setDeleteActivityError(message);
    } finally {
      setDeletingActivityId(null);
    }
  };


  const handleEnrollLearningPathByCode = async () => {
    if (!user?.id) {
      setLearningPathEnrollError("You must be signed in to enroll.");
      return;
    }
    if (!learningPathCode.trim()) {
      setLearningPathEnrollError("Enter a learning path code to enroll.");
      return;
    }
    setLearningPathEnrollError(null);
    setLearningPathEnrollSuccess(null);
    setEnrollingLearningPathId(learningPathCode.trim());
    try {
      const { learningPathId } = await dashboardApi.requestLearningPathEnrollment({
        enrollmentCode: learningPathCode.trim(),
      });
      if (!learningPathId) {
        throw new Error("Unable to resolve learning path for enrollment.");
      }
      const optimistic: LearningPathEnrollment = {
        id: `lp-enroll-${Date.now()}`,
        user_id: user.id,
        learning_path_id: learningPathId,
        enrolled_at: new Date().toISOString(),
        status: "pending",
      };
      setLearningPathEnrollmentEntries((prev) => [...prev, optimistic]);
      setLearningPathEnrollSuccess("Learning path enrollment request submitted.");
      setLearningPathCode("");
      await refresh();
    } catch (enrollErr) {
      setLearningPathEnrollError(
        enrollErr instanceof Error ? enrollErr.message : "Unable to enroll."
      );
    } finally {
      setEnrollingLearningPathId(null);
    }
  };

  const handleDeleteLearningPathEnrollment = async (enrollmentId: string) => {
    setLearningPathDeleteError(null);
    setDeletingLearningPathEnrollmentId(enrollmentId);
    try {
      await dashboardApi.deleteLearningPathEnrollment(enrollmentId);
      setLearningPathEnrollmentEntries((prev) =>
        prev.filter((entry) => entry.id !== enrollmentId)
      );
    } catch (deleteError) {
      setLearningPathDeleteError(
        deleteError instanceof Error ? deleteError.message : "Unable to remove request."
      );
    } finally {
      setDeletingLearningPathEnrollmentId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/" });
  };

  const handleOpenSignOut = () => {
    setIsSignOutOpen(true);
  };

  const handleCloseSignOut = () => {
    setIsSignOutOpen(false);
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutOpen(false);
    await handleSignOut();
  };

  const renderEnrollTab = () => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={`skeleton-course-${index}`} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-rose-200">
          {error}
        </div>
      );
    }

    const learningPathById = new Map(
      data.learningPaths.map((path) => [path.id, path])
    );
    const enrolledLearningPaths = learningPathEnrollmentEntries.map((entry) => {
      const path = learningPathById.get(entry.learning_path_id);
      if (path) return path;
      return {
        id: entry.learning_path_id,
        title: "Learning Path",
        description: `ID: ${entry.learning_path_id}`,
        course_ids: [],
        total_hours: null,
        total_days: null,
        enrollment_code: null,
        status: "unavailable",
        enrollment_enabled: null,
        enrollment_limit: null,
        start_at: null,
        end_at: null,
        created_at: null,
      } as LearningPath;
    });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-xl text-white">Enroll with a learning path code</h3>
          <p className="mt-2 text-sm text-slate-400">
            Enter the learning path code shared by your admin to request enrollment.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={learningPathCode}
              onChange={(event) => setLearningPathCode(event.target.value)}
              placeholder="Enter learning path code"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleEnrollLearningPathByCode}
              disabled={Boolean(enrollingLearningPathId)}
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {enrollingLearningPathId ? "Submitting..." : "Enroll"}
            </button>
          </div>
          {(learningPathEnrollError || learningPathEnrollSuccess) && (
            <div
              className={`mt-4 rounded-2xl border px-5 py-3 text-sm ${
                learningPathEnrollError
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {learningPathEnrollError || learningPathEnrollSuccess}
            </div>
          )}
          {learningPathDeleteError && (
            <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
              {learningPathDeleteError}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={`lp-skeleton-${index}`} />
            ))}
          </div>
        ) : enrolledLearningPaths.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No learning path enrollments yet. Enter a code above to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {enrolledLearningPaths.map((path) => {
              const enrollment = learningPathEnrollmentLookup.get(path.id) ?? null;
              return (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  enrollment={enrollment}
                  onDelete={
                    enrollment?.id
                      ? () => handleDeleteLearningPathEnrollment(enrollment.id)
                      : undefined
                  }
                  deleting={deletingLearningPathEnrollmentId === enrollment?.id}
                />
              );
            })}
          </div>
        )}

        {!hasActiveEnrollment && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            Courses will appear once your learning path is approved.
          </div>
        )}
      </div>
    );
  };

  const renderTrackTab = () => {
    if (loading || topicsLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={`skeleton-track-${index}`} />
          ))}
        </div>
      );
    }

    if (topicsError) {
      return (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
          {topicsError}
        </div>
      );
    }

    const activeLearningPaths = data.learningPaths.filter((path) =>
      activeLearningPathIds.has(path.id)
    );

    if (activeLearningPaths.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No active learning paths yet. Request enrollment to start tracking progress.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {progressError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {progressError}
          </div>
        )}
        {activeLearningPaths.map((path) => {
          const enrollment = learningPathEnrollmentLookup.get(path.id);
          const hasStarted = Boolean(enrollment?.start_date);
          const canStart =
            Boolean(enrollment?.id) &&
            !enrollment?.start_date &&
            ["approved", "active"].includes(enrollment?.status ?? "");
          const pathCourses = (path.course_ids ?? [])
            .map((courseId) => courseLookup.get(courseId))
            .filter(Boolean) as Course[];
          const pathTopicIds = Array.from(
            new Set(pathCourses.flatMap((course) => course?.topic_ids ?? []).filter(Boolean))
          );
          const completedTopics = pathTopicIds.filter((topicId) => {
            const progress = progressLookup.get(topicId);
            const submission = topicSubmissionLookup.get(topicId);
            return getTopicStatusLabel(progress, submission) === "Completed";
          }).length;
          const pathCompletion =
            pathTopicIds.length > 0
              ? Math.round((completedTopics / pathTopicIds.length) * 100)
              : 0;

          let previousCourseComplete = true;

          return (
            <div
              key={`learning-path-track-${path.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                    Learning path
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">{path.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{path.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      Start: {formatDate(enrollment?.start_date)}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      Target end: {formatDate(enrollment?.end_date)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {canStart && (
                    <button
                      type="button"
                      onClick={() => handleStartLearningPath(path)}
                      disabled={startingLearningPathId === enrollment?.id}
                      className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {startingLearningPathId === enrollment?.id
                        ? "Starting..."
                        : "Start learning path"}
                    </button>
                  )}
                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                    {pathCompletion}% complete
                  </span>
                </div>
              </div>
              {!hasStarted && (
                <p className="mt-4 text-xs text-slate-400">
                  Start the learning path to unlock courses and begin tracking.
                </p>
              )}
              <div className="mt-6 space-y-5">
                {pathCourses.length === 0 ? (
                  <p className="text-sm text-slate-400">No courses assigned yet.</p>
                ) : (
                  pathCourses.map((course, courseIndex) => {
                    const topicIds = course?.topic_ids ?? [];
                    const orderedTopics = topicIds
                      .map((id) => topicLookup.get(id))
                      .filter(Boolean) as Topic[];
                    const completedCount = orderedTopics.filter((topic) => {
                      const progress = progressLookup.get(topic.id);
                      const submission = topicSubmissionLookup.get(topic.id);
                      return getTopicStatusLabel(progress, submission) === "Completed";
                    }).length;
                    const completion =
                      orderedTopics.length > 0
                        ? Math.round((completedCount / orderedTopics.length) * 100)
                        : 0;
                    const isCourseComplete = orderedTopics.length > 0 && completion === 100;
                    const isCourseUnlocked =
                      hasStarted && (courseIndex === 0 || previousCourseComplete);
                    const isCourseLocked = !isCourseUnlocked;

                    previousCourseComplete = isCourseComplete;

                    return (
                      <div
                        key={`course-track-${path.id}-${course?.id}`}
                        className={`rounded-2xl border border-white/10 bg-white/5 p-5 ${
                          isCourseLocked ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                              Course
                            </p>
                            <h4 className="mt-2 text-lg font-semibold text-white">
                              {course?.title}
                            </h4>
                            <p className="mt-2 text-sm text-slate-300">
                              {course?.description}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {isCourseComplete && (
                              <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                                Completed
                              </span>
                            )}
                            <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                              {completion}% complete
                            </span>
                          </div>
                        </div>
                        {isCourseLocked && (
                          <p className="mt-3 text-xs text-slate-400">
                            Complete all topics in the previous course to unlock this one.
                          </p>
                        )}
                        <div className="mt-4 space-y-3">
                          {orderedTopics.length === 0 ? (
                            <p className="text-sm text-slate-400">
                              No topics assigned to this course yet.
                            </p>
                          ) : (
                            (() => {
                              let previousTopicComplete = true;
                              return orderedTopics.map((topic) => {
                                const progress = progressLookup.get(topic.id);
                                const submission = topicSubmissionLookup.get(topic.id);
                                const status = getTopicStatusLabel(progress, submission);
                                const statusStyle =
                                  topicStatusStyles[status] ?? topicStatusStyles["Not Started"];
                                const prereqs = topic.pre_requisites ?? [];
                                const missingPrereqs = prereqs.filter((id) => {
                                  const prereqProgress = progressLookup.get(id);
                                  const prereqSubmission = topicSubmissionLookup.get(id);
                                  return (
                                    getTopicStatusLabel(prereqProgress, prereqSubmission) !==
                                    "Completed"
                                  );
                                });
                                const isApproved = status === "Completed";
                                const isPending = submission?.status === "pending";
                                const isNeedsInfo = submission?.status === "in_progress";
                                const isRejected = submission?.status === "rejected";
                                const isSequenceLocked = !previousTopicComplete;
                                const isTopicUnlocked =
                                  isCourseUnlocked &&
                                  !isSequenceLocked &&
                                  missingPrereqs.length === 0;
                                const canSubmit =
                                  Boolean(user?.id) && isTopicUnlocked && !isApproved && !isPending;
                                const submitLabel = isPending
                                  ? "Pending review"
                                  : isRejected
                                  ? "Resubmit certificate"
                                  : isNeedsInfo
                                  ? "Update certificate"
                                  : "Upload certificate";

                                previousTopicComplete = isApproved;

                                return (
                                  <div
                                    key={`topic-${path.id}-${course?.id}-${topic.id}`}
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="text-white">{topic.title}</p>
                                        <p className="text-xs text-slate-400">
                                          {topic.description}
                                        </p>
                                      </div>
                                      <span
                                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${statusStyle}`}
                                      >
                                        {status}
                                      </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                      <span className="rounded-full border border-white/10 px-3 py-1">
                                        {topic.time_allocated}{" "}
                                        {topic.time_unit === "hours" ? "hours" : "days"}
                                      </span>
                                      {topic.link_url ? (
                                        <span className="rounded-full border border-white/10 px-3 py-1">
                                          Link available
                                        </span>
                                      ) : (
                                        <span className="rounded-full border border-white/10 px-3 py-1">
                                          No link yet
                                        </span>
                                      )}
                                    </div>
                                    {isSequenceLocked && (
                                      <p className="mt-3 text-xs text-slate-400">
                                        Await approval of the previous topic before continuing.
                                      </p>
                                    )}
                                    {!isSequenceLocked && missingPrereqs.length > 0 && (
                                      <p className="mt-3 text-xs text-slate-400">
                                        Complete prerequisites before continuing.
                                      </p>
                                    )}
                                    {isPending && (
                                      <p className="mt-3 text-xs text-amber-200">
                                        Certificate submitted. Awaiting review.
                                      </p>
                                    )}
                                    {isNeedsInfo && (
                                      <p className="mt-3 text-xs text-sky-200">
                                        Admin requested more info. Please resubmit your certificate.
                                      </p>
                                    )}
                                {isRejected && (
                                  <p className="mt-3 text-xs text-rose-200">
                                    Submission rejected. Upload a new certificate to continue.
                                  </p>
                                )}
                                {submission?.review_notes && (
                                  <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                      Admin note
                                    </p>
                                    <p className="mt-1">{submission.review_notes}</p>
                                  </div>
                                )}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenTopic(topic)}
                                        disabled={!isTopicUnlocked || !topic.link_url}
                                        className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {startingTopicId === topic.id ? "Starting..." : "Start"}
                                      </button>
                                      {isApproved ? (
                                        <span className="rounded-full border border-emerald-400/40 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                                          Approved
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openTopicProofModal(topic)}
                                          disabled={!canSubmit}
                                          className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                          {submitLabel}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderActivityTab = () => {
    if (loading) {
      return (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-xl text-white">Assigned activities</h3>
          <p className="mt-2 text-sm text-slate-400">
            Activities assigned to your enrolled courses.
          </p>
          <div className="mt-4 space-y-3">
            {assignedActivities.length === 0 ? (
              <p className="text-sm text-slate-400">No activities assigned yet.</p>
            ) : (
              assignedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-white">{activity.title}</p>
                    <p className="text-xs text-slate-400">{activity.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {activity.status ?? "active"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <UploadWidget
          activities={uploadedActivities}
          onUpload={handleUploadActivity}
          onDelete={handleDeleteActivity}
          isUploading={isUploading}
          deletingId={deletingActivityId}
          error={activityError ?? undefined}
          deleteError={deleteActivityError ?? undefined}
        />
      </div>
    );
  };

  const renderQuizTab = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={`skeleton-quiz-${index}`} />
          ))}
        </div>
      );
    }

    if (visibleQuizzes.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No quizzes available yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {quizStatusError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {quizStatusError}
          </div>
        )}
        <QuizList
          quizzes={visibleQuizzes}
          quizScores={quizScoreEntries}
          quizAttempts={quizAttemptEntries}
          onCompleteQuiz={handleCompleteQuiz}
          completingQuizId={completingQuizId}
        />
      </div>
    );
  };

  const renderFormTab = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={`skeleton-form-${index}`} />
          ))}
        </div>
      );
    }

    if (visibleForms.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No forms assigned yet.
        </div>
      );
    }

    return <FormList forms={visibleForms} />;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "track":
        return renderTrackTab();
      case "activity":
        return renderActivityTab();
      case "quiz":
        return renderQuizTab();
      case "forms":
        return renderFormTab();
      case "enroll":
      default:
        return renderEnrollTab();
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-[#bda6ff]/20 via-[#5f3dc4]/20 to-[#140c2c] px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col gap-10">
          <Navbar
            userEmail={user?.email}
            onSignOut={handleOpenSignOut}
            onProfileClick={() => setIsProfileModalOpen(true)}
          />
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                User dashboard
              </p>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Welcome back{user?.username ? `, ${user.username}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                Track training momentum, upload topic certificates, and keep an eye on every lesson.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.3em] text-slate-400">
              {userLoading ? "Loading user..." : "Aligned with admin enrollments"}
            </div>
          </div>

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              <span>{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="rounded-full border border-rose-300/30 px-4 py-2 text-xs uppercase tracking-[0.25em]"
              >
                Retry
              </button>
            </div>
          )}
          {submissionSuccess && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              {submissionSuccess}
            </div>
          )}

          <TabShell tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
            >
              {renderTabContent()}
            </div>
          </TabShell>
        </div>
      </div>

      {isSignOutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Account</p>
              <h3 id="signout-modal-title" className="mt-2 font-display text-xl text-white">
                Sign out?
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Do you really want to sign out? You can come back anytime.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseSignOut}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {isTopicProofOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                Topic certificate
              </p>
              <h3 className="mt-2 font-display text-xl text-white">Upload certificate</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {proofTopic
                ? `Upload a certificate for "${proofTopic.title}".`
                : "Upload a certificate so an admin can review your completion."}
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
              />
              <label className="block text-xs uppercase tracking-[0.25em] text-slate-400">
                Notes (optional)
                <textarea
                  rows={3}
                  value={proofMessage}
                  onChange={(event) => setProofMessage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                />
              </label>
              {proofError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {proofError}
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeTopicProofModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTopicProof}
                disabled={submittingProof}
                className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
              >
                {submittingProof ? "Submitting..." : "Submit certificate"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileSetupModal
        isOpen={isProfileSetupOpen}
        onComplete={() => {
          setIsProfileSetupOpen(false);
          // Refresh profile
          if (user && supabase) {
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single()
              .then(({ data }) => setProfile(data));
          }
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
