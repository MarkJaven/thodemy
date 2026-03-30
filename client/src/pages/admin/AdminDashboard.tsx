import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CharacterCounter from "../../components/CharacterCounter";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks/useUser";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../lib/supabaseClient";
import { superAdminService } from "../../services/superAdminService";
import { auditLogService } from "../../services/auditLogService";
import { adminTaskService } from "../../services/adminTaskService";
import { mfaService } from "../../services/mfaService";
import type { AuditLog, AdminUser } from "../../types/superAdmin";
import logoThodemy from "../../assets/images/logo-thodemy.png";
import UsersSection from "./sections/UsersSection";
import TopicsSection from "./sections/TopicsSection";
import LearningPathsSection from "./sections/LearningPathsSection";
import CoursesSection from "./sections/CoursesSection";
import ActivitiesSection from "./sections/ActivitiesSection";
import QuizzesSection from "./sections/QuizzesSection";
import FormsSection from "./sections/FormsSection";
import ReportsSection from "./sections/ReportsSection";
import EvaluationSection from "./sections/EvaluationSection";
import Breadcrumb from "../../components/admin/Breadcrumb";

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

const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const QuizIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

const ApprovalsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
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

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const ReportsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const EvaluationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
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

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const COMPANY_ID_REGEX = /^\d{1,7}$/;
const sanitizeCompanyId = (value: string) => value.replace(/\D/g, "").slice(0, 7);
const sanitizeName = (value: string) => value.replace(/[^a-zA-ZÑñ\s'-]/g, "").slice(0, 50);

type NavItem =
  | "overview"
  | "courses"
  | "learning-paths"
  | "topics"
  | "users"
  | "projects"
  | "activity"
  | "activity-enrollments"
  | "activity-submissions"
  | "quiz"
  | "quiz-scores"
  | "forms"
  | "reports"
  | "evaluation"
  | "profile";

type ApprovalSection =
  | "topic_submissions"
  | "course_completion"
  | "learning_path_enrollments"
  | "course_enrollments";

type ApprovalNavItem = "activity-enrollments" | "activity-submissions";

const APPROVAL_NAV_ITEMS: Array<{
  key: ApprovalNavItem;
  label: string;
  defaultSection: ApprovalSection;
}> = [
  {
    key: "activity-enrollments",
    label: "Enrollment Approvals",
    defaultSection: "learning_path_enrollments",
  },
  {
    key: "activity-submissions",
    label: "Submission Approvals",
    defaultSection: "topic_submissions",
  },
];

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

interface EnrollmentHealth {
  active: number;
  pending: number;
  completed: number;
  dropped: number;
  total: number;
}

interface ApprovalItem {
  id: string;
  userName: string;
  userEmail?: string;
  type: string;
  detail: string;
  entityId?: string;
  entityType:
    | "topic_submission"
    | "course_completion"
    | "learning_path_enrollment"
    | "course_enrollment";
  createdAt?: string | null;
}

interface ActivityItem {
  id: string;
  title: string;
  time: string;
  rawLog: AuditLog;
}

interface TaskItem {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const params = useParams();
  const activeNav = (params["*"] as NavItem) || "overview";
  const setActiveNav = (nav: NavItem) => {
    navigate(`/admin/${nav}`);
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navTransitioning, setNavTransitioning] = useState(false);
  const prevNavRef = useRef(activeNav);
  useEffect(() => {
    if (prevNavRef.current !== activeNav) {
      prevNavRef.current = activeNav;
      setNavTransitioning(true);
      const timer = setTimeout(() => setNavTransitioning(false), 400);
      return () => clearTimeout(timer);
    }
  }, [activeNav]);
  const [quizNavOpen, setQuizNavOpen] = useState(activeNav === "quiz" || activeNav === "quiz-scores");
  const [approvalsNavOpen, setApprovalsNavOpen] = useState(
    activeNav === "activity" ||
    activeNav === "activity-enrollments" ||
    activeNav === "activity-submissions"
  );
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    el.classList.add("is-scrolling");
    if (navScrollTimer.current) clearTimeout(navScrollTimer.current);
    navScrollTimer.current = setTimeout(() => el.classList.remove("is-scrolling"), 600);
  };
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
  const [enrollmentHealth, setEnrollmentHealth] = useState<EnrollmentHealth>({
    active: 0,
    pending: 0,
    completed: 0,
    dropped: 0,
    total: 0,
  });
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [selectedActivityLog, setSelectedActivityLog] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [approvalFocus, setApprovalFocus] = useState<{
    submissionId?: string | null;
    section?: ApprovalSection | null;
  } | null>(null);

  const { signOut } = useAuth();
  const { user } = useUser();
  const { role: userRole, loading: roleLoading } = useUserRole(user?.id);
  const todayDate = getTodayDateString();

  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [profileDraft, setProfileDraft] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaToggleLoading, setMfaToggleLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const getAvatarPublicUrl = (path: string | null | undefined) => {
    if (!path || !supabase) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user?.id) return;
    if (e.target) e.target.value = "";
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setProfileUpdateError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileUpdateError("Image must be under 2 MB.");
      return;
    }
    setAvatarUploading(true);
    setProfileUpdateError(null);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setProfile((prev: any) => ({ ...(prev ?? {}), avatar_url: filePath }));
      setProfileDraft((prev: any) => ({ ...(prev ?? {}), avatar_url: filePath }));
      setAvatarBroken(false);
      setProfileUpdateSuccess("Profile photo updated.");
      setTimeout(() => setProfileUpdateSuccess(null), 3000);
    } catch (err: any) {
      setProfileUpdateError(err?.message || "Failed to upload photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

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
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch MFA status
  useEffect(() => {
    if (!user) return;
    mfaService.checkStatus().then((res) => setMfaEnabled(res?.mfaEnabled ?? false)).catch(() => {});
  }, [user]);

  const handleMfaToggle = async () => {
    setMfaToggleLoading(true);
    try {
      const result = await mfaService.toggle(!mfaEnabled);
      setMfaEnabled(result?.mfaEnabled ?? !mfaEnabled);
    } catch (err) {
      console.error("Failed to toggle MFA:", err);
    } finally {
      setMfaToggleLoading(false);
    }
  };

  const handleProfileFieldChange = (field: string, value: string) => {
    const nextValue =
      field === "company_id_no" ? sanitizeCompanyId(value)
      : field === "first_name" || field === "last_name" ? sanitizeName(value)
      : value;
    setProfileDraft((prev: any) => ({ ...(prev ?? {}), [field]: nextValue }));
  };

  const isCompanyIdTaken = async (companyId: string, currentUserId: string) => {
    if (!supabase) return false;
    const { data: rpcData, error: rpcError } = await supabase.rpc("is_company_id_taken", {
      p_company_id_no: companyId,
      p_exclude_user_id: currentUserId,
    });
    if (!rpcError && typeof rpcData === "boolean") {
      return rpcData;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id_no", companyId)
      .neq("id", currentUserId)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
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
    if (profileDraft?.birthday && profileDraft.birthday > todayDate) {
      setProfileUpdateError("Birthdate must not exceed today.");
      return;
    }
    if (profileDraft?.company_id_no && !COMPANY_ID_REGEX.test(profileDraft.company_id_no)) {
      setProfileUpdateError("Company ID must be numbers only and up to 7 digits.");
      return;
    }
    if (profileDraft?.company_id_no) {
      const companyIdTaken = await isCompanyIdTaken(profileDraft.company_id_no, user.id);
      if (companyIdTaken) {
        setProfileUpdateError("Company ID already exists. Please use a different Company ID.");
        return;
      }
    }
    setProfileSaving(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
    try {
      const updates = {
        first_name: profileDraft?.first_name ?? "",
        last_name: profileDraft?.last_name ?? "",
        gender: profileDraft?.gender || null,
        birthday: profileDraft?.birthday || null,
        address: profileDraft?.address ?? "",
        company_id_no: profileDraft?.company_id_no || null,
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
    } catch (err: any) {
      if (err?.code === "23505") {
        setProfileUpdateError("Company ID already exists. Please use a different Company ID.");
      } else {
        setProfileUpdateError(err?.message || "Failed to update profile.");
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const buildActivityTitle = (log: AuditLog) => {
    const details = (log.details ?? {}) as Record<string, unknown>;
    const title = typeof details.title === "string" ? details.title : null;
    const from = typeof details.from === "string" ? details.from : null;
    const topicTitle = typeof details.topic_title === "string" ? details.topic_title : null;
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
      activity: "Project",
      activity_submission: "Project Submission",
    };
    const entity = entityLabels[log.entity_type] ?? log.entity_type.replace(/_/g, " ");

    switch (log.action) {
      case "created":
        return title ? `Created ${entity}: ${title}` : `Created ${entity}`;
      case "updated":
        return title ? `Updated ${entity}: ${title}` : `Updated ${entity}`;
      case "status_changed":
        if (title && from && to) {
          return `${entity} Status Changed: ${title} (${from}: ${to})`;
        }
        if (title && to) {
          return `${entity} Status Updated: ${title}: ${to}`;
        }
        if (to) {
          return `${entity} Status Updated: ${to}`;
        }
        return `${entity} Status Updated`;
      case "totals_recalculated":
        if (title && topicTitle) {
          return `Recalculated ${entity} totals: ${title} (topic updated: ${topicTitle})`;
        }
        if (title) {
          return `Recalculated ${entity} totals: ${title}`;
        }
        return `Recalculated ${entity} totals`;
      case "soft_deleted":
      case "deleted":
      case "deactivated":
      case "removed":
        return title ? `Removed ${entity}: ${title}` : `Removed ${entity}`;
      default:
        return title ? `${entity}: ${title}` : `${entity} project`;
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const resolveEnrollmentBucket = (
    status?: string | null
  ): "active" | "pending" | "completed" | "dropped" => {
    const normalized = (status ?? "pending").toLowerCase();
    if (["active", "approved", "enrolled"].includes(normalized)) return "active";
    if (normalized === "pending") return "pending";
    if (normalized === "completed") return "completed";
    if (["rejected", "removed", "dropped"].includes(normalized)) return "dropped";
    return "pending";
  };

  const buildEnrollmentHealth = (
    courseEnrollments: Array<{ status?: string | null }>,
    learningPathEnrollments: Array<{ status?: string | null }>
  ): EnrollmentHealth => {
    const combined = [...courseEnrollments, ...learningPathEnrollments];
    const health: EnrollmentHealth = {
      active: 0,
      pending: 0,
      completed: 0,
      dropped: 0,
      total: combined.length,
    };
    combined.forEach((entry) => {
      const bucket = resolveEnrollmentBucket(entry.status);
      health[bucket] += 1;
    });
    return health;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [
          courses,
          topics,
          users,
          topicSubmissions,
          courseCompletionRequests,
          enrollments,
          learningPathEnrollments,
          learningPaths,
        ] = await Promise.all([
          superAdminService.listCourses(),
          superAdminService.listTopics(),
          superAdminService.listUsers(),
          superAdminService.listTopicCompletionRequests(),
          superAdminService.listCourseCompletionRequests(),
          superAdminService.listEnrollments(),
          superAdminService.listLearningPathEnrollments(),
          superAdminService.listLearningPaths(),
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

        // Create a learning path lookup map
        const learningPathMap = new Map<string, string>();
        learningPaths.forEach((path) => learningPathMap.set(path.id, path.title));

        // Calculate stats
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const activeCourses = courses.filter(c => c.status === "published" || c.status === "active").length;
        const coursesThisMonth = courses.filter(c => new Date(c.created_at ?? "") >= monthAgo).length;
        const pendingTopicSubmissions = topicSubmissions.filter(s => s.status === "pending").length;
        const pendingCourseRequests = courseCompletionRequests.filter(r => r.status === "pending").length;
        const pendingCourseEnrollments = enrollments.filter(
          (entry) => (entry.status ?? "pending") === "pending"
        ).length;
        const pendingLearningPathEnrollments = learningPathEnrollments.filter(
          (entry) => (entry.status ?? "pending") === "pending"
        ).length;
        const totalPending =
          pendingTopicSubmissions +
          pendingCourseRequests +
          pendingCourseEnrollments +
          pendingLearningPathEnrollments;
        const activeLearnerIds = new Set(
          [...enrollments, ...learningPathEnrollments]
            .map((entry) => entry.user_id)
            .filter(Boolean)
        );
        const enrollmentHealth = buildEnrollmentHealth(enrollments, learningPathEnrollments);

        setStats({
          activeCourses,
          coursesThisMonth,
          topicsLibrary: topics.length,
          topicsAwaitingReview: pendingTopicSubmissions,
          activeLearners: activeLearnerIds.size,
          completionRate: 87, // Placeholder - would need enrollment data
          pendingApprovals: totalPending,
          approvalsToday: Math.min(5, totalPending),
        });
        setEnrollmentHealth(enrollmentHealth);

        // Approvals queue - with actual user names and details
        const approvalItems: ApprovalItem[] = [
          ...topicSubmissions.filter(s => s.status === "pending").map(s => {
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
              createdAt: s.submitted_at ?? s.created_at ?? null,
            };
          }),
          ...courseCompletionRequests.filter(r => r.status === "pending").map(r => {
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
              createdAt: r.created_at ?? null,
            };
          }),
          ...learningPathEnrollments
            .filter((entry) => (entry.status ?? "pending") === "pending")
            .map((entry) => {
              const submitter = userMap.get(entry.user_id);
              const pathTitle = learningPathMap.get(entry.learning_path_id) ?? "Learning Path";
              return {
                id: entry.id,
                userName: submitter?.username ?? submitter?.first_name ?? "Unknown User",
                userEmail: submitter?.email ?? undefined,
                type: "Learning path enrollment",
                detail: pathTitle,
                entityId: entry.learning_path_id,
                entityType: "learning_path_enrollment" as const,
                createdAt: entry.enrolled_at ?? entry.created_at ?? null,
              };
            }),
          ...enrollments
            .filter((entry) => (entry.status ?? "pending") === "pending")
            .map((entry) => {
              const submitter = userMap.get(entry.user_id);
              const courseTitle = courseMap.get(entry.course_id) ?? "Course enrollment";
              return {
                id: entry.id,
                userName: submitter?.username ?? submitter?.first_name ?? "Unknown User",
                userEmail: submitter?.email ?? undefined,
                type: "Course enrollment",
                detail: courseTitle,
                entityId: entry.course_id,
                entityType: "course_enrollment" as const,
                createdAt: entry.created_at ?? null,
              };
            }),
        ];
        const sortedApprovals = approvalItems
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
          )
          .slice(0, 5);
        setApprovals(sortedApprovals);

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
            limit: 12,
          });
          setActivities(
            logs.map((log) => ({
              id: log.id,
              title: buildActivityTitle(log),
              time: formatTimeAgo(log.timestamp ?? ""),
              rawLog: log,
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

  useEffect(() => {
    if (activeNav === "quiz" || activeNav === "quiz-scores") {
      setQuizNavOpen(true);
    }
    if (
      activeNav === "activity" ||
      activeNav === "activity-enrollments" ||
      activeNav === "activity-submissions"
    ) {
      setApprovalsNavOpen(true);
    }
  }, [activeNav]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const getApprovalNavItem = (section: ApprovalSection): ApprovalNavItem =>
    section === "learning_path_enrollments" || section === "course_enrollments"
      ? "activity-enrollments"
      : "activity-submissions";

  const handleReviewApproval = (item: ApprovalItem) => {
    if (item.entityType === "topic_submission") {
      setActiveNav("activity-submissions");
      setApprovalFocus({ submissionId: item.id, section: "topic_submissions" });
    } else if (item.entityType === "course_completion") {
      setActiveNav("activity-submissions");
      setApprovalFocus({ section: "course_completion" });
    } else if (item.entityType === "learning_path_enrollment") {
      setActiveNav("activity-enrollments");
      setApprovalFocus({ section: "learning_path_enrollments" });
    } else if (item.entityType === "course_enrollment") {
      setActiveNav("activity-enrollments");
      setApprovalFocus({ section: "course_enrollments" });
    }
  };

  const handleOpenApprovals = (
    section: ApprovalSection = "learning_path_enrollments"
  ) => {
    setActiveNav(getApprovalNavItem(section));
    setApprovalFocus({ section });
  };

  const navItems: { key: NavItem; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <OverviewIcon /> },
    { key: "courses", label: "Courses", icon: <CoursesIcon /> },
    { key: "learning-paths", label: "Learning Paths", icon: <LearningPathIcon /> },
    { key: "topics", label: "Topics", icon: <TopicsIcon /> },
    { key: "users", label: "Users", icon: <UsersIcon /> },
    { key: "projects", label: "Projects", icon: <ActivityIcon /> },
    { key: "activity", label: "Approvals", icon: <ApprovalsIcon /> },
    { key: "quiz", label: "Quizzes", icon: <QuizIcon /> },
    { key: "forms", label: "Forms", icon: <FormsIcon /> },
    { key: "reports", label: "Reports", icon: <ReportsIcon /> },
    { key: "evaluation", label: "Evaluation", icon: <EvaluationIcon /> },
    { key: "profile", label: "Profile", icon: <ProfileIcon /> },
  ];

  const sidebarDisplayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "Admin");
  const sidebarInitials = sidebarDisplayName
    .split(" ")
    .map((p: string) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";
  const sidebarRoleLabel = roleLoading
    ? ""
    : userRole === "superadmin"
      ? "Super Admin"
      : userRole === "admin"
        ? "Admin"
        : "User";

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
      [profileView.first_name, profileView.last_name].filter(Boolean).join(" ") ||
      user?.username ||
      (user?.email ? user.email.split("@")[0] : "Admin");
    const initials =
      displayName
        ?.split(" ")
        .map((part: string) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "AD";
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
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative group flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-purple/20 text-sm font-semibold uppercase text-accent-purple overflow-hidden"
              title="Change profile photo"
            >
              {profileView.avatar_url && !avatarBroken ? (
                <img
                  src={getAvatarPublicUrl(profileView.avatar_url) ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {avatarUploading ? (
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                ) : (
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                )}
              </div>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div>
              <h2 className="font-display text-2xl text-white">{displayName}</h2>
              <p className="text-sm text-slate-400">
                {profileView.email ?? user?.email ?? "No email on file"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                maxLength={50}
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
                maxLength={50}
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
              Birth Date
            </label>
            {isProfileEditing ? (
              <input
                type="date"
                value={profileView.birthday ?? ""}
                onChange={(event) => handleProfileFieldChange("birthday", event.target.value)}
                max={todayDate}
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
                inputMode="numeric"
                maxLength={7}
                pattern="[0-9]{1,7}"
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
            <>
              <textarea
                rows={3}
                value={profileView.address ?? ""}
                onChange={(event) => handleProfileFieldChange("address", event.target.value)}
                maxLength={200}
                className={`${inputClass} resize-none`}
              />
              <CharacterCounter current={(profileView.address ?? "").length} max={200} />
            </>
          ) : (
            <div className={`${readOnlyClass} whitespace-pre-wrap`}>
              {profileView.address || "Not set"}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Security</p>
          <div className="mt-3 rounded-xl border border-white/10 bg-ink-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/20 text-accent-purple">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Two-factor authentication</p>
                  <p className="text-xs text-slate-400">
                    Extra security via email verification code
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleMfaToggle}
                disabled={mfaToggleLoading}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-purple/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                  mfaEnabled ? "bg-accent-purple" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    mfaEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {profileUpdateError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert" aria-live="assertive">
            {profileUpdateError}
          </div>
        )}
        {profileUpdateSuccess && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" aria-live="polite">
            {profileUpdateSuccess}
          </div>
        )}
      </div>
    );
  };

  const getBreadcrumbItems = (): { label: string; onClick?: () => void }[] => {
    const dashboard = { label: "Dashboard", onClick: () => setActiveNav("overview") };
    const navLabelMap: Record<string, string> = {
      overview: "Overview",
      courses: "Courses",
      "learning-paths": "Learning Paths",
      topics: "Topics",
      users: "Users",
      projects: "Projects",
      activity: "Approvals",
      "activity-enrollments": "Approvals",
      "activity-submissions": "Approvals",
      quiz: "Quizzes",
      "quiz-scores": "Quizzes",
      forms: "Forms",
      reports: "Reports",
      evaluation: "Evaluation",
      profile: "Profile",
    };

    if (activeNav === "overview") {
      return [{ label: "Dashboard" }];
    }

    const sectionLabel = navLabelMap[activeNav] ?? activeNav;

    // Sub-sections: quiz-scores is a child of Quizzes
    if (activeNav === "quiz-scores") {
      return [
        dashboard,
        { label: "Quizzes", onClick: () => setActiveNav("quiz") },
        { label: "Quiz Scores" },
      ];
    }

    // Sub-sections: activity-enrollments / activity-submissions are children of Approvals
    if (activeNav === "activity-enrollments") {
      return [
        dashboard,
        { label: "Approvals", onClick: () => setActiveNav("activity") },
        { label: "Enrollment Approvals" },
      ];
    }
    if (activeNav === "activity-submissions") {
      return [
        dashboard,
        { label: "Approvals", onClick: () => setActiveNav("activity") },
        { label: "Submission Approvals" },
      ];
    }

    return [dashboard, { label: sectionLabel }];
  };

  const renderContent = () => {
    switch (activeNav) {
      case "courses":
        return <CoursesSection editable={false} />;
      case "learning-paths":
        return <LearningPathsSection />;
      case "topics":
        return <TopicsSection role="admin" />;
      case "users":
        return <UsersSection readOnly />;
      case "projects":
        return <ActivitiesSection variant="projects" editable={false} />;
      case "activity":
      case "activity-enrollments":
        return (
          <ActivitiesSection
            focusSubmissionId={approvalFocus?.submissionId ?? null}
            focusSection={approvalFocus?.section ?? null}
            onFocusHandled={() => setApprovalFocus(null)}
            variant="approvals"
            approvalPage="enrollments"
            editable={false}
          />
        );
      case "activity-submissions":
        return (
          <ActivitiesSection
            focusSubmissionId={approvalFocus?.submissionId ?? null}
            focusSection={approvalFocus?.section ?? null}
            onFocusHandled={() => setApprovalFocus(null)}
            variant="approvals"
            approvalPage="submissions"
            editable={false}
          />
        );
      case "quiz":
        return <QuizzesSection view="quizzes" />;
      case "quiz-scores":
        return <QuizzesSection view="scores" />;
      case "forms":
        return <FormsSection />;
      case "reports":
        return <ReportsSection />;
      case "evaluation":
        return <EvaluationSection />;
      case "profile":
        return renderProfileSection();
      default:
        return renderOverview();
    }
  };

  const showSetupGuide =
    !isLoading &&
    stats.activeCourses === 0 &&
    stats.topicsLibrary === 0 &&
    stats.activeLearners === 0;

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

      {showSetupGuide && (
        <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <h3 className="text-white font-semibold">Getting started</h3>
          <p className="text-xs text-slate-500 mt-1">
            Set up your first learning path and enroll trainees to begin tracking progress.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveNav("learning-paths")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
            >
              Create learning paths
            </button>
            <button
              type="button"
              onClick={() => setActiveNav("courses")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
            >
              Add courses
            </button>
            <button
              type="button"
              onClick={() => setActiveNav("topics")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
            >
              Add topics
            </button>
            <button
              type="button"
              onClick={() => setActiveNav("users")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10"
            >
              Enroll learners
            </button>
          </div>
        </div>
      )}

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollment Health Card */}
        <div className="lg:col-span-2 rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Enrollment Health</h3>
              <p className="text-xs text-slate-500">Course and learning path enrollments</p>
            </div>
            <button
              onClick={() => handleOpenApprovals("learning_path_enrollments")}
              className="text-xs font-semibold text-accent-purple hover:text-accent-purple/80 transition-colors"
            >
              Review pending
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`enrollment-skeleton-${i}`} className="rounded-xl bg-ink-750/50 p-4 animate-pulse h-20" />
              ))
            ) : (
              <>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Active</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{enrollmentHealth.active}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Pending</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{enrollmentHealth.pending}</p>
                </div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300">Completed</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{enrollmentHealth.completed}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300">Dropped</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{enrollmentHealth.dropped}</p>
                </div>
              </>
            )}
          </div>

          {!isLoading && (
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total enrollments: {enrollmentHealth.total}</span>
              <span>{enrollmentHealth.pending} pending approvals</span>
            </div>
          )}
        </div>

        {/* Approvals Queue */}
        <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold">Approvals Queue</h3>
              <p className="text-xs text-slate-500">Pending verifications</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenApprovals("learning_path_enrollments")}
              className="text-[10px] font-semibold uppercase tracking-widest text-accent-purple hover:text-accent-purple/80 transition-colors"
            >
              View all
            </button>
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
                    <p className="text-[10px] text-slate-500 truncate">
                      Submitted {formatDateTime(item.createdAt)}
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
        {/* Recent Activity */}
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
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => setSelectedActivityLog(activity.rawLog)}
                  className="w-full flex items-center gap-3 rounded-xl bg-ink-750/50 p-2 hover:bg-ink-700/60 transition-colors text-left"
                >
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-accent-purple/40 bg-ink-900/70 text-xs font-semibold text-accent-purple">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{activity.title}</p>
                    <p className="text-[10px] text-slate-500">{activity.time}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-600">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            )}
          </div>
        </div>

        {/* Next Actions */}
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
          <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto">
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
            <img
              src={logoThodemy}
              alt="Thodemy"
              className="h-32 w-auto object-contain shrink-0"
              loading="lazy"
            />
          </div>

          {/* Navigation Label */}
          <div className="px-6 pt-6 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Navigation
            </span>
          </div>

          {/* Nav Items */}
          <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 px-4 pb-6 overflow-y-auto scrollbar-autohide">
            <ul className="flex flex-col gap-2 list-none m-0 p-0">
              {navItems.map(item => {
                if (item.key === "quiz") {
                  const isQuizActive = activeNav === "quiz" || activeNav === "quiz-scores";
                  return (
                    <li key="quiz-group">
                      <button
                        type="button"
                        onClick={() => setQuizNavOpen(prev => !prev)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                          ${isQuizActive ? "bg-ink-700 text-white border border-accent-purple/30" : "text-slate-400 hover:text-white hover:bg-ink-800"}
                        `}
                      >
                        <span className={isQuizActive ? "text-accent-purple" : "text-slate-500"}>
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform duration-200 ${quizNavOpen ? "rotate-180" : ""}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {quizNavOpen && (
                        <ul className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/10 pl-3 list-none p-0">
                          <li>
                            <button
                              type="button"
                              onClick={() => { setActiveNav("quiz"); setSidebarOpen(false); }}
                              className={`text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${activeNav === "quiz" ? "text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Quizzes
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={() => { setActiveNav("quiz-scores"); setSidebarOpen(false); }}
                              className={`text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${activeNav === "quiz-scores" ? "text-white" : "text-slate-400 hover:text-white"}`}
                            >
                              Quiz Scores
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  );
                }
                if (item.key === "activity") {
                  const isApprovalsActive =
                    activeNav === "activity" ||
                    activeNav === "activity-enrollments" ||
                    activeNav === "activity-submissions";
                  return (
                    <li key="approvals-group">
                      <button
                        type="button"
                        onClick={() => setApprovalsNavOpen(prev => !prev)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                          ${isApprovalsActive ? "bg-ink-700 text-white border border-accent-purple/30" : "text-slate-400 hover:text-white hover:bg-ink-800"}
                        `}
                      >
                        <span className={isApprovalsActive ? "text-accent-purple" : "text-slate-500"}>
                          {item.icon}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform duration-200 ${approvalsNavOpen ? "rotate-180" : ""}`}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {approvalsNavOpen && (
                        <ul className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/10 pl-3 list-none p-0">
                          {APPROVAL_NAV_ITEMS.map((approvalItem) => (
                            <li key={approvalItem.key}>
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovalsNavOpen(true);
                                  handleOpenApprovals(approvalItem.defaultSection);
                                  setSidebarOpen(false);
                                }}
                                className={`text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                                  activeNav === approvalItem.key ||
                                  (activeNav === "activity" && approvalItem.key === "activity-enrollments")
                                    ? "text-white"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                {approvalItem.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }
                return (
                  <li key={item.key}>
                    <a
                      href={`/admin/${item.key}`}
                      onClick={(e) => {
                        e.preventDefault();
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
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-xs font-semibold text-accent-purple overflow-hidden">
                {profile?.avatar_url && !avatarBroken ? (
                  <img src={getAvatarPublicUrl(profile.avatar_url) ?? ""} alt="" className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
                ) : sidebarInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{sidebarDisplayName}</p>
                <p className="truncate text-xs text-slate-500">{sidebarRoleLabel}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header - no search bar */}
          <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur-sm border-b border-white/5">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5">
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
                    Admin Workspace
                  </span>
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate">
                    {activeNav === "overview"
                      ? "Admin Dashboard Overview"
                      : activeNav === "quiz-scores"
                        ? "Quiz Scores"
                        : APPROVAL_NAV_ITEMS.find((item) => item.key === activeNav)?.label ??
                          navItems.find((n) => n.key === activeNav)?.label ??
                          "Approvals"}
                  </h1>
                </div>
              </div>

              {/* Right Side - New Course Button & Avatar only */}
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

                {/* Email pill */}
                <div className="hidden sm:flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
                  <span className="max-w-[200px] truncate text-xs text-slate-300">
                    {user?.email ?? "Admin"}
                  </span>
                </div>

                {/* Avatar with dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen((prev) => !prev)}
                    className="w-9 h-9 rounded-full bg-ink-700 border border-white/10 flex items-center justify-center text-xs font-semibold text-white hover:border-accent-purple/40 transition-colors overflow-hidden"
                  >
                    {profile?.avatar_url && !avatarBroken ? (
                      <img src={getAvatarPublicUrl(profile.avatar_url) ?? ""} alt="" className="h-full w-full object-cover" onError={() => setAvatarBroken(true)} />
                    ) : sidebarInitials}
                  </button>
                  {profileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-ink-800 shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm font-semibold text-white">Welcome {sidebarDisplayName}!</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setProfileDropdownOpen(false); setActiveNav("profile"); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-ink-700 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => { setProfileDropdownOpen(false); handleSignOut(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-ink-700 transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <Breadcrumb items={getBreadcrumbItems()} />
            {navTransitioning ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-in">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-[3px] border-accent-purple/20" />
                  <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-accent-purple/70 animate-spin" />
                </div>
              </div>
            ) : renderContent()}
          </div>
        </main>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivityLog && (() => {
        const log = selectedActivityLog;
        const details = (log.details ?? {}) as Record<string, unknown>;
        const actor = log.actor;
        const actorName = actor
          ? [actor.first_name, actor.last_name].filter(Boolean).join(" ") || actor.username || actor.email || log.actor_id
          : log.actor_id ?? "Unknown";
        const entityLabels: Record<string, string> = {
          topic: "Topic", course: "Course", learning_path: "Learning Path",
          user: "User", enrollment: "Enrollment", activity: "Project",
          activity_submission: "Project Submission", topic_submission: "Topic Submission",
          course_completion_request: "Course Completion Proof",
        };
        const entityLabel = entityLabels[log.entity_type] ?? log.entity_type.replace(/_/g, " ");
        const actionLabel = log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const fullTimestamp = log.timestamp
          ? new Date(log.timestamp).toLocaleString("en-US", { dateStyle: "long", timeStyle: "medium" })
          : "--";
        const detailEntries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== "");
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/20">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-purple">Activity Log</p>
                    <h3 className="text-base font-semibold text-white">{actionLabel}</h3>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedActivityLog(null)} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-ink-800 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Who */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Performed by</p>
                    <p className="text-sm font-medium text-white mt-0.5">{actorName}</p>
                    {actor?.email && actorName !== actor.email && (
                      <p className="text-xs text-slate-500">{actor.email}</p>
                    )}
                  </div>
                </div>
                {/* What */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Action</p>
                    <p className="text-sm font-medium text-white mt-0.5">{actionLabel} — {entityLabel}</p>
                    {(() => {
                      const entityName = typeof details.title === "string" ? details.title
                        : typeof details.username === "string" ? details.username
                        : null;
                      return entityName ? (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{entityName}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
                {/* When */}
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">When</p>
                    <p className="text-sm font-medium text-white mt-0.5">{fullTimestamp}</p>
                  </div>
                </div>
                {/* Details */}
                {detailEntries.length > 0 && (
                  <div className="rounded-xl border border-white/5 bg-ink-800/60 p-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Details</p>
                    {detailEntries.map(([key, val]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <span className="text-xs text-slate-500 shrink-0">{key.replace(/_/g, " ")}</span>
                        <span className="text-xs text-slate-300 text-right break-all">{typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
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
  onClick?: () => void;
}

const StatCard = ({ label, value, delta, deltaColor, isLoading, onClick }: StatCardProps) => {
  const content = (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {isLoading ? (
        <div className="mt-2 h-7 w-16 bg-ink-700 rounded animate-pulse" />
      ) : (
        <p className="text-xl sm:text-2xl font-semibold text-white mt-1">{value}</p>
      )}
      <p className={`text-xs mt-1 ${deltaColor}`}>{delta}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl bg-ink-800/50 border border-white/10 p-4 text-left transition hover:border-accent-purple/40 hover:bg-ink-800/70"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-2xl bg-ink-800/50 border border-white/10 p-4">{content}</div>;
};

export default AdminDashboard;


