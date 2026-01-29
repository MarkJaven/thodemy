import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Role } from "../../../types/superAdmin";

const roleOptions: Role[] = ["user", "admin", "superadmin"];

const roleConfig: Record<Role, { color: string; bgColor: string; borderColor: string }> = {
  user: {
    color: "text-slate-300",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
  },
  admin: {
    color: "text-blue-300",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
  },
  superadmin: {
    color: "text-amber-300",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
};

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-violet/10 text-sm font-semibold text-white ring-1 ring-white/10">
              {(user.username || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{user.username || "No username"}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        render: (user: AdminUser) => {
          const config = roleConfig[user.role] || roleConfig.user;
          return (
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest ${config.color} ${config.bgColor} ${config.borderColor}`}>
              {user.role}
            </span>
          );
        },
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
        align: "right" as const,
        render: (user: AdminUser) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(user)}
              className="btn-secondary py-1.5 px-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              onClick={() => openDelete(user)}
              className="btn-danger py-1.5 px-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          </div>
        ),
      },
    ];
  }, [readOnly]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="section-header">
          <div>
            <div className="skeleton h-8 w-48" />
            <div className="skeleton mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <p className="text-sm text-rose-200">{error}</p>
        <button
          type="button"
          onClick={loadUsers}
          className="btn-secondary mt-4"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="section-description">
            {readOnly
              ? "View users and roles across the platform."
              : "Manage accounts, assign roles, and control access permissions."}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={users} emptyMessage="No users found." />

      {/* Modals */}
      {!readOnly && (
        <>
          {/* Create User Modal */}
          <Modal
            isOpen={isCreateOpen}
            title="Create New User"
            description="Add a new user to the platform with specified role and credentials."
            onClose={() => setIsCreateOpen(false)}
            variant="user"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
              </>
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value as Role }))}
                  className="input"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formState.username}
                  onChange={(e) => setFormState((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="johndoe"
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Password</label>
                <input
                  type="password"
                  value={formState.password}
                  onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="input"
                />
              </div>
            </div>
            {actionError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {actionError}
              </div>
            )}
          </Modal>

          {/* Edit User Modal */}
          <Modal
            isOpen={isEditOpen}
            title="Edit User"
            description="Update user details and permissions."
            onClose={() => setIsEditOpen(false)}
            variant="user"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </>
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="label">
                  Email Address
                  <span className="ml-2 text-2xs font-normal normal-case text-slate-500">(read-only)</span>
                </label>
                <input
                  type="email"
                  value={formState.email}
                  readOnly
                  className="input cursor-not-allowed opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value as Role }))}
                  className="input"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="label">Username</label>
                <input
                  type="text"
                  value={formState.username}
                  onChange={(e) => setFormState((prev) => ({ ...prev, username: e.target.value }))}
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="label">
                  New Password
                  <span className="ml-2 text-2xs font-normal normal-case text-slate-500">(optional)</span>
                </label>
                <input
                  type="password"
                  value={formState.password}
                  onChange={(e) => setFormState((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  className="input"
                />
              </div>
            </div>
            {actionError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {actionError}
              </div>
            )}
          </Modal>

          {/* Delete User Modal */}
          <Modal
            isOpen={isDeleteOpen}
            title="Delete User"
            description="This action cannot be undone."
            onClose={() => setIsDeleteOpen(false)}
            variant="danger"
            size="sm"
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="btn-danger flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-violet/10 text-sm font-semibold text-white ring-1 ring-white/10">
                  {(selectedUser?.username || selectedUser?.email || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{selectedUser?.username || "No username"}</p>
                  <p className="text-xs text-slate-400">{selectedUser?.email}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                This user will lose access immediately and all their associated data will be removed from the system.
              </p>
            </div>
            {actionError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                {actionError}
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
};

export default UsersSection;
