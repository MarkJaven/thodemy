import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FormList from "../components/dashboard/FormList";
import ProfileSetupModal from "../components/auth/ProfileSetupModal";
import QuizList from "../components/dashboard/QuizList";
import UploadWidget from "../components/dashboard/UploadWidget";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useTopicsData } from "../hooks/useTopicsData";
import { useUserRole } from "../hooks/useUserRole";
import { useUser } from "../hooks/useUser";
import { supabase } from "../lib/supabaseClient";
import { dashboardApi } from "../services/dashboardApi";
import logoThodemy from "../assets/images/logo-thodemy.png";
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

const OverviewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const LearningPathIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="5" r="3" />
    <circle cx="19" cy="5" r="3" />
    <circle cx="5" cy="19" r="3" />
    <path d="M7.5 5h9M5 7.5v9M7.5 19h9.5" />
  </svg>
);

const ProjectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h18M3 12h18M3 17h18" />
    <path d="M7 7v10M17 7v10" />
  </svg>
);

const QuizIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const FormsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const RequestIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 8v4l3 3" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

type IconProps = {
  className?: string;
};

const ChevronDownIcon = ({ className = "" }: IconProps) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

type UserNavItem =
  | "overview"
  | "learning-path"
  | "projects"
  | "quiz"
  | "forms"
  | "requests"
  | "profile";

const userNavItems: Array<{
  key: UserNavItem;
  label: string;
  icon: JSX.Element;
  badge?: string;
}> = [
  { key: "overview", label: "Overview", icon: <OverviewIcon /> },
  { key: "learning-path", label: "Learning Path", icon: <LearningPathIcon /> },
  { key: "projects", label: "Projects", icon: <ProjectIcon /> },
  { key: "quiz", label: "Quiz", icon: <QuizIcon /> },
  { key: "forms", label: "Forms", icon: <FormsIcon /> },
  { key: "requests", label: "Requests", icon: <RequestIcon /> },
  { key: "profile", label: "Profile", icon: <ProfileIcon /> },
];

const SkeletonCard = () => (
  <div className="h-36 rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(10,8,18,0.35)]">
    <div className="h-full animate-pulse rounded-2xl bg-white/5" />
  </div>
);

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

const buildLatestByQuizId = <T extends { quiz_id: string; submitted_at?: string | null }>(
  entries: T[]
) => {
  const map = new Map<string, T>();
  entries.forEach((entry) => {
    const existing = map.get(entry.quiz_id);
    if (!existing) {
      map.set(entry.quiz_id, entry);
      return;
    }
    const existingTime = existing.submitted_at ? new Date(existing.submitted_at).getTime() : 0;
    const currentTime = entry.submitted_at ? new Date(entry.submitted_at).getTime() : 0;
    if (currentTime >= existingTime) {
      map.set(entry.quiz_id, entry);
    }
  });
  return map;
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
  const { role: userRole, loading: roleLoading } = useUserRole(user?.id);
  const {
    data: topicsData,
    loading: topicsLoading,
    error: topicsError,
    refresh: refreshTopics,
  } = useTopicsData(user?.id);
  const [activeNav, setActiveNav] = useState<UserNavItem>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedLearningPathId, setSelectedLearningPathId] = useState("all");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedTopicId, setSelectedTopicId] = useState("all");
  const [learningPathPanels, setLearningPathPanels] = useState({
    enroll: false,
    track: false,
  });

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
        setProfileDraft(data);
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
  const [deleteActivityError, setDeleteActivityError] = useState<string | null>(null);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [startingLearningPathId, setStartingLearningPathId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollingLearningPathId, setEnrollingLearningPathId] = useState<string | null>(
    null
  );
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [completingQuizId, setCompletingQuizId] = useState<string | null>(null);
  const [isTopicProofOpen, setIsTopicProofOpen] = useState(false);
  const [proofTopic, setProofTopic] = useState<Topic | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofMessage, setProofMessage] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [isQuizProofOpen, setIsQuizProofOpen] = useState(false);
  const [proofQuiz, setProofQuiz] = useState<Quiz | null>(null);
  const [quizProofFile, setQuizProofFile] = useState<File | null>(null);
  const [quizProofMessage, setQuizProofMessage] = useState("");
  const [quizProofError, setQuizProofError] = useState<string | null>(null);
  const [submittingQuizProof, setSubmittingQuizProof] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileDraft, setProfileDraft] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    setSelectedCourseId("all");
    setSelectedTopicId("all");
  }, [selectedLearningPathId]);

  useEffect(() => {
    setSelectedTopicId("all");
  }, [selectedCourseId]);

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

  const completedTopicCount = useMemo(
    () =>
      topicsData.topicProgress.filter((entry) => entry.status === "completed").length,
    [topicsData.topicProgress]
  );

  const latestSubmissions = useMemo(
    () => Array.from(topicSubmissionLookup.values()),
    [topicSubmissionLookup]
  );

  const pendingSubmissionCount = useMemo(
    () => latestSubmissions.filter((submission) => submission.status === "pending").length,
    [latestSubmissions]
  );

  const approvedSubmissionCount = useMemo(
    () =>
      latestSubmissions.filter((submission) => submission.status === "completed").length,
    [latestSubmissions]
  );

  const activeLearningPathCount = useMemo(
    () =>
      learningPathEnrollmentEntries.filter((entry) =>
        ["approved", "active", "completed", "enrolled"].includes(entry.status ?? "")
      ).length,
    [learningPathEnrollmentEntries]
  );

  const recentSubmissions = useMemo(
    () =>
      latestSubmissions
        .slice()
        .sort((a, b) => getSubmissionTimestamp(b) - getSubmissionTimestamp(a))
        .slice(0, 3),
    [latestSubmissions]
  );

  const recentActivities = useMemo(
    () =>
      activityEntries
        .slice()
        .sort((a, b) => {
          const left = a.created_at ? new Date(a.created_at).getTime() : 0;
          const right = b.created_at ? new Date(b.created_at).getTime() : 0;
          return right - left;
        })
        .slice(0, 3),
    [activityEntries]
  );

  const visibleQuizzes = data.quizzes.filter((quiz) => {
    if (quiz.assigned_user_id && quiz.assigned_user_id === user?.id) {
      return true;
    }
    if (quiz.assigned_user_id && quiz.assigned_user_id !== user?.id) {
      return false;
    }
    if (!quiz.assigned_user_id && !quiz.course_id) {
      return true;
    }
    if (quiz.course_id) {
      return activeEnrollmentCourseIds.has(quiz.course_id);
    }
    return hasActiveEnrollment;
  });

  const visibleForms = hasActiveEnrollment
    ? data.forms.filter((form) => form.assigned_user_id === user?.id || !form.assigned_user_id)
    : [];

  const quizAttemptLookup = useMemo(
    () => buildLatestByQuizId(quizAttemptEntries),
    [quizAttemptEntries]
  );

  const quizScoreLookup = useMemo(
    () => buildLatestByQuizId(quizScoreEntries),
    [quizScoreEntries]
  );

  const quizSummary = useMemo(() => {
    const now = new Date();
    let openCount = 0;
    let completedCount = 0;
    let pendingScoreCount = 0;

    visibleQuizzes.forEach((quiz) => {
      const status = (quiz.status ?? "active").toLowerCase();
      const statusAllowsOpen = ["active", "open", "published"].includes(status);
      const startAt = quiz.start_at ? new Date(quiz.start_at) : null;
      const endAt = quiz.end_at ? new Date(quiz.end_at) : null;
      const isOpen =
        statusAllowsOpen &&
        (!startAt || now >= startAt) &&
        (!endAt || now <= endAt);
      if (isOpen) openCount += 1;

      const attempt = quizAttemptLookup.get(quiz.id);
      if (attempt?.submitted_at) {
        completedCount += 1;
        const score = quizScoreLookup.get(quiz.id);
        if (attempt.proof_url && !score) pendingScoreCount += 1;
      }
    });

    return {
      total: visibleQuizzes.length,
      openCount,
      completedCount,
      pendingScoreCount,
    };
  }, [quizAttemptLookup, quizScoreLookup, visibleQuizzes]);

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

  const openQuizProofModal = (quiz: Quiz) => {
    setProofQuiz(quiz);
    setQuizProofFile(null);
    setQuizProofMessage("");
    setQuizProofError(null);
    setIsQuizProofOpen(true);
  };

  const closeQuizProofModal = () => {
    setIsQuizProofOpen(false);
    setProofQuiz(null);
    setQuizProofFile(null);
    setQuizProofMessage("");
    setQuizProofError(null);
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

  const handleSubmitQuizProof = async () => {
    if (!user?.id || !proofQuiz || !quizProofFile) {
      setQuizProofError("Upload a JPG, PNG, or PDF proof file before submitting.");
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(quizProofFile.type)) {
      setQuizProofError("Proof file must be a PDF, JPG, or PNG.");
      return;
    }
    const maxSizeBytes = 10 * 1024 * 1024;
    if (quizProofFile.size > maxSizeBytes) {
      setQuizProofError("Proof file must be smaller than 10MB.");
      return;
    }
    setSubmittingQuizProof(true);
    setQuizProofError(null);
    setCompletingQuizId(proofQuiz.id);
    try {
      const attempt = await dashboardApi.submitQuizProof({
        quizId: proofQuiz.id,
        userId: user.id,
        file: quizProofFile,
        message: quizProofMessage.trim() || undefined,
      });
      setQuizAttemptEntries((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.id === attempt.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = attempt;
          return updated;
        }
        return [...prev, attempt];
      });
      closeQuizProofModal();
      await refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to submit quiz proof.";
      setQuizProofError(message);
    } finally {
      setSubmittingQuizProof(false);
      setCompletingQuizId(null);
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

  const handleUploadQuizProof = (quiz: Quiz) => {
    if (!user?.id) {
      setQuizStatusError("You must be signed in to upload quiz proof.");
      return;
    }
    setQuizStatusError(null);
    openQuizProofModal(quiz);
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

  const handleProfileFieldChange = (field: string, value: string) => {
    setProfileDraft((prev: any) => ({ ...(prev ?? {}), [field]: value }));
  };

  const startProfileEdit = () => {
    setProfileDraft(profile ?? {});
    setIsProfileEditing(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
  };

  const cancelProfileEdit = () => {
    setIsProfileEditing(false);
    setProfileDraft(profile ?? {});
    setProfileUpdateError(null);
  };

  const handleProfileSave = async () => {
    if (!supabase || !user?.id) return;
    setProfileSaving(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
    try {
      const updates = {
        first_name: profileDraft?.first_name ?? "",
        last_name: profileDraft?.last_name ?? "",
        gender: profileDraft?.gender ?? "",
        birthday: profileDraft?.birthday ?? "",
        address: profileDraft?.address ?? "",
        company_id_no: profileDraft?.company_id_no ?? "",
      };
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (updateError) throw updateError;
      setProfile((prev: any) => ({ ...(prev ?? {}), ...updates }));
      setProfileDraft((prev: any) => ({ ...(prev ?? {}), ...updates }));
      setIsProfileEditing(false);
      setProfileUpdateSuccess("Profile updated.");
      setTimeout(() => setProfileUpdateSuccess(null), 3000);
    } catch (err) {
      setProfileUpdateError(
        err instanceof Error ? err.message : "Failed to update profile."
      );
    } finally {
      setProfileSaving(false);
    }
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

    const uniqueCoursesFromPaths = (paths: LearningPath[]) => {
      const ids = new Set<string>();
      paths.forEach((path) => {
        (path.course_ids ?? []).forEach((courseId) => ids.add(courseId));
      });
      return Array.from(ids)
        .map((courseId) => courseLookup.get(courseId))
        .filter(Boolean) as Course[];
    };

    const uniqueTopicsFromCourses = (courses: Course[]) => {
      const ids = new Set<string>();
      courses.forEach((course) => {
        (course.topic_ids ?? []).forEach((topicId) => ids.add(topicId));
      });
      return Array.from(ids)
        .map((topicId) => topicLookup.get(topicId))
        .filter(Boolean) as Topic[];
    };

    const selectedLearningPath =
      selectedLearningPathId !== "all"
        ? activeLearningPaths.find((path) => path.id === selectedLearningPathId)
        : null;

    const availableCourses = selectedLearningPath
      ? uniqueCoursesFromPaths([selectedLearningPath])
      : uniqueCoursesFromPaths(activeLearningPaths);

    const selectedCourse =
      selectedCourseId !== "all"
        ? availableCourses.find((course) => course.id === selectedCourseId) ??
          courseLookup.get(selectedCourseId) ??
          null
        : null;

    const availableTopics = selectedCourse
      ? uniqueTopicsFromCourses([selectedCourse])
      : uniqueTopicsFromCourses(availableCourses);

    const sortedLearningPaths = activeLearningPaths
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
    const sortedCourses = availableCourses
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
    const sortedTopics = availableTopics
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));

    const filteredLearningPaths = activeLearningPaths.filter((path) => {
      if (selectedLearningPathId !== "all" && path.id !== selectedLearningPathId) {
        return false;
      }
      if (
        selectedCourseId !== "all" &&
        !(path.course_ids ?? []).includes(selectedCourseId)
      ) {
        return false;
      }
      if (selectedTopicId !== "all") {
        const hasTopic = (path.course_ids ?? []).some((courseId) => {
          const course = courseLookup.get(courseId);
          return (course?.topic_ids ?? []).includes(selectedTopicId);
        });
        if (!hasTopic) return false;
      }
      return true;
    });

    const isFiltered =
      selectedLearningPathId !== "all" ||
      selectedCourseId !== "all" ||
      selectedTopicId !== "all";
    const selectedTopicLabel =
      selectedTopicId !== "all"
        ? sortedTopics.find((topic) => topic.id === selectedTopicId)?.title ??
          "Selected topic"
        : null;

    return (
      <div className="space-y-6">
        {progressError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {progressError}
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                Learning Path Filters
              </p>
              <h4 className="mt-2 text-lg font-semibold text-white">
                Jump directly to a course or topic
              </h4>
              <p className="mt-2 text-sm text-slate-400">
                Select a learning path, course, and topic to simplify your view.
              </p>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLearningPathId("all");
                  setSelectedCourseId("all");
                  setSelectedTopicId("all");
                }}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
              Learning Path
              <select
                value={selectedLearningPathId}
                onChange={(event) => setSelectedLearningPathId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="all">All learning paths</option>
                {sortedLearningPaths.map((path) => (
                  <option key={`lp-filter-${path.id}`} value={path.id}>
                    {path.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
              Course
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="all">All courses</option>
                {sortedCourses.map((course) => (
                  <option key={`course-filter-${course.id}`} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400">
              Topic
              <select
                value={selectedTopicId}
                onChange={(event) => setSelectedTopicId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/70 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
              >
                <option value="all">All topics</option>
                {sortedTopics.map((topic) => (
                  <option key={`topic-filter-${topic.id}`} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {isFiltered && (
            <p className="mt-3 text-xs text-slate-400">
              Showing {selectedLearningPath ? selectedLearningPath.title : "all learning paths"}
              {selectedCourse ? ` ? ${selectedCourse.title}` : " ? all courses"}
              {selectedTopicLabel ? ` ? ${selectedTopicLabel}` : " ? all topics"}
            </p>
          )}
        </div>

        {filteredLearningPaths.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No learning paths match this filter selection yet.
          </div>
        ) : (
          filteredLearningPaths.map((path) => {
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
              new Set(
                pathCourses.flatMap((course) => course?.topic_ids ?? []).filter(Boolean)
              )
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

            const courseMetaLookup = new Map<
              string,
              {
                orderedTopics: Topic[];
                completion: number;
                isCourseComplete: boolean;
                isCourseUnlocked: boolean;
                isCourseLocked: boolean;
              }
            >();

            let previousCourseComplete = true;

            pathCourses.forEach((course, courseIndex) => {
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

              courseMetaLookup.set(course.id, {
                orderedTopics,
                completion,
                isCourseComplete,
                isCourseUnlocked,
                isCourseLocked,
              });

              previousCourseComplete = isCourseComplete;
            });

            const filteredCourses = pathCourses.filter((course) => {
              if (selectedCourseId !== "all" && course.id !== selectedCourseId) {
                return false;
              }
              if (
                selectedTopicId !== "all" &&
                !(course.topic_ids ?? []).includes(selectedTopicId)
              ) {
                return false;
              }
              return true;
            });

            return (
              <details
                key={`learning-path-track-${path.id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                        {pathCompletion}% complete
                      </span>
                      <ChevronDownIcon className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                    </div>
                  </div>
                </summary>
                <div className="mt-4 space-y-5">
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
                  {!hasStarted && (
                    <p className="text-xs text-slate-400">
                      Start the learning path to unlock courses and begin tracking.
                    </p>
                  )}
                  <div className="space-y-5">
                    {filteredCourses.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No courses match this filter for the selected learning path.
                      </p>
                    ) : (
                      filteredCourses.map((course) => {
                        const meta = courseMetaLookup.get(course.id);
                        if (!meta) return null;
                        const {
                          orderedTopics,
                          completion,
                          isCourseComplete,
                          isCourseUnlocked,
                          isCourseLocked,
                        } = meta;

                        const topicsToRender =
                          selectedTopicId !== "all"
                            ? orderedTopics.filter((topic) => topic.id === selectedTopicId)
                            : orderedTopics;

                        const topicSequenceLockLookup = new Map<string, boolean>();
                        let previousTopicComplete = true;
                        orderedTopics.forEach((topic) => {
                          const progress = progressLookup.get(topic.id);
                          const submission = topicSubmissionLookup.get(topic.id);
                          const status = getTopicStatusLabel(progress, submission);
                          const isApproved = status === "Completed";
                          const isSequenceLocked = !previousTopicComplete;
                          topicSequenceLockLookup.set(topic.id, isSequenceLocked);
                          previousTopicComplete = isApproved;
                        });

                        return (
                          <details
                            key={`course-track-${path.id}-${course?.id}`}
                            className={`group rounded-2xl border border-white/10 bg-white/5 p-5 ${
                              isCourseLocked ? "opacity-60" : ""
                            }`}
                          >
                            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
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
                                <div className="flex items-center gap-2">
                                  {isCourseComplete && (
                                    <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                                      Completed
                                    </span>
                                  )}
                                  <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                                    {completion}% complete
                                  </span>
                                  <ChevronDownIcon className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                                </div>
                              </div>
                            </summary>
                            <div className="mt-4 space-y-3">
                              {isCourseLocked && (
                                <p className="text-xs text-slate-400">
                                  Complete all topics in the previous course to unlock this one.
                                </p>
                              )}
                              {topicsToRender.length === 0 ? (
                                <p className="text-sm text-slate-400">
                                  {selectedTopicId !== "all"
                                    ? "Selected topic is not in this course."
                                    : "No topics assigned to this course yet."}
                                </p>
                              ) : (
                                topicsToRender.map((topic) => {
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
                                  const isSequenceLocked =
                                    topicSequenceLockLookup.get(topic.id) ?? false;
                                  const isTopicUnlocked =
                                    isCourseUnlocked &&
                                    !isSequenceLocked &&
                                    missingPrereqs.length === 0;
                                  const canSubmit =
                                    Boolean(user?.id) &&
                                    isTopicUnlocked &&
                                    !isApproved &&
                                    !isPending;
                                  const submitLabel = isPending
                                    ? "Pending review"
                                    : isRejected
                                    ? "Resubmit certificate"
                                    : isNeedsInfo
                                    ? "Update certificate"
                                    : "Upload certificate";

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
                                })
                              )}
                            </div>
                          </details>
                        );
                      })
                    )}
                  </div>
                </div>
              </details>
            );
          })
        )}
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
          onUploadProof={handleUploadQuizProof}
          uploadingQuizId={completingQuizId}
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

  const getCourseProgress = (course: Course) => {
    const topicIds = course.topic_ids ?? [];
    if (topicIds.length === 0) {
      return { completed: 0, total: 0, percent: 0 };
    }
    const completed = topicIds.filter((topicId) => {
      const progress = progressLookup.get(topicId);
      const submission = topicSubmissionLookup.get(topicId);
      return getTopicStatusLabel(progress, submission) === "Completed";
    }).length;
    const percent = Math.round((completed / topicIds.length) * 100);
    return { completed, total: topicIds.length, percent };
  };

  const renderOverviewSection = () => {
    if (loading || topicsLoading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={`skeleton-stat-${index}`} />
          ))}
        </div>
      );
    }

    const stats = [
      {
        label: "Active Course",
        value: activeEnrollmentCourseIds.size,
        delta: hasActiveEnrollment ? "Based on enrollments" : "No active enrollments",
      },
      {
        label: "Lessons Completed",
        value: completedTopicCount,
        delta: approvedSubmissionCount
          ? `${approvedSubmissionCount} certificates approved`
          : "Awaiting first approval",
      },
      {
        label: "Learning Paths",
        value: activeLearningPathCount,
        delta: activeLearningPathCount ? "In progress" : "Enroll to start",
      },
      {
        label: "Pending Reviews",
        value: pendingSubmissionCount,
        delta: pendingSubmissionCount ? "Awaiting admin review" : "No pending reviews",
      },
    ];

    const activeCourses = data.courses.filter((course) =>
      activeEnrollmentCourseIds.has(course.id)
    );
    const visibleCourses = activeCourses.slice(0, 3);

    const nextSteps = [
      hasActiveEnrollment ? "Resume your active course" : "Enroll in a learning path to start",
      pendingSubmissionCount > 0
        ? "Track certificate review status"
        : "Submit required certificates for completed topics",
      visibleQuizzes.length > 0 ? "Complete assigned quizzes" : "Check for new quizzes",
    ].filter(Boolean);

    const statusStyles: Record<string, string> = {
      pending: "border-amber-400/40 text-amber-200 bg-amber-500/10",
      in_progress: "border-sky-400/40 text-sky-200 bg-sky-500/10",
      completed: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
      rejected: "border-rose-400/40 text-rose-200 bg-rose-500/10",
    };

    const statusLabels: Record<string, string> = {
      pending: "Pending review",
      in_progress: "Needs info",
      completed: "Approved",
      rejected: "Rejected",
    };

    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-ink-800/70 p-5 shadow-card"
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                {stat.label}
              </p>
              <p className="mt-3 font-display text-2xl text-white">{stat.value}</p>
              <p className="mt-2 text-xs text-slate-400">{stat.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-white">Module Overview</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Track progress and next actions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav("learning-path")}
                className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-purple"
              >
                See all
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {visibleCourses.length === 0 ? (
                <p className="text-sm text-slate-400">No active courses yet.</p>
              ) : (
                visibleCourses.map((course) => {
                  const progress = getCourseProgress(course);
                  return (
                    <div
                      key={course.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{course.title}</p>
                          <p className="text-xs text-slate-400">{course.description}</p>
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                          {progress.total ? `${progress.completed}/${progress.total}` : "N/A"}
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full bg-accent-purple"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-white">Forms Center</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Submit required forms and updates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav("forms")}
                className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-purple"
              >
                See all
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {visibleForms.length === 0 ? (
                <p className="text-sm text-slate-400">No forms assigned yet.</p>
              ) : (
                visibleForms.slice(0, 3).map((form) => {
                  const dueDate = form.due_at ?? form.end_at ?? null;
                  const statusLabel =
                    form.status?.replace(/_/g, " ") ?? "open";
                  return (
                    <div
                      key={form.id}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-white">{form.title}</p>
                          {form.description && (
                            <p className="text-xs text-slate-400">{form.description}</p>
                          )}
                        </div>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                          {statusLabel}
                        </span>
                      </div>
                      {dueDate && (
                        <p className="mt-2 text-xs text-slate-500">
                          Due {formatDate(dueDate)}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-white">Module Activity</h3>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-purple">
                This week
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-slate-400">No recent activity yet.</p>
              ) : (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">{activity.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                      {activity.status ?? "active"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
            <h3 className="font-display text-xl text-white">Next Steps</h3>
            <div className="mt-4 space-y-3">
              {nextSteps.map((step) => (
                <div key={step} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="h-2 w-2 rounded-sm bg-accent-purple" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const toggleLearningPathPanel = (panel: "enroll" | "track") => {
    setLearningPathPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const renderLearningPathSection = () => (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
          Learning Path
        </p>
        <h2 className="mt-2 font-display text-2xl text-white">
          Enroll, track, and submit progress
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Enter your enrollment code below, then expand Progress to review courses.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Learning Path Code
          </p>
          <h3 className="mt-2 font-display text-xl text-white">Enroll with a code</h3>
          <p className="mt-2 text-sm text-slate-400">
            Enter the learning path code shared by your admin.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={learningPathCode}
              onChange={(event) => setLearningPathCode(event.target.value)}
              placeholder="Enter learning path code"
              className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleEnrollLearningPathByCode}
              disabled={Boolean(enrollingLearningPathId)}
              className="rounded-full border border-white/10 bg-white/10 px-6 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20 disabled:opacity-50"
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
        </div>

        <div
          className={`rounded-2xl border bg-ink-800/70 shadow-card ${
            learningPathPanels.track ? "border-accent-purple/30" : "border-white/10"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleLearningPathPanel("track")}
            className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/40"
            aria-expanded={learningPathPanels.track}
            aria-controls="learning-path-track-panel"
          >
            <div className="flex items-start gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Progress
                </p>
                <h3 className="mt-2 font-display text-xl text-white">
                  Track courses & topic submissions
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Filter by learning path, course, or topic to stay focused.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-400">
              {learningPathPanels.track ? "Hide" : "Expand"}
              <ChevronDownIcon
                className={`h-4 w-4 transition ${
                  learningPathPanels.track ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
          {learningPathPanels.track && (
            <div
              id="learning-path-track-panel"
              className="border-t border-white/5 px-6 pb-6"
            >
              <div className="pt-6">{renderTrackTab()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProjectsSection = () => {
    const hasProjectItems =
      assignedActivities.length > 0 || uploadedActivities.length > 0;
    const projectDescription = hasProjectItems
      ? "Review assigned activities and upload learning artifacts."
      : "Projects will appear here once assigned. Upload learning artifacts in the meantime.";

    return (
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
            Projects
          </p>
          <h2 className="mt-2 font-display text-2xl text-white">
            Assignments & uploads
          </h2>
          <p className="mt-2 text-sm text-slate-400">{projectDescription}</p>
        </div>
        {renderActivityTab()}
      </div>
    );
  };

  const renderQuizSection = () => (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Quiz</p>
        <h2 className="mt-2 font-display text-2xl text-white">Assigned quizzes</h2>
        <p className="mt-2 text-sm text-slate-400">
          Open the external quiz, submit your answers, and mark completion so your
          score can be verified.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Assigned</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.total}</p>
          <p className="mt-1 text-xs text-slate-500">Total quizzes in your queue.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Open now</p>
          <p className="mt-2 text-2xl font-semibold text-white">{quizSummary.openCount}</p>
          <p className="mt-1 text-xs text-slate-500">Quizzes currently accepting submissions.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Awaiting score</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {quizSummary.pendingScoreCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Completed quizzes pending verification.</p>
        </div>
      </div>
      {renderQuizTab()}
    </div>
  );

  const renderFormsSection = () => (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Forms</p>
        <h2 className="mt-2 font-display text-2xl text-white">Assigned forms</h2>
        <p className="mt-2 text-sm text-slate-400">
          Submit required forms to keep your progress moving.
        </p>
      </div>
      {renderFormTab()}
    </div>
  );

  const renderRequestsSection = () => (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Requests</p>
        <h2 className="mt-2 font-display text-2xl text-white">
          Track reviews & approvals
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Follow certificate requests and required updates in one place.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-xl text-white">Recent requests</h3>
          <button
            type="button"
            onClick={() => setActiveNav("forms")}
            className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-purple"
          >
            Open modal
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {latestSubmissions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No requests yet. Open the Request Certificate modal to submit proof.
            </p>
          ) : (
            latestSubmissions
              .slice()
              .sort((a, b) => getSubmissionTimestamp(b) - getSubmissionTimestamp(a))
              .slice(0, 6)
              .map((submission) => {
                const topic = topicLookup.get(submission.topic_id);
                const statusKey = submission.status ?? "pending";
                const requestStatusStyles: Record<string, string> = {
                  pending: "border-amber-400/40 text-amber-200 bg-amber-500/10",
                  in_progress: "border-sky-400/40 text-sky-200 bg-sky-500/10",
                  completed: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
                  rejected: "border-rose-400/40 text-rose-200 bg-rose-500/10",
                };
                const requestStatusLabels: Record<string, string> = {
                  pending: "Pending review",
                  in_progress: "Needs info",
                  completed: "Approved",
                  rejected: "Rejected",
                };
                return (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {topic?.title ?? "Certificate request"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Submitted {formatDate(submission.submitted_at ?? submission.created_at)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
                        requestStatusStyles[statusKey] ?? "border-white/10 text-slate-300"
                      }`}
                    >
                      {requestStatusLabels[statusKey] ?? "Pending"}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );

  const renderProfileSection = () => {
    if (profileLoading) {
      return (
        <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card">
          <p className="text-sm text-slate-300">Loading profile...</p>
        </div>
      );
    }

    const profileView = (isProfileEditing ? profileDraft : profile) ?? {};
    const displayName =
      profileView.full_name ||
      [profileView.first_name, profileView.last_name].filter(Boolean).join(" ") ||
      user?.username ||
      (user?.email ? user.email.split("@")[0] : "Learner");
    const initials =
      displayName
        ?.split(" ")
        .map((part: string) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "LR";
    const statusLabel = profileView.profile_setup_completed
      ? "Profile completed"
      : "Profile incomplete";
    const roleLabel = roleLoading
      ? "Loading..."
      : userRole === "superadmin"
        ? "Super Admin"
        : userRole === "admin"
          ? "Admin"
          : userRole === "user"
            ? "User"
            : "Not set";
    const inputClass =
      "w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-purple/40";
    const readOnlyClass =
      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white";
    const mutedClass =
      "w-full rounded-xl border border-slate-600/30 bg-slate-700/30 px-4 py-2 text-sm text-slate-400";

    return (
      <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-card space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-purple/20 text-sm font-semibold uppercase text-accent-purple">
              {initials}
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{displayName}</h2>
              <p className="text-sm text-slate-400">
                {profileView.email ?? user?.email ?? "No email on file"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
              {statusLabel}
            </span>
            {isProfileEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="rounded-full bg-gradient-to-r from-accent-purple via-accent-indigo to-accent-violet px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-purple-glow transition hover:opacity-90 disabled:opacity-60"
                >
                  {profileSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelProfileEdit}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200 hover:bg-white/10"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startProfileEdit}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white hover:bg-white/20"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              First Name
            </label>
            {isProfileEditing ? (
              <input
                type="text"
                value={profileView.first_name ?? ""}
                onChange={(event) => handleProfileFieldChange("first_name", event.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyClass}>{profileView.first_name || "Not set"}</div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Last Name
            </label>
            {isProfileEditing ? (
              <input
                type="text"
                value={profileView.last_name ?? ""}
                onChange={(event) => handleProfileFieldChange("last_name", event.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyClass}>{profileView.last_name || "Not set"}</div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Gender
            </label>
            {isProfileEditing ? (
              <select
                value={profileView.gender ?? ""}
                onChange={(event) => handleProfileFieldChange("gender", event.target.value)}
                className={inputClass}
              >
                <option value="" className="bg-ink-700">Select gender</option>
                <option value="male" className="bg-ink-700">Male</option>
                <option value="female" className="bg-ink-700">Female</option>
                <option value="other" className="bg-ink-700">Other</option>
                <option value="prefer-not-to-say" className="bg-ink-700">
                  Prefer not to say
                </option>
              </select>
            ) : (
              <div className={`${readOnlyClass} capitalize`}>
                {(profileView.gender ?? "Not set").replace(/[-_]/g, " ")}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Birthday
            </label>
            {isProfileEditing ? (
              <input
                type="date"
                value={profileView.birthday ?? ""}
                onChange={(event) => handleProfileFieldChange("birthday", event.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyClass}>
                {profileView.birthday ? formatDate(profileView.birthday) : "Not set"}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Company ID
            </label>
            {isProfileEditing ? (
              <input
                type="text"
                value={profileView.company_id_no ?? ""}
                onChange={(event) => handleProfileFieldChange("company_id_no", event.target.value)}
                className={inputClass}
              />
            ) : (
              <div className={readOnlyClass}>{profileView.company_id_no || "Not set"}</div>
            )}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
              Role
            </label>
            <div className={mutedClass}>{roleLabel}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">
            Address
          </label>
          {isProfileEditing ? (
            <textarea
              rows={3}
              value={profileView.address ?? ""}
              onChange={(event) => handleProfileFieldChange("address", event.target.value)}
              className={`${inputClass} resize-none`}
            />
          ) : (
            <div className={`${readOnlyClass} whitespace-pre-wrap`}>
              {profileView.address || "Not set"}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Training</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Onboarding</p>
              <div className={`${mutedClass} mt-2`}>
                {profileView.onboarding_date ? formatDate(profileView.onboarding_date) : "Not set"}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Training Start</p>
              <div className={`${mutedClass} mt-2`}>
                {profileView.training_starting_date
                  ? formatDate(profileView.training_starting_date)
                  : "Not set"}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500">Regularization</p>
              <div className={`${mutedClass} mt-2`}>
                {profileView.target_regularization_date
                  ? formatDate(profileView.target_regularization_date)
                  : "Not set"}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Training information is managed by your administrator.
          </p>
        </div>

        {profileUpdateError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {profileUpdateError}
          </div>
        )}
        {profileUpdateSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {profileUpdateSuccess}
          </div>
        )}
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeNav) {
      case "learning-path":
        return renderLearningPathSection();
      case "projects":
        return renderProjectsSection();
      case "quiz":
        return renderQuizSection();
      case "forms":
        return renderFormsSection();
      case "requests":
        return renderRequestsSection();
      case "profile":
        return renderProfileSection();
      case "overview":
      default:
        return renderOverviewSection();
    }
  };

  const activeNavLabel =
    userNavItems.find((item) => item.key === activeNav)?.label ?? "Overview";
  const welcomeName =
    profile?.full_name ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "Learner");
  const userInitials =
    welcomeName
      ?.split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "LR";

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-20 w-80 h-80 rounded-full bg-accent-purple/10 blur-[70px]" />
        <div className="absolute top-36 right-20 w-96 h-96 rounded-full bg-accent-indigo/5 blur-[90px]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-0 left-0 z-50
            w-64 h-screen
            bg-ink-850/95 backdrop-blur-sm
            border-r border-white/10
            flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <img
              src={logoThodemy}
              alt="Thodemy"
              className="h-20 w-auto object-contain shrink-0"
              loading="lazy"
            />
            <button
              className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="px-6 pt-6 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Modules
            </span>
          </div>

          <nav className="flex-1 px-4 pb-6 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {userNavItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`
                    flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${activeNav === item.key
                      ? "bg-ink-700 text-white border border-accent-purple/30"
                      : "text-slate-400 hover:text-white hover:bg-ink-800"
                    }
                  `}
                >
                  <span className="flex items-center gap-3">
                    <span className={activeNav === item.key ? "text-accent-purple" : "text-slate-500"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleOpenSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-ink-800 transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                  onClick={() => setSidebarOpen(true)}
                >
                  <MenuIcon />
                </button>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
                    Learner Home
                  </span>
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                    {activeNavLabel}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveNav("learning-path")}
                  className="hidden sm:flex items-center gap-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  Resume Module
                </button>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-purple/20 text-2xs font-semibold uppercase text-accent-purple">
                    {userInitials}
                  </div>
                  <span className="max-w-[160px] truncate text-xs text-slate-300">
                    {user?.email ?? "Learner"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNav("profile")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-ink-800 text-slate-300 hover:text-white"
                  title="Profile"
                >
                  <ProfileIcon />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  Learner Home
                </p>
                <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                  Welcome back, {welcomeName}.
                </h1>
                <p className="mt-3 max-w-xl text-sm text-slate-300">
                  Track course progress, submit forms, and stay on top of quizzes.
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

            {renderActiveSection()}
          </div>
        </main>
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

      {isQuizProofOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                Quiz proof
              </p>
              <h3 className="mt-2 font-display text-xl text-white">Upload quiz proof</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {proofQuiz
                ? `Upload proof for "${proofQuiz.title}".`
                : "Upload proof so your admin can verify the quiz."}
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(event) => setQuizProofFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
              />
              <label className="block text-xs uppercase tracking-[0.25em] text-slate-400">
                Notes (optional)
                <textarea
                  rows={3}
                  value={quizProofMessage}
                  onChange={(event) => setQuizProofMessage(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                />
              </label>
              {quizProofError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {quizProofError}
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeQuizProofModal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitQuizProof}
                disabled={submittingQuizProof}
                className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
              >
                {submittingQuizProof ? "Submitting..." : "Submit proof"}
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

    </div>
  );
};

export default Dashboard;
