const { supabaseAdmin } = require("../config/supabase");
const { ConflictError, ExternalServiceError, DatabaseError } = require("../utils/errors");

const ensureSingleSuperAdmin = async (targetUserId) => {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "superadmin");

  if (error) {
    throw new ExternalServiceError("Unable to validate superadmin assignment", {
      code: error.code,
      details: error.message,
    });
  }

  const existing = (data ?? []).filter(
    (entry) => entry?.user_id && entry.user_id !== targetUserId
  );

  if (existing.length > 0) {
    throw new ConflictError("Only one superadmin is allowed.");
  }
};

const nullifyUserReferences = async (userId) => {
  const references = [
    { table: "user_roles", column: "created_by" },
    { table: "user_roles", column: "updated_by" },
    { table: "courses", column: "created_by" },
    { table: "courses", column: "updated_by" },
    { table: "enrollments", column: "created_by" },
    { table: "enrollments", column: "updated_by" },
    { table: "topics", column: "author_id" },
    { table: "topics", column: "created_by" },
    { table: "topics", column: "updated_by" },
    { table: "topic_completion_requests", column: "reviewed_by" },
    { table: "course_completion_requests", column: "reviewed_by" },
    { table: "topic_submissions", column: "reviewed_by" },
    { table: "audit_logs", column: "actor_id" },
    { table: "lesson_assignments", column: "reviewed_by" },
    { table: "activities", column: "created_by" },
    { table: "activities", column: "updated_by" },
    { table: "activity_submissions", column: "updated_by" },
    { table: "quizzes", column: "assigned_user_id" },
    { table: "quizzes", column: "created_by" },
    { table: "quizzes", column: "updated_by" },
    { table: "quiz_questions", column: "updated_by" },
    { table: "quiz_attempts", column: "updated_by" },
    { table: "forms", column: "assigned_user_id" },
    { table: "forms", column: "created_by" },
    { table: "forms", column: "updated_by" },
    { table: "form_questions", column: "updated_by" },
    { table: "form_responses", column: "updated_by" },
    { table: "learning_paths", column: "created_by" },
    { table: "learning_paths", column: "updated_by" },
    { table: "learning_path_enrollments", column: "created_by" },
    { table: "learning_path_enrollments", column: "updated_by" },
  ];

  for (const reference of references) {
    const { table, column } = reference;
    const { error } = await supabaseAdmin
      .from(table)
      .update({ [column]: null })
      .eq(column, userId);
    if (error) {
      if (["42P01", "42703"].includes(error.code)) {
        continue;
      }
      throw new DatabaseError("Unable to clear user references", {
        table,
        column,
        code: error.code,
        details: error.message,
      });
    }
  }
};

/**
 * Create an auth user and related profile/role entries.
 * @param {{email: string, username: string, password: string, role: string, createdBy?: string}} payload
 * @returns {Promise<{id: string}>}
 */
const createUser = async ({ email, username, password, role, createdBy }) => {
  if (role === "superadmin") {
    await ensureSingleSuperAdmin();
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) {
    if (String(error.message || "").toLowerCase().includes("already")) {
      throw new ConflictError("User already exists.");
    }
    throw new ExternalServiceError("Unable to create auth user", {
      code: error.status,
      details: error.message,
    });
  }

  const userId = data?.user?.id;
  if (!userId) {
    throw new ExternalServiceError("Auth user creation did not return an id.");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, username, email, profile_setup_completed: false })
    .select("id");

  if (profileError) {
    if (profileError.code === "23505") {
      throw new ConflictError("Username already exists.");
    }
    throw new DatabaseError("Unable to update user profile", {
      code: profileError.code,
      details: profileError.message,
    });
  }

  const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
    user_id: userId,
    role,
    created_by: createdBy ?? null,
    updated_by: createdBy ?? null,
  });

  if (roleError) {
    throw new DatabaseError("Unable to assign user role", {
      code: roleError.code,
      details: roleError.message,
    });
  }

  return { id: userId };
};

/**
 * Update user account details (superadmin only).
 * @param {{userId: string, username?: string, password?: string, role?: string, updatedBy?: string}} payload
 * @returns {Promise<void>}
 */
const updateUser = async ({ userId, username, password, role, is_active, updatedBy }) => {
  if (role === "superadmin") {
    await ensureSingleSuperAdmin(userId);
  }
  if (password) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });
    if (authError) {
      throw new ExternalServiceError("Unable to reset password", {
        code: authError.status,
        details: authError.message,
      });
    }
  }

  if (username) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ username })
      .eq("id", userId);

    if (profileError) {
      if (profileError.code === "23505") {
        throw new ConflictError("Username already exists.");
      }
      throw new DatabaseError("Unable to update username", {
        code: profileError.code,
        details: profileError.message,
      });
    }
  }

  if (role) {
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role,
      updated_by: updatedBy ?? null,
    });
    if (roleError) {
      throw new DatabaseError("Unable to update role", {
        code: roleError.code,
        details: roleError.message,
      });
    }
  }

  if (is_active !== undefined) {
    const { error: activeError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active })
      .eq("id", userId);

    if (activeError) {
      throw new DatabaseError("Unable to update user status", {
        code: activeError.code,
        details: activeError.message,
      });
    }
  }
};

/**
 * Deactivate a user (soft delete).
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteUser = async (userId) => {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new DatabaseError("Unable to deactivate user", {
      code: error.code,
      details: error.message,
    });
  }
};

/**
 * List users with their roles.
 * @param {{ roleFilter?: string }} options
 * @returns {Promise<Array<object>>}
 */
const listUsers = async ({ roleFilter } = {}) => {
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, first_name, last_name, username, email, is_active, profile_setup_completed, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (profileError) {
    throw new DatabaseError("Unable to load user profiles", {
      code: profileError.code,
      details: profileError.message,
    });
  }

  const { data: roles, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role, updated_at");

  if (roleError) {
    throw new DatabaseError("Unable to load user roles", {
      code: roleError.code,
      details: roleError.message,
    });
  }

  const roleMap = new Map(
    (roles ?? []).map((entry) => [entry.user_id, { role: entry.role, updated_at: entry.updated_at }])
  );

  const users = (profiles ?? []).map((profile) => {
    const roleEntry = roleMap.get(profile.id);
    return {
      ...profile,
      role: roleEntry?.role ?? "user",
      role_updated_at: roleEntry?.updated_at ?? null,
    };
  });

  if (roleFilter) {
    return users.filter((user) => user.role === roleFilter);
  }

  return users;
};

module.exports = { adminUserService: { createUser, updateUser, deleteUser, listUsers } };
