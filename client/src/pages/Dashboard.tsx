import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CourseCard from "../components/dashboard/CourseCard";
import FormList from "../components/dashboard/FormList";
import Navbar from "../components/dashboard/Navbar";
import ProgressChecklist from "../components/dashboard/ProgressChecklist";
import QuizList from "../components/dashboard/QuizList";
import TabShell, { TabDefinition, TabKey } from "../components/dashboard/TabShell";
import UploadWidget from "../components/dashboard/UploadWidget";
import { useAuth } from "../context/AuthContext";
import { useDashboardData } from "../hooks/useDashboardData";
import { useUser } from "../hooks/useUser";
import { dashboardApi } from "../services/dashboardApi";
import type { Activity, QuizScore, UserProgress } from "../types/dashboard";

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

const Dashboard = () => {
  const { user, isLoading: userLoading } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useDashboardData(user?.id);
  const [activeTab, setActiveTab] = useState<TabKey>("enroll");

  const [progressEntries, setProgressEntries] = useState<UserProgress[]>([]);
  const [activityEntries, setActivityEntries] = useState<Activity[]>([]);
  const [quizScoreEntries, setQuizScoreEntries] = useState<QuizScore[]>([]);
  const [enrollmentEntries, setEnrollmentEntries] = useState(data.enrollments);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [deleteActivityError, setDeleteActivityError] = useState<string | null>(null);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  useEffect(() => {
    setProgressEntries(data.progress);
  }, [data.progress]);

  useEffect(() => {
    setActivityEntries(data.activities);
  }, [data.activities]);

  useEffect(() => {
    setQuizScoreEntries(data.quizScores);
  }, [data.quizScores]);


  useEffect(() => {
    setEnrollmentEntries(data.enrollments);
  }, [data.enrollments]);

  const activeEnrollmentCourseIds = new Set(
    enrollmentEntries
      .filter((entry) => ["approved", "active", "completed"].includes(entry.status ?? ""))
      .map((entry) => entry.course_id)
  );

  const visibleQuizzes = data.quizzes.filter(
    (quiz) =>
      quiz.assigned_user_id === user?.id ||
      (quiz.course_id && activeEnrollmentCourseIds.has(quiz.course_id))
  );

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

  const handleToggleProgress = async (payload: { lessonId: string; completed: boolean }) => {
    setProgressError(null);
    setIsUpdatingProgress(true);
    setProgressEntries((prev) => {
      const existing = prev.find((entry) => entry.lesson_id === payload.lessonId);
      if (existing) {
        return prev.map((entry) =>
          entry.lesson_id === payload.lessonId ? { ...entry, completed: payload.completed } : entry
        );
      }
      return [
        ...prev,
        {
          id: `progress-${payload.lessonId}`,
          user_id: user?.id ?? "demo-user",
          lesson_id: payload.lessonId,
          completed: payload.completed,
          completed_at: new Date().toISOString(),
        },
      ];
    });

    try {
      await dashboardApi.updateProgress({
        lessonId: payload.lessonId,
        completed: payload.completed,
        userId: user?.id,
      });
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : "Unable to update progress.";
      setProgressError(message);
    } finally {
      setIsUpdatingProgress(false);
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


  const handleEnroll = async (courseId: string) => {
    if (!user?.id) {
      setEnrollError("You must be signed in to enroll.");
      return;
    }
    setEnrollError(null);
    setEnrollingCourseId(courseId);
    const optimistic = {
      id: `enroll-${Date.now()}`,
      user_id: user.id,
      course_id: courseId,
      enrolled_at: new Date().toISOString(),
      status: "pending",
    };
    setEnrollmentEntries((prev) => [...prev, optimistic]);
    try {
      await dashboardApi.requestEnrollment({ courseId, userId: user.id });
    } catch (enrollErr) {
      setEnrollError(enrollErr instanceof Error ? enrollErr.message : "Unable to enroll.");
      setEnrollmentEntries((prev) => prev.filter((entry) => entry.id !== optimistic.id));
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

    if (data.courses.length === 0) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No courses available yet.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {enrollError && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            {enrollError}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((course) => {
            const enrollment = enrollmentEntries.find(
              (entry) => entry.course_id === course.id
            );
            return (
              <CourseCard
                key={course.id}
                course={course}
                isEnrolled={Boolean(enrollment)}
                enrollmentStatus={enrollment?.status ?? null}
                isSubmitting={enrollingCourseId === course.id}
                onEnroll={() => handleEnroll(course.id)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderTrackTab = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <SkeletonCard key={`skeleton-track-${index}`} />
          ))}
        </div>
      );
    }

    return (
      <>
        {progressError && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {progressError}
          </div>
        )}
        <ProgressChecklist
          courses={data.courses}
          lessons={data.lessons}
          enrollments={enrollmentEntries}
          progress={progressEntries}
          onToggle={handleToggleProgress}
          isUpdating={isUpdatingProgress}
        />
      </>
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
          No quizzes assigned yet. Enroll and wait for admin approval.
        </div>
      );
    }

    return (
      <QuizList
        quizzes={visibleQuizzes}
        quizScores={quizScoreEntries}
      />
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
                Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
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
    </div>
  );
};

export default Dashboard;
