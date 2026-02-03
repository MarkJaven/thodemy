import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks/useUser";
import { superAdminService } from "../../services/superAdminService";
import { auditLogService } from "../../services/auditLogService";
import { adminTaskService } from "../../services/adminTaskService";
import type { AuditLog, AdminTask, AdminUser } from "../../types/superAdmin";
import UsersSection from "./sections/UsersSection";
import TopicsSection from "./sections/TopicsSection";
import LearningPathsSection from "./sections/LearningPathsSection";
import CoursesSection from "./sections/CoursesSection";

// Navigation icons
const OverviewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const CoursesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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

const TopicsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ApprovalsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);

const ReportsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
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

type NavItem = "overview" | "courses" | "learning-paths" | "topics" | "users" | "approvals" | "reports";

interface DashboardStats {
  activeCourses: number;
  coursesThisMonth: number;
  topicsLibrary: number;
  topicsAwaitingReview: number;
  activeLearners: number;
  completionRate: number;
  pendingApprovals: number;
  approvalsToday: number;
}

interface RecentCourse {
  id: string;
  title: string;
  topicCount: number;
  learnerCount: number;
  status: string;
  updatedAt: string;
}

interface ApprovalItem {
  id: string;
  userName: string;
  userEmail?: string;
  type: string;
  detail: string;
  entityId?: string;
  entityType: "topic_submission" | "course_completion";
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
}

interface TaskItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
}

const SuperAdminDashboard = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    activeCourses: 0,
    coursesThisMonth: 0,
    topicsLibrary: 0,
    topicsAwaitingReview: 0,
    activeLearners: 0,
    completionRate: 0,
    pendingApprovals: 0,
    approvalsToday: 0,
  });
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const buildActivityTitle = (log: AuditLog) => {
    const details = (log.details ?? {}) as Record<string, unknown>;
    const title = typeof details.title === "string" ? details.title : null;
    const from = typeof details.from === "string" ? details.from : null;
    const to =
      typeof details.to === "string"
        ? details.to
        : typeof details.status === "string"
          ? details.status
          : null;
    const entityLabels: Record<string, string> = {
      topic: "Topic",
      course: "Course",
      learning_path: "Learning Path",
      user: "User",
      enrollment: "Enrollment",
      learning_path_enrollment: "Learning Path Enrollment",
      topic_submission: "Topic Submission",
      course_completion_request: "Course Completion Proof",
      activity: "Activity",
      activity_submission: "Activity Submission",
    };
    const entity = entityLabels[log.entity_type] ?? log.entity_type.replace(/_/g, " ");

    switch (log.action) {
      case "created":
        return title ? `Created ${entity}: ${title}` : `Created ${entity}`;
      case "updated":
        return title ? `Updated ${entity}: ${title}` : `Updated ${entity}`;
      case "status_changed":
        if (title && from && to) {
          return `${entity} status changed: ${title} (${from} → ${to})`;
        }
        if (title && to) {
          return `${entity} status updated: ${title} → ${to}`;
        }
        if (to) {
          return `${entity} status updated → ${to}`;
        }
        return `${entity} status updated`;
      case "soft_deleted":
      case "deleted":
      case "deactivated":
      case "removed":
        return title ? `Removed ${entity}: ${title}` : `Removed ${entity}`;
      default:
        return title ? `${entity}: ${title}` : `${entity} activity`;
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [courses, topics, users, topicSubmissions, courseCompletionRequests] = await Promise.all([
          superAdminService.listCourses(),
          superAdminService.listTopics(),
          superAdminService.listUsers(),
          superAdminService.listTopicCompletionRequests(),
          superAdminService.listCourseCompletionRequests(),
        ]);

        // Create a user lookup map
        const userMap = new Map<string, AdminUser>();
        users.forEach(u => userMap.set(u.id, u));

        // Create a topic lookup map
        const topicMap = new Map<string, string>();
        topics.forEach(t => topicMap.set(t.id, t.title));

        // Create a course lookup map
        const courseMap = new Map<string, string>();
        courses.forEach(c => courseMap.set(c.id, c.title));

        // Calculate stats
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const activeCourses = courses.filter(c => c.status === "published" || c.status === "active").length;
        const coursesThisMonth = courses.filter(c => new Date(c.created_at ?? "") >= monthAgo).length;
        const pendingTopicSubmissions = topicSubmissions.filter(s => s.status === "pending").length;
        const pendingCourseRequests = courseCompletionRequests.filter(r => r.status === "pending").length;
        const totalPending = pendingTopicSubmissions + pendingCourseRequests;

        setStats({
          activeCourses,
          coursesThisMonth,
          topicsLibrary: topics.length,
          topicsAwaitingReview: pendingTopicSubmissions,
          activeLearners: users.filter(u => u.role === "learner").length,
          completionRate: 87, // Placeholder - would need enrollment data
          pendingApprovals: totalPending,
          approvalsToday: Math.min(5, totalPending),
        });

        // Recent courses
        const recent = courses.slice(0, 4).map(course => ({
          id: course.id,
          title: course.title,
          topicCount: course.topic_ids?.length || 0,
          learnerCount: 0, // Would need enrollment count
          status: course.status ?? "draft",
          updatedAt: formatTimeAgo(course.updated_at ?? ""),
        }));
        setRecentCourses(recent);

        // Approvals queue - with actual user names and details
        const approvalItems: ApprovalItem[] = [
          ...topicSubmissions.filter(s => s.status === "pending").slice(0, 5).map(s => {
            const submitter = userMap.get(s.user_id);
            const topicTitle = topicMap.get(s.topic_id) ?? "Unknown Topic";
            return {
              id: s.id,
              userName: submitter?.username ?? submitter?.first_name ?? "Unknown User",
              userEmail: submitter?.email ?? undefined,
              type: "Topic completion",
              detail: topicTitle,
              entityId: s.topic_id,
              entityType: "topic_submission" as const,
            };
          }),
          ...courseCompletionRequests.filter(r => r.status === "pending").slice(0, 3).map(r => {
            const submitter = userMap.get(r.user_id);
            const courseTitle = courseMap.get(r.course_id) ?? "Unknown Course";
            return {
              id: r.id,
              userName: submitter?.username ?? submitter?.first_name ?? "Unknown User",
              userEmail: submitter?.email ?? undefined,
              type: "Course completion",
              detail: courseTitle,
              entityId: r.course_id,
              entityType: "course_completion" as const,
            };
          }),
        ];
        setApprovals(approvalItems.slice(0, 5));

        // Fetch admin tasks
        try {
          const adminTasks = await adminTaskService.listPendingTasks();
          setTasks(
            adminTasks.map(t => ({
              id: t.id,
              title: t.title,
              priority: t.priority ?? "medium",
            }))
          );
          setTaskError(null);
        } catch (taskLoadError) {
          console.error("Failed to load admin tasks:", taskLoadError);
          setTasks([]);
          setTaskError("Unable to load tasks.");
        }

        // Recent activity from audit logs
        try {
          const logs = await auditLogService.listAuditLogs({
            actorId: user?.id ?? null,
            limit: 12,
          });
          setActivities(
            logs.map((log) => ({
              id: log.id,
              title: buildActivityTitle(log),
              time: formatTimeAgo(log.timestamp ?? ""),
            }))
          );
          setActivityError(null);
        } catch (activityLoadError) {
          console.error("Failed to load audit logs:", activityLoadError);
          setActivities([]);
          setActivityError("Unable to load recent activity.");
        }

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (activeNav === "overview") {
      fetchDashboardData();
    }
  }, [activeNav, user?.id]);

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "--";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/" });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "published":
      case "active":
        return "text-emerald-400";
      case "in_review":
      case "pending":
        return "text-amber-400";
      case "draft":
        return "text-indigo-400";
      default:
        return "text-slate-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-400";
      case "low":
        return "bg-emerald-400";
      default:
        return "bg-accent-purple";
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    try {
      const newTask = await adminTaskService.createTask({
        title: newTaskTitle.trim(),
        priority: "medium",
      });
      setTasks(prev => [{ id: newTask.id, title: newTask.title, priority: newTask.priority ?? "medium" }, ...prev]);
      setNewTaskTitle("");
      setTaskError(null);
    } catch (error) {
      console.error("Failed to add task:", error);
      setTaskError("Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await adminTaskService.completeTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await adminTaskService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleReviewApproval = (item: ApprovalItem) => {
    // Navigate to the appropriate section based on approval type
    if (item.entityType === "topic_submission") {
      setActiveNav("topics");
    } else if (item.entityType === "course_completion") {
      setActiveNav("courses");
    }
  };

  const navItems: { key: NavItem; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <OverviewIcon /> },
    { key: "courses", label: "Courses", icon: <CoursesIcon /> },
    { key: "learning-paths", label: "Learning Paths", icon: <LearningPathIcon /> },
    { key: "topics", label: "Topics", icon: <TopicsIcon /> },
    { key: "users", label: "Users", icon: <UsersIcon /> },
    { key: "approvals", label: "Approvals", icon: <ApprovalsIcon /> },
    { key: "reports", label: "Reports", icon: <ReportsIcon /> },
  ];

  const renderContent = () => {
    switch (activeNav) {
      case "courses":
        return <CoursesSection />;
      case "learning-paths":
        return <LearningPathsSection />;
      case "topics":
        return <TopicsSection />;
      case "users":
        return <UsersSection />;
      case "approvals":
        return <div className="text-slate-400">Approvals section coming soon...</div>;
      case "reports":
        return <div className="text-slate-400">Reports section coming soon...</div>;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => (
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Courses"
          value={stats.activeCourses.toString()}
          delta={`+${stats.coursesThisMonth} this month`}
          deltaColor="text-emerald-400"
          isLoading={isLoading}
        />
        <StatCard
          label="Topics Library"
          value={stats.topicsLibrary.toString()}
          delta={`+${stats.topicsAwaitingReview} awaiting review`}
          deltaColor="text-amber-400"
          isLoading={isLoading}
        />
        <StatCard
          label="Active Learners"
          value={stats.activeLearners.toLocaleString()}
          delta={`${stats.completionRate}% completion rate`}
          deltaColor="text-accent-purple"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pendingApprovals.toString()}
          delta={`${stats.approvalsToday} require action today`}
          deltaColor="text-red-400"
          isLoading={isLoading}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses Card */}
        <div className="lg:col-span-2 rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Courses in Review</h3>
              <p className="text-xs text-slate-500">Updated in the last 24 hours</p>
            </div>
            <button className="text-xs font-semibold text-accent-purple hover:text-accent-purple/80 transition-colors">
              View all
            </button>
          </div>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-5 gap-3 px-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Course</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Topics</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Learners</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Updated</span>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-ink-750/50 p-3 animate-pulse h-12" />
              ))
            ) : recentCourses.length > 0 ? (
              recentCourses.map((course, index) => (
                <div
                  key={course.id}
                  className={`grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 rounded-xl p-3 ${
                    index % 2 === 0 ? "bg-ink-750/50" : "bg-ink-800/30"
                  }`}
                >
                  <span className="text-sm text-slate-200 truncate">{course.title}</span>
                  <span className="text-sm text-slate-400 hidden sm:block">{course.topicCount}</span>
                  <span className="text-sm text-slate-400 hidden sm:block">{course.learnerCount}</span>
                  <span className={`text-sm font-semibold capitalize ${getStatusColor(course.status)}`}>
                    {course.status.replace("_", " ")}
                  </span>
                  <span className="text-sm text-slate-400 hidden sm:block">{course.updatedAt}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm py-4 text-center">No recent courses</p>
            )}
          </div>
        </div>

        {/* Approvals Queue */}
        <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="mb-4">
            <h3 className="text-white font-semibold">Approvals Queue</h3>
            <p className="text-xs text-slate-500">Pending verifications</p>
          </div>

          <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`approval-skeleton-${i}`} className="rounded-xl bg-ink-750/50 p-3 animate-pulse h-14" />
              ))
            ) : approvals.length > 0 ? (
              approvals.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl bg-ink-750/50 border border-white/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{item.userName}</p>
                    {item.userEmail && (
                      <p className="text-[10px] text-slate-500 truncate">{item.userEmail}</p>
                    )}
                    <p className="text-[10px] text-accent-purple/80 truncate mt-0.5">
                      {item.type} · {item.detail}
                    </p>
                  </div>
                  <button
                    onClick={() => handleReviewApproval(item)}
                    className="shrink-0 ml-3 rounded-full bg-ink-700 px-3 py-1.5 text-[10px] font-semibold text-accent-purple hover:bg-accent-purple hover:text-white transition-colors"
                  >
                    Review
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">All caught up!</p>
                <p className="text-slate-600 text-xs mt-1">No pending approvals</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Recent Activity</h3>
            <span className="text-xs font-semibold text-accent-purple">Latest</span>
          </div>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`activity-skeleton-${i}`} className="rounded-xl bg-ink-750/50 p-3 h-12 animate-pulse" />
              ))
            ) : activityError ? (
              <p className="text-sm text-rose-200">{activityError}</p>
            ) : activities.length > 0 ? (
              activities.slice(0, 5).map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-xl bg-ink-750/50 p-2"
                >
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-accent-purple/40 bg-ink-900/70 text-xs font-semibold text-accent-purple">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{activity.title}</p>
                    <p className="text-[10px] text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            )}
          </div>
        </div>

        {/* Next Actions / To-Do List */}
        <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Next Actions</h3>
            <span className="text-[10px] text-slate-500">{tasks.length} pending</span>
          </div>

          {/* Add Task Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Add a task..."
              className="flex-1 bg-ink-750/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple/50 transition-colors"
              disabled={isAddingTask}
            />
            <button
              onClick={handleAddTask}
              disabled={isAddingTask || !newTaskTitle.trim()}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingTask ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>
          </div>

          {taskError && (
            <p className="text-xs text-red-400 mb-3">{taskError}</p>
          )}

          {/* Task List */}
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`task-skeleton-${i}`} className="rounded-lg bg-ink-750/50 p-2 animate-pulse h-10" />
              ))
            ) : tasks.length > 0 ? (
              tasks.map(task => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 rounded-lg bg-ink-750/30 hover:bg-ink-750/50 p-2 transition-colors"
                >
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="shrink-0 w-5 h-5 rounded border border-white/20 hover:border-emerald-400 hover:bg-emerald-400/20 flex items-center justify-center transition-colors"
                    title="Mark as complete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-transparent group-hover:text-emerald-400 transition-colors">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <div className={`w-2 h-2 rounded-sm ${getPriorityColor(task.priority)}`} />
                  <span className="flex-1 text-sm text-slate-200 truncate">{task.title}</span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 transition-all"
                    title="Delete task"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 text-center">
                <p className="text-slate-500 text-sm">No tasks yet</p>
                <p className="text-slate-600 text-xs mt-1">Add a task to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      {/* Background Glows */}
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
          {/* Brand */}
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-violet flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-white font-semibold">Thodemy</span>
            {/* Close button for mobile */}
            <button
              className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Navigation Label */}
          <div className="px-6 pt-6 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Navigation
            </span>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 pb-6 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveNav(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${activeNav === item.key
                      ? "bg-ink-700 text-white border border-accent-purple/30"
                      : "text-slate-400 hover:text-white hover:bg-ink-800"
                    }
                  `}
                >
                  <span className={activeNav === item.key ? "text-accent-purple" : "text-slate-500"}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleSignOut}
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

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
              {/* Left Side */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Mobile Menu Button */}
                <button
                  className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                  onClick={() => setSidebarOpen(true)}
                >
                  <MenuIcon />
                </button>

                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 block">
                    Superadmin Workspace
                  </span>
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                    {activeNav === "overview" ? "Learning Management Overview" : navItems.find(n => n.key === activeNav)?.label}
                  </h1>
                </div>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                {/* New Course Button */}
                <button
                  onClick={() => setActiveNav("courses")}
                  className="hidden sm:flex items-center gap-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="hidden lg:inline">New Course</span>
                </button>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-ink-700 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
  isLoading?: boolean;
}

const StatCard = ({ label, value, delta, deltaColor, isLoading }: StatCardProps) => (
  <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-4">
    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    {isLoading ? (
      <div className="mt-2 h-7 w-16 bg-ink-700 rounded animate-pulse" />
    ) : (
      <p className="text-xl sm:text-2xl font-semibold text-white mt-1">{value}</p>
    )}
    <p className={`text-xs mt-1 ${deltaColor}`}>{delta}</p>
  </div>
);

export default SuperAdminDashboard;
