import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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

const ReportsSection = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

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

  const userOptions = useMemo(() => {
    const base = [{ id: "all", label: "All users" }];
    const mapped = users
      .filter((user) => user.role === "user")
      .map((user) => {
      const name =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        user.email ||
        "Unknown user";
      const label = user.email ? `${name} • ${user.email}` : name;
      return { id: user.id, label };
    });
    return base.concat(mapped);
  }, [users]);

  const filteredUsers = useMemo(
    () => users.filter((user) => user.role === "user"),
    [users]
  );

  const selectedUserLabel = userOptions.find((option) => option.id === selectedUserId)?.label;

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
    return { completed, inProgress, total };
  }, [scopedProgress]);

  const pieData = useMemo(
    () => [
      { name: "Completed", value: progressSummary.completed },
      { name: "In Progress", value: progressSummary.inProgress },
    ],
    [progressSummary]
  );

  const completionTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    scopedProgress.forEach((entry) => {
      if (entry.status !== "completed" || !entry.end_date) return;
      const date = new Date(entry.end_date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      bucket.set(key, (bucket.get(key) || 0) + 1);
    });
    return Array.from(bucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, completed]) => ({
        month,
        completed,
      }));
  }, [scopedProgress]);

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
        userOptions.find((option) => option.id === selectedUserId)?.label ||
        "Selected user";
      return [{ userId: selectedUserId, name, completed: 0 }];
    }
    return rows;
  }, [filteredUsers, scopedProgress, selectedUserId, userOptions]);

  const chartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-ink-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
        {label && <p className="text-slate-400">{label}</p>}
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="text-slate-200">
            {entry.name || entry.dataKey}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

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

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h2 className="section-title">Reports</h2>
          <p className="section-description">
            Export operational data for audit, compliance, and performance reviews.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-800/50 p-6">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">User Checklist</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Select user</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm text-slate-200">
              {selectedUserLabel || "All users"}
            </div>
            <button
              type="button"
              onClick={handleDownloadUserChecklist}
              disabled={downloading}
              className="btn-primary flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v12" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                  Download Excel
                </>
              )}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status split</p>
              <h4 className="mt-2 text-sm font-semibold text-white">Completed vs In Progress</h4>
              <div className="mt-4 h-[200px]">
                {progressLoading ? (
                  <div className="h-full w-full rounded-xl bg-ink-800/70 animate-pulse" />
                ) : progressSummary.total === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-xs text-slate-400">
                    No progress data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? "#34D399" : "#FBBF24"}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={chartTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Completion trend</p>
              <h4 className="mt-2 text-sm font-semibold text-white">Completed topics per month</h4>
              <div className="mt-4 h-[200px]">
                {progressLoading ? (
                  <div className="h-full w-full rounded-xl bg-ink-800/70 animate-pulse" />
                ) : completionTrend.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-xs text-slate-400">
                    No completed topics yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={completionTrend}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                      <XAxis dataKey="month" stroke="#94A3B8" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} />
                      <Tooltip content={chartTooltip} />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Top learners</p>
              <h4 className="mt-2 text-sm font-semibold text-white">Completed topics</h4>
              <div className="mt-4 h-[200px]">
                {progressLoading ? (
                  <div className="h-full w-full rounded-xl bg-ink-800/70 animate-pulse" />
                ) : topLearners.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-xs text-slate-400">
                    No completed topics yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topLearners}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94A3B8"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} />
                      <Tooltip content={chartTooltip} />
                      <Bar dataKey="completed" fill="#34D399" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active learners", value: filteredUsers.length, tone: "text-white" },
              { label: "Tracked topics", value: progressSummary.total, tone: "text-white" },
              { label: "Completed topics", value: progressSummary.completed, tone: "text-emerald-300" },
              { label: "In-progress topics", value: progressSummary.inProgress, tone: "text-amber-300" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-xs text-slate-300"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{item.label}</p>
                <p className={`mt-1 text-lg font-semibold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => {
              const name =
                [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                user.username ||
                user.email ||
                "Unknown user";
              const label = user.email ? `${name} • ${user.email}` : name;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() =>
                    setSelectedUserId((current) => (current === user.id ? "all" : user.id))
                  }
                  className={`rounded-xl border px-4 py-3 text-left text-xs transition ${
                    selectedUserId === user.id
                      ? "border-accent-purple/50 bg-ink-800 text-white"
                      : "border-white/10 bg-ink-900/40 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsSection;
