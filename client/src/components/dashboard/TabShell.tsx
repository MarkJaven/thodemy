import type { ReactNode } from "react";

export type TabKey =
  | "enroll"
  | "track"
  | "activity"
  | "quiz"
  | "forms"
  | "users"
  | "courses"
  | "topics"
  | "learning-paths";

export type TabDefinition = {
  key: TabKey;
  label: string;
  description?: string;
  icon?: ReactNode;
  count?: number;
};

type TabShellProps = {
  tabs: TabDefinition[];
  activeTab: TabKey;
  onChange: (nextTab: TabKey) => void;
  children: ReactNode;
};

const TabShell = ({ tabs, activeTab, onChange, children }: TabShellProps) => {
  return (
    <div className="mt-8 flex flex-col flex-1">
      {/* Tab Navigation */}
      <div className="relative">
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="flex flex-wrap gap-6 border-b border-white/10"
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.key}`}
                id={`tab-${tab.key}`}
                onClick={() => onChange(tab.key)}
                className={`group relative flex items-center gap-2 border-b-2 pb-3 text-xs font-medium uppercase tracking-widest transition-colors duration-200 ${
                  isActive
                    ? "border-accent-purple text-white"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {/* Tab icon (if provided) */}
                {tab.icon && (
                  <span className={`transition-colors duration-200 ${isActive ? "text-ink-800" : "text-slate-500 group-hover:text-slate-300"}`}>
                    {tab.icon}
                  </span>
                )}

                {/* Tab label */}
                <span>{tab.label}</span>

                {/* Count badge (if provided) */}
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span className={`ml-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold transition-colors duration-200 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-white/5 text-slate-400 group-hover:bg-white/10"
                  }`}>
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6 flex-1 animate-fade-in">{children}</div>
    </div>
  );
};

export default TabShell;
