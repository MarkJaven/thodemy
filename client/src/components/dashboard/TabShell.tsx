import type { ReactNode } from "react";

export type TabKey =
  | "enroll"
  | "track"
  | "activity"
  | "quiz"
  | "forms"
  | "users"
  | "courses"
  | "topics";

export type TabDefinition = {
  key: TabKey;
  label: string;
  description?: string;
};

type TabShellProps = {
  tabs: TabDefinition[];
  activeTab: TabKey;
  onChange: (nextTab: TabKey) => void;
  children: ReactNode;
};

const TabShell = ({ tabs, activeTab, onChange, children }: TabShellProps) => {
  return (
    <div className="mt-10">
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex flex-wrap gap-3 rounded-full border border-white/10 bg-white/5 p-2"
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
      <div className="mt-8">{children}</div>
    </div>
  );
};

export default TabShell;
