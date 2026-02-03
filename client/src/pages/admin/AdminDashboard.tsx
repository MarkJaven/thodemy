import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/dashboard/Navbar";
import TabShell, { TabDefinition, TabKey } from "../../components/dashboard/TabShell";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks/useUser";
import CoursesSection from "./sections/CoursesSection";
import FormsSection from "./sections/FormsSection";
import QuizzesSection from "./sections/QuizzesSection";
import UsersSection from "./sections/UsersSection";
import ActivitiesSection from "./sections/ActivitiesSection";
import TopicsSection from "./sections/TopicsSection";
import LearningPathsSection from "./sections/LearningPathsSection";

// Tab icons
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CoursesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const TopicsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

const LearningPathIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="5" r="3" />
    <circle cx="19" cy="5" r="3" />
    <circle cx="5" cy="19" r="3" />
    <path d="M7.5 5h9" />
    <path d="M5 7.5v9" />
    <path d="M7.5 19h9.5" />
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

const FormsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const tabs: TabDefinition[] = [
  { key: "users", label: "Users", icon: <UsersIcon /> },
  { key: "topics", label: "Topics", icon: <TopicsIcon /> },
  { key: "courses", label: "Courses", icon: <CoursesIcon /> },
  { key: "learning-paths", label: "Learning Paths", icon: <LearningPathIcon /> },
  { key: "activity", label: "Activity", icon: <ActivityIcon /> },
  { key: "quiz", label: "Quiz", icon: <QuizIcon /> },
  { key: "forms", label: "Forms", icon: <FormsIcon /> },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("courses");
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/" });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "users":
        return <UsersSection readOnly />;
      case "topics":
        return <TopicsSection role="admin" />;
      case "courses":
        return <CoursesSection />;
      case "learning-paths":
        return <LearningPathsSection />;
      case "activity":
        return <ActivitiesSection />;
      case "quiz":
        return <QuizzesSection />;
      case "forms":
        return <FormsSection />;
      default:
        return (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <p className="text-sm text-slate-400">This section is restricted.</p>
            <p className="mt-1 text-xs text-slate-500">Contact your superadmin for access.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-accent-purple/15 via-accent-violet/10 to-ink-900 px-4 py-6 sm:px-6 lg:px-8">
        <div className="page-shell">
          {/* Navigation */}
          <Navbar userEmail={user?.email} onSignOut={handleSignOut} />

          {/* Page Header */}
          <div className="section-header">
            <div className="space-y-3">
              {/* Breadcrumb / Context */}
              <div className="flex items-center gap-2">
                <span className="badge-default">
                  <span className="status-dot status-dot-success mr-2" />
                  Admin
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl font-medium text-white sm:text-4xl">
                Control Center
              </h1>

              {/* Description */}
              <p className="max-w-xl text-sm leading-relaxed text-slate-400">
                Build learning paths, manage courses, track enrollments, and monitor learner progress across your organization.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="card-elevated flex flex-col items-center px-5 py-3">
                <p className="font-display text-xl font-semibold text-white">5</p>
                <p className="text-2xs uppercase tracking-widest text-slate-500">Sections</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation & Content */}
          <TabShell tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div
              role="tabpanel"
              id={`panel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              className="animate-fade-in"
            >
              {renderTab()}
            </div>
          </TabShell>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
