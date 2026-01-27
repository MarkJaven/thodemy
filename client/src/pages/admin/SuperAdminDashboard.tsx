import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UsersSection from "./sections/UsersSection";
import CoursesSection from "./sections/CoursesSection";
import ActivitiesSection from "./sections/ActivitiesSection";
import QuizzesSection from "./sections/QuizzesSection";
import FormsSection from "./sections/FormsSection";

type AdminTab = "users" | "courses" | "activities" | "quizzes" | "forms";

const tabs: { key: AdminTab; label: string }[] = [
  { key: "users", label: "Users" },
  { key: "courses", label: "Courses" },
  { key: "activities", label: "Activities" },
  { key: "quizzes", label: "Quizzes" },
  { key: "forms", label: "Forms" },
];

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "courses":
        return <CoursesSection />;
      case "activities":
        return <ActivitiesSection />;
      case "quizzes":
        return <QuizzesSection />;
      case "forms":
        return <FormsSection />;
      case "users":
      default:
        return <UsersSection />;
    }
  };

  return (
    <div className="min-h-screen bg-ink-900 text-slate-100">
      <div className="min-h-screen bg-gradient-to-br from-[#bda6ff]/20 via-[#5f3dc4]/20 to-[#140c2c] px-4 py-6 sm:px-8">
        <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col gap-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1c1436]/95 via-[#17122b]/95 to-[#0c0b14]/95 p-6 shadow-glow backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Super admin</p>
              <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Control Center
              </h1>
              <p className="mt-3 max-w-xl text-sm text-slate-300">
                Manage users, courses, activities, quizzes, and compliance-ready records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white/20"
            >
              Sign out
            </button>
          </div>

          <div className="flex flex-wrap gap-3 rounded-full border border-white/10 bg-white/5 p-2">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                    isActive
                      ? "bg-white text-ink-900 shadow-[0_10px_25px_rgba(255,255,255,0.2)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="mt-2">
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
