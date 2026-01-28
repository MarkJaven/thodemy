import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Role } from "../../../types/superAdmin";

const roleOptions: Role[] = ["user", "admin", "superadmin"];

type UsersSectionProps = {
  readOnly?: boolean;
};

const UsersSection = ({ readOnly = false }: UsersSectionProps) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [formState, setFormState] = useState({
    email: "",
    username: "",
    password: "",
    role: "user" as Role,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superAdminService.listUsers();
      setUsers(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setFormState({ email: "", username: "", password: "", role: "user" });
    setActionError(null);
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setFormState({
      email: user.email ?? "",
      username: user.username ?? "",
      password: "",
      role: user.role,
    });
    setActionError(null);
    setIsEditOpen(true);
  };

  const openDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setActionError(null);
    setIsDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formState.email.trim()) {
      setActionError("Email is required.");
      return;
    }
    if (!formState.username.trim()) {
      setActionError("Username is required.");
      return;
    }
    if (!formState.password || formState.password.length < 8) {
      setActionError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.createUser({
        email: formState.email,
        username: formState.username,
        password: formState.password,
        role: formState.role,
      });
      setIsCreateOpen(false);
      await loadUsers();
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Unable to create user.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    if (!formState.username.trim()) {
      setActionError("Username is required.");
      return;
    }
    setSaving(true);
    setActionError(null);

    try {
      // Update all fields via Supabase Admin
      await superAdminService.updateUserAccount(selectedUser.id, {
        username: formState.username !== selectedUser.username ? formState.username : undefined,
        password: formState.password || undefined,
        role: formState.role !== selectedUser.role ? formState.role : undefined,
      });
      setIsEditOpen(false);
      await loadUsers();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : "Unable to update user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setActionError(null);
    try {
      await superAdminService.deleteUser(selectedUser.id);
      setIsDeleteOpen(false);
      await loadUsers();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to delete user.");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "name",
        header: "User",
        render: (user: AdminUser) => (
          <div>
            <p className="font-semibold text-white">{user.username || "No username"}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (user: AdminUser) => (
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
            {user.role}
          </span>
        ),
      },
    ];

    if (readOnly) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: "actions",
        header: "Actions",
        render: (user: AdminUser) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(user)}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => openDelete(user)}
              className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-rose-200"
            >
              Delete
            </button>
          </div>
        ),
      },
    ];
  }, [readOnly]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading users...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-200">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-white">User Management</h2>
          <p className="text-sm text-slate-300">
            {readOnly
              ? "View users and roles across the platform."
              : "Manage accounts, assign roles, and view ownership context."}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90"
          >
            Add user
          </button>
        )}
      </div>

      <DataTable columns={columns} data={users} emptyMessage="No users found." />

      {!readOnly && (
        <>
          <Modal
            isOpen={isCreateOpen}
            title="Create user"
            description="This action requires a secure admin API to create auth users."
            onClose={() => setIsCreateOpen(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Create"}
                </button>
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Email
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Role
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, role: event.target.value as Role }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Username
                <input
                  type="text"
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Password
                <input
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
            </div>
            {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
          </Modal>

          <Modal
            isOpen={isEditOpen}
            title="Update user"
            onClose={() => setIsEditOpen(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="rounded-full bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_10px_30px_rgba(94,59,219,0.45)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Email (read-only)
                <input
                  type="email"
                  value={formState.email}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Role
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, role: event.target.value as Role }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Username
                <input
                  type="text"
                  value={formState.username}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Password (reset)
                <input
                  type="password"
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  placeholder="Leave blank to keep"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-ink-800/60 px-4 py-2 text-sm text-white focus:border-white/30 focus:ring-0"
                />
              </label>
            </div>
            {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
          </Modal>

          <Modal
            isOpen={isDeleteOpen}
            title="Delete user"
            description="This will remove the user from auth and their related data."
            onClose={() => setIsDeleteOpen(false)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-full border border-rose-500/40 bg-rose-500/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-rose-200"
                >
                  {saving ? "Deleting..." : "Delete"}
                </button>
              </>
            }
          >
            <p className="text-sm text-slate-300">
              {selectedUser?.email} will lose access immediately.
            </p>
            {actionError && <p className="mt-4 text-xs text-rose-200">{actionError}</p>}
          </Modal>
        </>
      )}
    </div>
  );
};

export default UsersSection;
