import { useEffect, useMemo, useState } from "react";
import DataTable from "../../../components/admin/DataTable";
import Modal from "../../../components/admin/Modal";
import { superAdminService } from "../../../services/superAdminService";
import type { AdminUser, Role, UserProfile } from "../../../types/superAdmin";

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [formState, setFormState] = useState({
    email: "",
    username: "",
    password: "",
    role: "user" as Role,
  });
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    role: "user" as Role,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

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

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Not set";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Not set";
    const parsed = new Date(value + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
    }).format(parsed);
  };

  const getUserInitial = (user: AdminUser | null) => {
    const label = user?.username || user?.email || "U";
    return label.charAt(0).toUpperCase();
  };

  const getDisplayName = (user: AdminUser | null, draft = profileForm) => {
    if (!user) return "User Profile";
    const first = draft.firstName?.trim() || user.first_name || "";
    const last = draft.lastName?.trim() || user.last_name || "";
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    return draft.username?.trim() || user.username || user.email || "User Profile";
  };

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

  const openProfile = (user: AdminUser) => {
    setSelectedUser(user);
    setProfileForm({
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      role: user.role,
    });
    setProfileError(null);
    setIsProfileEditing(false);
    setIsProfileOpen(true);
  };

  const closeProfile = () => {
    setIsProfileOpen(false);
    setIsProfileEditing(false);
    setProfileError(null);
  };

  const handleProfileSave = async () => {
    if (!selectedUser) return;
    if (!selectedUser.profile_setup_completed) {
      setProfileError("User must complete account setup before profile editing is allowed.");
      return;
    }

    const trimmedUsername = profileForm.username.trim();
    const existingUsername = (selectedUser.username ?? "").trim();

    if (!trimmedUsername && existingUsername) {
      setProfileError("Username cannot be empty.");
      return;
    }

    const profileUpdates: Partial<UserProfile> = {};
    if (profileForm.firstName !== (selectedUser.first_name ?? "")) {
      profileUpdates.first_name = profileForm.firstName.trim() || null;
    }
    if (profileForm.lastName !== (selectedUser.last_name ?? "")) {
      profileUpdates.last_name = profileForm.lastName.trim() || null;
    }
    if (profileForm.username !== (selectedUser.username ?? "")) {
      profileUpdates.username = trimmedUsername || null;
    }

    const shouldUpdateRole = !readOnly && profileForm.role !== selectedUser.role;

    if (Object.keys(profileUpdates).length === 0 && !shouldUpdateRole) {
      setIsProfileEditing(false);
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    try {
      if (Object.keys(profileUpdates).length > 0) {
        await superAdminService.updateUserProfile(selectedUser.id, profileUpdates);
      }
      if (shouldUpdateRole) {
        await superAdminService.updateUserAccount(selectedUser.id, { role: profileForm.role });
      }
      setIsProfileEditing(false);
      await loadUsers();
    } catch (profileSaveError) {
      setProfileError(
        profileSaveError instanceof Error ? profileSaveError.message : "Unable to update user profile."
      );
    } finally {
      setProfileSaving(false);
    }
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
      // Toggle active status
      const newActiveStatus = !selectedUser.is_active;
      await superAdminService.updateUserAccount(selectedUser.id, { is_active: newActiveStatus });
      setIsDeleteOpen(false);
      await loadUsers();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Unable to update user status.");
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
          <div className={`flex items-center gap-3 ${user.is_active === false ? "opacity-60" : ""}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-violet/10 text-sm font-semibold text-white ring-1 ring-white/10 ${user.is_active === false ? "grayscale" : ""}`}>
              {getUserInitial(user)}
            </div>
            <div>
              <p className="font-medium text-white">{user.username || "No username"}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
              {user.is_active === false && (
                <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-red-300 mt-1">
                  Inactive
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "role",
        header: "Role",
        width: readOnly ? "120px" : undefined,
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

    return [
      ...baseColumns,
      {
        key: "actions",
        header: "Actions",
        align: readOnly ? ("left" as const) : ("right" as const),
        width: readOnly ? "120px" : undefined,
        render: (user: AdminUser) => (
          <div className={`flex items-center gap-2 ${readOnly ? "justify-start" : "justify-end"}`}>
            <button
              type="button"
              onClick={() => openProfile(user)}
              className={
                readOnly
                  ? "group flex flex-col items-center gap-1 rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300 transition-colors duration-200 hover:text-white"
                  : "btn-ghost p-2"
              }
              title="Profile"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={readOnly ? "h-4 w-4 text-slate-400 group-hover:text-white" : ""}
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              </svg>
              {readOnly && "Profile"}
            </button>
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => openEdit(user)}
                  className="btn-secondary p-2"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(user)}
                  className={`p-2 ${user.is_active === false ? "btn-secondary" : "btn-danger"}`}
                  title={user.is_active === false ? "Activate" : "Deactivate"}
                >
                  {user.is_active === false ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                      <line x1="18" y1="8" x2="6" y2="20" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        ),
      },
    ];
  }, [readOnly]);

  const visibleUsers = readOnly ? users.filter((user) => user.role === "user") : users;
  const profileDisplayName = getDisplayName(selectedUser);
  const profileInitial = getUserInitial(selectedUser);
  const profileRoleConfig = selectedUser ? roleConfig[selectedUser.role] || roleConfig.user : roleConfig.user;
  const canEditSelectedProfile = Boolean(selectedUser?.profile_setup_completed);
  const profileHasChanges = !!selectedUser && (
    profileForm.firstName !== (selectedUser.first_name ?? "") ||
    profileForm.lastName !== (selectedUser.last_name ?? "") ||
    profileForm.username !== (selectedUser.username ?? "") ||
    (!readOnly && profileForm.role !== selectedUser.role)
  );

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
      <DataTable
        columns={columns}
        data={visibleUsers}
        emptyMessage="No users found."
        striped={!readOnly}
        rowClassName={readOnly ? () => "hover:bg-transparent" : undefined}
        compact={readOnly}
      />

      {/* Profile Modal */}
      <Modal
        isOpen={isProfileOpen}
        title="User Profile"
        description="Review account details, update personal info, and keep profiles accurate."
        onClose={closeProfile}
        variant="user"
        size="lg"
        footer={
          isProfileEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsProfileEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving || !profileHasChanges}
                className="btn-primary flex items-center gap-2"
              >
                {profileSaving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={closeProfile}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setIsProfileEditing(true)}
                disabled={!canEditSelectedProfile}
                className="btn-primary"
              >
                Edit Profile
              </button>
            </>
          )
        }
      >
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-purple/20 via-transparent to-accent-violet/20" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple/35 to-accent-indigo/20 text-2xl font-semibold text-white ring-1 ring-white/10">
                {profileInitial}
              </div>
              <div className="flex-1">
                <p className="text-2xs uppercase tracking-widest text-slate-400">Profile overview</p>
                <h4 className="mt-1 font-display text-2xl text-white">{profileDisplayName}</h4>
                <p className="text-sm text-slate-400">{profileForm.email || "No email on file"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest ${profileRoleConfig.color} ${profileRoleConfig.bgColor} ${profileRoleConfig.borderColor}`}>
                  {selectedUser?.role ?? "user"}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest ${
                    canEditSelectedProfile
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {canEditSelectedProfile ? "Setup complete" : "Setup pending"}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-ink-900 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-slate-300">
                  ID {selectedUser?.id?.slice(0, 8) || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
                <p className="text-2xs uppercase tracking-widest text-slate-400">Personal details</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="label">First Name</label>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="First name"
                        className="input"
                      />
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white">
                        {profileForm.firstName || "Not set"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="label">Last Name</label>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Last name"
                        className="input"
                      />
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white">
                        {profileForm.lastName || "Not set"}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-800 p-5">
                <p className="text-2xs uppercase tracking-widest text-slate-400">Account</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="label">Username</label>
                    {isProfileEditing ? (
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="Username"
                        className="input"
                      />
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-white">
                        {profileForm.username || "Not set"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="label">
                      Email Address
                      <span className="ml-2 text-2xs font-normal normal-case text-slate-500">(read-only)</span>
                    </label>
                    <div className="rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-sm text-slate-300">
                      {profileForm.email || "Not set"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-ink-850 p-5">
                <p className="text-2xs uppercase tracking-widest text-slate-400">Timeline</p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Onboarding</span>
                    <span className="font-medium text-white">{formatDate(selectedUser?.onboarding_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Training Start</span>
                    <span className="font-medium text-white">{formatDate(selectedUser?.training_starting_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Regularization</span>
                    <span className="font-medium text-white">{formatDate(selectedUser?.target_regularization_date)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-ink-850 p-5">
                <p className="text-2xs uppercase tracking-widest text-slate-400">Role & access</p>
                <div className="mt-4 space-y-3">
                  {!readOnly && isProfileEditing ? (
                    <div className="space-y-2">
                      <label className="label">Role</label>
                      <select
                        value={profileForm.role}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, role: e.target.value as Role }))}
                        className="input"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Assigned role</span>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest ${profileRoleConfig.color} ${profileRoleConfig.bgColor} ${profileRoleConfig.borderColor}`}>
                        {selectedUser?.role ?? "user"}
                      </span>
                    </div>
                  )}
                  {readOnly && (
                    <p className="text-xs text-slate-500">Role updates are restricted to superadmins.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {profileError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {profileError}
            </div>
          )}
          {!canEditSelectedProfile && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              User must complete account setup before profile editing is allowed.
            </div>
          )}
        </div>
      </Modal>

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

          {/* Delete/Deactivate User Modal */}
          <Modal
            isOpen={isDeleteOpen}
            title={selectedUser?.is_active === false ? "Activate User" : "Deactivate User"}
            description={selectedUser?.is_active === false ? "Restore this user's access to the system." : "This user will lose access to the system but their data will be preserved."}
            onClose={() => setIsDeleteOpen(false)}
            variant={selectedUser?.is_active === false ? "user" : "danger"}
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
                  className={`flex items-center gap-2 ${selectedUser?.is_active === false ? "btn-primary" : "btn-danger"}`}
                >
                  {saving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {selectedUser?.is_active === false ? "Activating..." : "Deactivating..."}
                    </>
                  ) : (
                    selectedUser?.is_active === false ? "Activate User" : "Deactivate User"
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
                {selectedUser?.is_active === false
                  ? "This user will regain access to the system and all their previous data."
                  : "This user will lose access immediately but all their associated data will be preserved and can be restored later."}
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
