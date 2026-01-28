import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../components/dashboard/CourseCard";
import FormList from "../components/dashboard/FormList";
import Navbar from "../components/dashboard/Navbar";
import QuizList from "../components/dashboard/QuizList";
import TabShell, { TabDefinition, TabKey } from "../components/dashboard/TabShell";
import UploadWidget from "../components/dashboard/UploadWidget";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useTopicsData } from "../hooks/useTopicsData";
import { useUser } from "../hooks/useUser";
import { dashboardApi } from "../services/dashboardApi";
import type {
  Activity,
  QuizAttempt,
  QuizScore,
  Topic,
  Quiz,
  TopicCompletionRequest,
} from "../types/dashboard";

const tabs: TabDefinition[] = [
  { key: "enroll", label: "Enroll Courses" },
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

const Dashboard = () => {
  const { user, isLoading: userLoading } = useUser();
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

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/auth/login", { replace: true });
    }
  }, [user, userLoading, navigate]);

  const [activityEntries, setActivityEntries] = useState<Activity[]>([]);
  const [quizScoreEntries, setQuizScoreEntries] = useState<QuizScore[]>([]);
  const [quizAttemptEntries, setQuizAttemptEntries] = useState<QuizAttempt[]>([]);
  const [enrollmentEntries, setEnrollmentEntries] = useState(data.enrollments);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [quizStatusError, setQuizStatusError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [deleteActivityError, setDeleteActivityError] = useState<string | null>(null);
  const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [completingQuizId, setCompletingQuizId] = useState<string | null>(null);
  const [isProofOpen, setIsProofOpen] = useState(false);
  const [proofTopic, setProofTopic] = useState<Topic | null>(null);
  const [proofCourseId, setProofCourseId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

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

  const activeEnrollmentCourseIds = new Set(
    enrollmentEntries
      .filter((entry) =>
        ["pending", "approved", "active", "completed", "enrolled"].includes(
          entry.status ?? ""
        )
      )
      .map((entry) => entry.course_id)
  );

  const topicLookup = useMemo(
    () => new Map(topicsData.topics.map((topic) => [topic.id, topic])),
    [topicsData.topics]
  );

  const progressLookup = useMemo(
    () => new Map(topicsData.topicProgress.map((entry) => [entry.topic_id, entry])),
    [topicsData.topicProgress]
  );

  const completionLookup = useMemo(() => {
    const map = new Map<string, TopicCompletionRequest>();
    topicsData.topicCompletionRequests.forEach((request) => {
      const existing = map.get(request.topic_id);
      if (!existing) {
        map.set(request.topic_id, request);
        return;
      }
      const existingTime = existing.created_at ? new Date(existing.created_at).getTime() : 0;
      const nextTime = request.created_at ? new Date(request.created_at).getTime() : 0;
      if (nextTime >= existingTime) {
        map.set(request.topic_id, request);
      }
    });
    return map;
  }, [topicsData.topicCompletionRequests]);

  const visibleQuizzes = data.quizzes.filter((quiz) => {
    const assignedMatch = !quiz.assigned_user_id || quiz.assigned_user_id === user?.id;
    const courseMatch = quiz.course_id ? activeEnrollmentCourseIds.has(quiz.course_id) : true;
    return assignedMatch && courseMatch;
  });

  const visibleForms = data.forms.filter(
    (form) => form.assigned_user_id === user?.id || !form.assigned_user_id
  );

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
    setProgressError(null);
    setStartingTopicId(topic.id);
    try {
      await dashboardApi.startTopic({
        topicId: topic.id,
        userId: user.id,
        timeAllocated: Number(topic.time_allocated ?? 0),
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

  const openProofModal = (topic: Topic, courseId?: string | null) => {
    setProofTopic(topic);
    setProofCourseId(courseId ?? null);
    setProofFile(null);
    setProofError(null);
    setIsProofOpen(true);
  };

  const handleSubmitProof = async () => {
    if (!user?.id || !proofTopic || !proofFile) {
      setProofError("Upload a JPG or PNG proof before submitting.");
      return;
    }
    setSubmittingProof(true);
    setProofError(null);
    try {
      await dashboardApi.submitTopicCompletionProof({
        topicId: proofTopic.id,
        courseId: proofCourseId,
        userId: user.id,
        file: proofFile,
      });
      setIsProofOpen(false);
      await refreshTopics();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to submit proof.";
      setProofError(message);
    } finally {
      setSubmittingProof(false);
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


  const handleEnrollByCode = async () => {
    if (!user?.id) {
      setEnrollError("You must be signed in to enroll.");
      return;
    }
    if (!courseCode.trim()) {
      setEnrollError("Enter a course code to enroll.");
      return;
    }
    setEnrollError(null);
    setEnrollSuccess(null);
    setEnrollingCourseId(courseCode.trim());
    try {
      const { courseId } = await dashboardApi.requestEnrollment({
        courseCode: courseCode.trim(),
      });
      if (!courseId) {
        throw new Error("Unable to resolve course for enrollment.");
      }
      const optimistic = {
        id: `enroll-${Date.now()}`,
        user_id: user.id,
        course_id: courseId,
        enrolled_at: new Date().toISOString(),
        status: "pending",
      };
      setEnrollmentEntries((prev) => [...prev, optimistic]);
      setEnrollSuccess("Enrollment request submitted.");
      setCourseCode("");
      await refresh();
    } catch (enrollErr) {
      setEnrollError(enrollErr instanceof Error ? enrollErr.message : "Unable to enroll.");
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
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

    const publishedCourses = data.courses.filter(
      (course) =>
        (course.status === "published" || !course.status) &&
        course.enrollment_enabled !== false
    );

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-display text-xl text-white">Enroll with a course code</h3>
          <p className="mt-2 text-sm text-slate-400">
            Enter the course code shared by your admin to request enrollment.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
              placeholder="Enter course code"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleEnrollByCode}
              disabled={Boolean(enrollingCourseId)}
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {enrollingCourseId ? "Submitting..." : "Enroll"}
            </button>
          </div>
          {(enrollError || enrollSuccess) && (
            <div
              className={`mt-4 rounded-2xl border px-5 py-3 text-sm ${
                enrollError
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {enrollError || enrollSuccess}
            </div>
          )}
        </div>

        {publishedCourses.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No published courses available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publishedCourses.map((course) => {
              const enrollment = enrollmentEntries.find(
                (entry) => entry.course_id === course.id
              );
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  isEnrolled={Boolean(enrollment)}
                  enrollmentStatus={enrollment?.status ?? null}
                />
              );
            })}
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

    const activeCourses = data.courses.filter((course) =>
      activeEnrollmentCourseIds.has(course.id)
    );

    if (activeCourses.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No enrolled courses yet. Request enrollment to start tracking progress.
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
        {activeCourses.map((course) => {
          const topicIds = course.topic_ids ?? [];
          const orderedTopics = topicIds
            .map((id) => topicLookup.get(id))
            .filter(Boolean) as Topic[];
          const completedCount = orderedTopics.filter(
            (topic) => progressLookup.get(topic.id)?.status === "completed"
          ).length;
          const completion =
            orderedTopics.length > 0
              ? Math.round((completedCount / orderedTopics.length) * 100)
              : 0;

          return (
            <div
              key={`course-track-${course.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                    Course progress
                  </p>
                  <h3 className="mt-2 font-display text-xl text-white">{course.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{course.description}</p>
                </div>
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {completion}% complete
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {orderedTopics.length === 0 ? (
                  <p className="text-sm text-slate-400">No topics assigned to this course yet.</p>
                ) : (
                  orderedTopics.map((topic) => {
                    const progress = progressLookup.get(topic.id);
                    const status = progress?.status
                      ? progress.status === "completed"
                        ? "Completed"
                        : "In Progress"
                      : "Not Started";
                    const completionRequest = completionLookup.get(topic.id);
                    const completionStatus = completionRequest?.status ?? null;
                    const isPendingReview = completionStatus === "pending";
                    const isApproved = completionStatus === "approved";
                    const isRejected = completionStatus === "rejected";
                    return (
                      <div
                        key={`topic-${topic.id}`}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-white">{topic.title}</p>
                            <p className="text-xs text-slate-400">{topic.description}</p>
                          </div>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            {status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="rounded-full border border-white/10 px-3 py-1">
                            {topic.time_allocated}{" "}
                            {topic.time_unit === "hours" ? "hours" : "days"}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1">
                            Start: {formatDate(progress?.start_date)}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1">
                            End: {formatDate(progress?.end_date)}
                          </span>
                          {isPendingReview && (
                            <span className="rounded-full border border-amber-400/40 px-3 py-1 text-amber-200">
                              Pending review
                            </span>
                          )}
                          {isApproved && status !== "Completed" && (
                            <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-emerald-200">
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="rounded-full border border-rose-500/40 px-3 py-1 text-rose-200">
                              Rejected
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {status === "Not Started" && (
                            <button
                              type="button"
                              onClick={() => handleStartTopic(topic)}
                              disabled={startingTopicId === topic.id}
                              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {startingTopicId === topic.id ? "Starting..." : "Start"}
                            </button>
                          )}
                          {status === "In Progress" && (
                            <button
                              type="button"
                              onClick={() => openProofModal(topic, course.id)}
                              disabled={isPendingReview || isApproved}
                              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isPendingReview
                                ? "Pending review"
                                : isApproved
                                ? "Approved"
                                : isRejected
                                ? "Resubmit"
                                : "Mark complete"}
                            </button>
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
        <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1c1436]/95 via-[#17122b]/95 to-[#0c0b14]/95 p-6 shadow-glow backdrop-blur sm:p-8">
          <Navbar userEmail={user?.email} onSignOut={handleOpenSignOut} />
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                User dashboard
              </p>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Welcome back{user?.username ? `, ${user.username}` : user?.email ? `, ${user.email.split("@")[0]}` : ""}.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                Track training momentum, submit activities, and keep an eye on every lesson.
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

      {isProofOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
                Proof of completion
              </p>
              <h3 className="mt-2 font-display text-xl text-white">Upload screenshot</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Upload a JPG or PNG screenshot so an admin can confirm completion.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
              />
              {proofError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {proofError}
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProofOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={submittingProof}
                className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
              >
                {submittingProof ? "Submitting..." : "Submit proof"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
