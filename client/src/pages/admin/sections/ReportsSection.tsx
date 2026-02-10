import { useEffect, useMemo, useState } from "react";
import { reportService } from "../../../services/reportService";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser } from "../../../types/superAdmin";

const ReportsSection = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

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
                  onClick={() => setSelectedUserId(user.id)}
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
