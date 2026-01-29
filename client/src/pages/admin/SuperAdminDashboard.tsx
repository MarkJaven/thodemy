import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/dashboard/Navbar";
import TabShell, { TabDefinition, TabKey } from "../../components/dashboard/TabShell";
import { useAuth } from "../../context/AuthContext";
import { useUser } from "../../hooks/useUser";
import UsersSection from "./sections/UsersSection";
import TopicsSection from "./sections/TopicsSection";
import LearningPathsSection from "./sections/LearningPathsSection";
import CoursesSection from "./sections/CoursesSection";

// Tab icons
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TopicsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    <path d="M9 12h6M9 16h6" />
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
    <path d="M7.5 5h9" />
    <path d="M5 7.5v9" />
    <path d="M7.5 19h9.5" />
  </svg>
);

const tabs: TabDefinition[] = [
  { key: "users", label: "Users", icon: <UsersIcon /> },
  { key: "topics", label: "Topics", icon: <TopicsIcon /> },
  { key: "courses", label: "Courses", icon: <CoursesIcon /> },
  { key: "learning-paths", label: "Learning Paths", icon: <LearningPathIcon /> },
];

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "topics":
        return <TopicsSection />;
      case "courses":
        return <CoursesSection />;
      case "learning-paths":
        return <LearningPathsSection />;
      case "users":
      default:
        return <UsersSection />;
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
                <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Super Admin
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl font-medium text-white sm:text-4xl">
                Control Center
              </h1>

              {/* Description */}
              <p className="max-w-xl text-sm leading-relaxed text-slate-400">
                Manage user accounts, assign roles, and curate the global topic library used across all courses in the platform.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="card-elevated flex flex-col items-center px-5 py-3">
                <p className="font-display text-xl font-semibold text-white">2</p>
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

export default SuperAdminDashboard;
