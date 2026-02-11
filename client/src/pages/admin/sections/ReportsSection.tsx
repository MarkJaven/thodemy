import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { reportService } from "../../../services/reportService";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, TopicProgress } from "../../../types/superAdmin";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const FileSpreadsheetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="12" y1="9" x2="12" y2="21" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Chart colours                                                      */
/* ------------------------------------------------------------------ */

const CHART_COLORS = {
  emerald: "#34D399",
  amber: "#FBBF24",
  purple: "#8B5CF6",
  indigo: "#6366F1",
  rose: "#FB7185",
  cyan: "#22D3EE",
};

const BAR_GRADIENT_COLORS = [
  "#8B5CF6",
  "#7C3AED",
  "#6D28D9",
  "#5B21B6",
  "#4C1D95",
];

/* ------------------------------------------------------------------ */
/*  Skeleton loader                                                    */
/* ------------------------------------------------------------------ */

const ChartSkeleton = () => (
  <div className="flex h-full w-full items-end justify-center gap-3 px-4 pb-4">
    {[40, 65, 50, 80, 55, 70].map((h, i) => (
      <div
        key={i}
        className="w-8 rounded-t-md bg-ink-700/50 animate-pulse"
        style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
);

const StatSkeleton = () => (
  <div className="rounded-2xl border border-white/5 bg-ink-800/40 p-5">
    <div className="h-4 w-20 rounded bg-ink-700/50 animate-pulse" />
    <div className="mt-3 h-8 w-16 rounded bg-ink-700/50 animate-pulse" />
    <div className="mt-2 h-3 w-24 rounded bg-ink-700/50 animate-pulse" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const ReportsSection = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  // User search / dropdown state
  const [userSearch, setUserSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trend date range filter (always 7-day windows)
  const [trendDaysAgo, setTrendDaysAgo] = useState(0); // 0 = latest 7 days, 7 = 7-14 days ago, etc.

  /* ---- data loading ---- */

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const data = await superAdminService.listUsers();
        setUsers(data);
      } catch (loadError) {
        console.error("Failed to load users for report filters:", loadError);
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const loadProgress = async () => {
      setProgressLoading(true);
      try {
        const data = await superAdminService.listTopicProgress();
        setTopicProgress(data);
      } catch (loadError) {
        console.error("Failed to load topic progress for reports:", loadError);
      } finally {
        setProgressLoading(false);
      }
    };
    loadProgress();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ---- derived data ---- */

  const userOptions = useMemo(() => {
    const mapped = users
      .filter((user) => user.role === "user")
      .map((user) => {
        const name =
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.username ||
          user.email ||
          "Unknown user";
        const label = user.email ? `${name} · ${user.email}` : name;
        return { id: user.id, label, name };
      });
    return mapped;
  }, [users]);

  const filteredDropdownOptions = useMemo(() => {
    if (!userSearch.trim()) return userOptions;
    const q = userSearch.toLowerCase();
    return userOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [userOptions, userSearch]);

  const filteredUsers = useMemo(
    () => users.filter((user) => user.role === "user"),
    [users]
  );

  const selectedUserLabel = useMemo(() => {
    if (selectedUserId === "all") return "All Users";
    return userOptions.find((opt) => opt.id === selectedUserId)?.name || "Selected user";
  }, [selectedUserId, userOptions]);

  const scopedProgress = useMemo(() => {
    const allowedIds = new Set(filteredUsers.map((user) => user.id));
    const base = topicProgress.filter((entry) => allowedIds.has(entry.user_id));
    if (selectedUserId === "all") return base;
    return base.filter((entry) => entry.user_id === selectedUserId);
  }, [filteredUsers, selectedUserId, topicProgress]);

  const progressSummary = useMemo(() => {
    const completed = scopedProgress.filter((entry) => entry.status === "completed").length;
    const inProgress = scopedProgress.filter((entry) => entry.status === "in_progress").length;
    const total = completed + inProgress;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, inProgress, total, completionRate };
  }, [scopedProgress]);

  const pieData = useMemo(
    () => [
      { name: "Completed", value: progressSummary.completed },
      { name: "In Progress", value: progressSummary.inProgress },
    ],
    [progressSummary]
  );

  const trendWindow = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - trendDaysAgo);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [trendDaysAgo]);

  const trendWindowLabel = useMemo(() => {
    const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(trendWindow.start)} – ${fmt(trendWindow.end)}`;
  }, [trendWindow]);

  const completionTrend = useMemo(() => {
    // Build a map of actual data
    const dataMap = new Map<string, number>();
    scopedProgress.forEach((entry) => {
      if (entry.status !== "completed" || !entry.end_date) return;
      const date = new Date(entry.end_date);
      if (Number.isNaN(date.getTime())) return;
      if (date < trendWindow.start || date > trendWindow.end) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      dataMap.set(key, (dataMap.get(key) || 0) + 1);
    });

    // Always show all 7 days in the window so the chart is consistent
    const days: { month: string; completed: number }[] = [];
    const cursor = new Date(trendWindow.start);
    while (cursor <= trendWindow.end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      const label = cursor.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
      days.push({ month: label, completed: dataMap.get(key) || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [scopedProgress, trendWindow]);

  const topLearners = useMemo(() => {
    const counts = new Map<string, number>();
    scopedProgress.forEach((entry) => {
      if (entry.status !== "completed") return;
      counts.set(entry.user_id, (counts.get(entry.user_id) || 0) + 1);
    });
    const nameById = new Map(
      filteredUsers.map((user) => [
        user.id,
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.username ||
          user.email ||
          "Unknown user",
      ])
    );
    const rows = Array.from(counts.entries())
      .map(([id, completed]) => ({
        userId: id,
        name: nameById.get(id) || "Unknown user",
        completed,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, selectedUserId === "all" ? 5 : 1);
    if (selectedUserId !== "all" && rows.length === 0) {
      const name =
        nameById.get(selectedUserId) ||
        userOptions.find((opt) => opt.id === selectedUserId)?.label ||
        "Selected user";
      return [{ userId: selectedUserId, name, completed: 0 }];
    }
    return rows;
  }, [filteredUsers, scopedProgress, selectedUserId, userOptions]);

  /* ---- tooltip ---- */

  const chartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-ink-900/95 px-4 py-3 text-xs shadow-xl backdrop-blur-sm">
        {label && <p className="mb-1 font-medium text-slate-300">{label}</p>}
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="flex items-center gap-2 text-slate-100">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            {entry.name || entry.dataKey}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  /* ---- download handler ---- */

  const handleDownloadUserChecklist = async () => {
    setDownloading(true);
    setError(null);
    try {
      const { blob, fileName } = await reportService.downloadUserChecklistXlsx(
        selectedUserId !== "all" ? selectedUserId : undefined
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the report."
      );
    } finally {
      setDownloading(false);
    }
  };

  /* ---- user dropdown helpers ---- */

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setDropdownOpen(false);
    setUserSearch("");
  };

  const handleClearSelection = () => {
    setSelectedUserId("all");
    setUserSearch("");
  };

  const isLoading = usersLoading || progressLoading;

  /* ================================================================== */
  /*  RENDER                                                             */
  /* ================================================================== */

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ============================================================= */}
      {/*  HEADER                                                        */}
      {/* ============================================================= */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Reports & Analytics</h2>
          <p className="mt-1 text-sm text-slate-400">
            Track learner progress, analyse trends, and export data.
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/*  USER FILTER BAR + EXPORT                                      */}
      {/* ============================================================= */}
      <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* User selector */}
          <div className="flex flex-1 items-center gap-3">
            <div ref={dropdownRef} className="relative flex-1 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  if (!dropdownOpen) {
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-ink-900/60 px-4 py-2.5 text-sm transition-all ${
                  dropdownOpen
                    ? "border-accent-purple/50 ring-1 ring-accent-purple/20"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-purple/20">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className={selectedUserId === "all" ? "text-slate-400" : "text-white font-medium"}>
                    {selectedUserLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedUserId !== "all" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearSelection();
                      }}
                      className="rounded-full p-0.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <XIcon />
                    </button>
                  )}
                  <span className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
                    <ChevronDownIcon />
                  </span>
                </div>
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/10 bg-ink-900 shadow-2xl animate-slide-up">
                  {/* Search input */}
                  <div className="border-b border-white/5 px-3 py-2">
                    <div className="flex items-center gap-2 rounded-lg bg-ink-800/80 px-3 py-2">
                      <span className="text-slate-500"><SearchIcon /></span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                      />
                      {userSearch && (
                        <button
                          type="button"
                          onClick={() => setUserSearch("")}
                          className="text-slate-500 hover:text-white"
                        >
                          <XIcon />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {/* All users option */}
                    <button
                      type="button"
                      onClick={() => handleSelectUser("all")}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedUserId === "all"
                          ? "bg-accent-purple/15 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple">
                        <UsersIcon />
                      </div>
                      <div>
                        <p className="font-medium">All Users</p>
                        <p className="text-[11px] text-slate-500">{filteredUsers.length} learners</p>
                      </div>
                      {selectedUserId === "all" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-accent-purple">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="my-1.5 border-t border-white/5" />

                    {filteredDropdownOptions.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-500">
                        No users match "{userSearch}"
                      </div>
                    ) : (
                      filteredDropdownOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectUser(opt.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            selectedUserId === opt.id
                              ? "bg-accent-purple/15 text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-700 text-[11px] font-semibold text-slate-300">
                            {opt.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{opt.name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {opt.label.includes("·") ? opt.label.split("·")[1].trim() : ""}
                            </p>
                          </div>
                          {selectedUserId === opt.id && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto shrink-0 text-accent-purple">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active filter badge */}
            {selectedUserId !== "all" && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-xs text-accent-purple">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-purple animate-pulse-soft" />
                Filtered
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            type="button"
            onClick={handleDownloadUserChecklist}
            disabled={downloading}
            className="group flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
                Generating report...
              </>
            ) : (
              <>
                <DownloadIcon />
                Export Excel
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-rose-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/*  STAT CARDS                                                    */}
      {/* ============================================================= */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          [
            {
              label: "Active Learners",
              value: filteredUsers.length,
              icon: <UsersIcon />,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10",
              border: "border-indigo-500/20",
              iconBg: "bg-indigo-500/20",
              sub: selectedUserId !== "all" ? "1 selected" : `${filteredUsers.length} total`,
            },
            {
              label: "Tracked Topics",
              value: progressSummary.total,
              icon: <TargetIcon />,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
              border: "border-cyan-500/20",
              iconBg: "bg-cyan-500/20",
              sub: `${progressSummary.completionRate}% completion rate`,
            },
            {
              label: "Completed",
              value: progressSummary.completed,
              icon: <CheckCircleIcon />,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
              iconBg: "bg-emerald-500/20",
              sub: progressSummary.total > 0
                ? `${progressSummary.completionRate}% of total`
                : "No data yet",
            },
            {
              label: "In Progress",
              value: progressSummary.inProgress,
              icon: <ClockIcon />,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/20",
              iconBg: "bg-amber-500/20",
              sub: progressSummary.total > 0
                ? `${100 - progressSummary.completionRate}% of total`
                : "No data yet",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border ${stat.border} ${stat.bg} p-5 transition-all hover:shadow-lg hover:shadow-black/20`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  {stat.label}
                </p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.iconBg} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
            </div>
          ))
        )}
      </div>

      {/* ============================================================= */}
      {/*  CHARTS ROW 1: Pie + Trend                                     */}
      {/* ============================================================= */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* --- Donut / Pie chart --- */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5">
          <div className="mb-1">
            <h3 className="text-sm font-semibold text-white">Status Overview</h3>
            <p className="text-xs text-slate-500">Completed vs In Progress</p>
          </div>

          <div className="relative h-[240px]">
            {isLoading ? (
              <ChartSkeleton />
            ) : progressSummary.total === 0 ? (
              <EmptyChart message="No progress data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      <Cell fill={CHART_COLORS.emerald} />
                      <Cell fill={CHART_COLORS.amber} />
                    </Pie>
                    <Tooltip content={chartTooltip} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {progressSummary.completionRate}%
                  </span>
                  <span className="text-[11px] text-slate-400">Complete</span>
                </div>
              </>
            )}
          </div>

          {/* Legend */}
          {!isLoading && progressSummary.total > 0 && (
            <div className="mt-2 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.emerald }} />
                <span className="text-slate-300">Completed ({progressSummary.completed})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.amber }} />
                <span className="text-slate-300">In Progress ({progressSummary.inProgress})</span>
              </div>
            </div>
          )}
        </div>

        {/* --- Completion trend (Area chart) --- */}
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Completion Trend</h3>
              <p className="text-xs text-slate-500">7-day view</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Previous 7 days */}
              <button
                type="button"
                onClick={() => setTrendDaysAgo((prev) => prev + 7)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-700/50 text-slate-400 transition-colors hover:bg-ink-700 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {/* Date range label */}
              <span className="min-w-[180px] text-center text-xs font-medium text-slate-300">
                {trendWindowLabel}
              </span>

              {/* Next 7 days */}
              <button
                type="button"
                onClick={() => setTrendDaysAgo((prev) => Math.max(0, prev - 7))}
                disabled={trendDaysAgo === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-700/50 text-slate-400 transition-colors hover:bg-ink-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Today button */}
              {trendDaysAgo > 0 && (
                <button
                  type="button"
                  onClick={() => setTrendDaysAgo(0)}
                  className="rounded-lg bg-accent-purple/15 px-2.5 py-1 text-[11px] font-medium text-accent-purple transition-colors hover:bg-accent-purple/25"
                >
                  Today
                </button>
              )}

              {/* Total badge */}
              <div className="ml-1 rounded-lg bg-accent-purple/10 px-2.5 py-1 text-xs font-medium text-accent-purple">
                {completionTrend.reduce((s, d) => s + d.completed, 0)} total
              </div>
            </div>
          </div>

          <div className="h-[240px]">
            {isLoading ? (
              <ChartSkeleton />
            ) : completionTrend.length === 0 ? (
              <EmptyChart message="No completed topics yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={completionTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.06)" vertical={false} fillOpacity={0} />
                  <XAxis
                    dataKey="month"
                    stroke="#475569"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#475569"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={chartTooltip} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke={CHART_COLORS.purple}
                    strokeWidth={2.5}
                    fill="url(#purpleGradient)"
                    dot={{ r: 4, fill: CHART_COLORS.purple, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: CHART_COLORS.purple, stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/*  CHARTS ROW 2: Top Learners + Export card                      */}
      {/* ============================================================= */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* --- Top learners bar chart --- */}
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {selectedUserId === "all" ? "Top Learners" : "Learner Performance"}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedUserId === "all"
                  ? "Users with the most completed topics"
                  : "Completed topics for selected user"}
              </p>
            </div>
            {topLearners.length > 0 && topLearners[0].completed > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                <TrophyIcon />
                {topLearners[0].name.split(" ")[0]}
              </div>
            )}
          </div>

          <div className="h-[260px]">
            {isLoading ? (
              <ChartSkeleton />
            ) : topLearners.length === 0 || (topLearners.length === 1 && topLearners[0].completed === 0) ? (
              <EmptyChart message="No completed topics yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLearners} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.purple} stopOpacity={1} />
                      <stop offset="100%" stopColor={CHART_COLORS.indigo} stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.06)" vertical={false} fillOpacity={0} />
                  <XAxis
                    dataKey="name"
                    stroke="#475569"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 11 }}
                    height={50}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#475569"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip content={chartTooltip} cursor={false} />
                  <Bar dataKey="completed" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {topLearners.map((_, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={BAR_GRADIENT_COLORS[index] || BAR_GRADIENT_COLORS[4]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ranking list under chart */}
          {!isLoading && topLearners.length > 0 && topLearners[0].completed > 0 && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <div className="flex flex-col gap-2">
                {topLearners.map((learner, idx) => (
                  <div key={learner.userId} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      idx === 0
                        ? "bg-amber-500/20 text-amber-300"
                        : idx === 1
                          ? "bg-slate-400/20 text-slate-300"
                          : idx === 2
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-ink-700 text-slate-400"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate text-slate-200">{learner.name}</span>
                    <span className="font-semibold text-white">{learner.completed}</span>
                    <span className="text-[10px] text-slate-500">topics</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* --- Export & info card --- */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Quick export card */}
          <div className="flex-1 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-ink-800/60 via-ink-800/40 to-accent-purple/5 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/15 text-accent-purple">
                <FileSpreadsheetIcon />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Export Report</h3>
                <p className="text-xs text-slate-500">Download detailed checklist</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Scope</p>
                <p className="mt-1 text-sm font-medium text-white">{selectedUserLabel}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Format</p>
                <p className="mt-1 text-sm font-medium text-white">Excel (.xlsx)</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-ink-900/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Includes</p>
                <p className="mt-1 text-sm text-slate-300">
                  Courses, topics, status, dates, and remarks
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadUserChecklist}
              disabled={downloading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-purple/90 hover:shadow-lg hover:shadow-accent-purple/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Download Report
                </>
              )}
            </button>
          </div>

          {/* Completion rate gauge */}
          {!isLoading && progressSummary.total > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Completion Rate</h3>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-700/50">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out"
                  style={{ width: `${progressSummary.completionRate}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {progressSummary.completed} of {progressSummary.total} topics
                </span>
                <span className="font-semibold text-emerald-400">
                  {progressSummary.completionRate}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Empty chart placeholder                                            */
/* ------------------------------------------------------------------ */

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-700/40">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-8 4 4 5-6" />
      </svg>
    </div>
    <p className="text-sm text-slate-500">{message}</p>
    <p className="text-[11px] text-slate-600">Data will appear here once learners make progress</p>
  </div>
);

export default ReportsSection;
