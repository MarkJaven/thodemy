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

const tabs: TabDefinition[] = [
  { key: "users", label: "Users" },
  { key: "courses", label: "Courses" },
  { key: "activity", label: "Activity" },
  { key: "quiz", label: "Quiz" },
  { key: "forms", label: "Forms" },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("courses");
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/login", { replace: true });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "users":
        return <UsersSection readOnly />;
      case "courses":
        return <CoursesSection />;
      case "activity":
        return <ActivitiesSection />;
      case "quiz":
        return <QuizzesSection />;
      case "forms":
        return <FormsSection />;
      default:
        return (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            This section is restricted. Contact your superadmin for access.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-[#bda6ff]/20 via-[#5f3dc4]/20 to-[#140c2c] px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1c1436]/95 via-[#17122b]/95 to-[#0c0b14]/95 p-6 shadow-glow backdrop-blur sm:p-8">
          <Navbar userEmail={user?.email} onSignOut={handleSignOut} />

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Admin</p>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Control Center
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                Build courses, manage enrollments, and monitor learner progress.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-xs uppercase tracking-[0.3em] text-slate-400">
              Admin operations
            </div>
          </div>

          <TabShell tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
            <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              {renderTab()}
            </div>
          </TabShell>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
