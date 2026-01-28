const { supabaseAdmin } = require("../config/supabase");
const { ConflictError, ExternalServiceError, DatabaseError } = require("../utils/errors");

/**
 * Create an auth user and related profile/role entries.
 * @param {{email: string, username: string, password: string, role: string, createdBy?: string}} payload
 * @returns {Promise<{id: string}>}
 */
const createUser = async ({ email, username, password, role, createdBy }) => {
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
    .upsert({ id: userId, username, email })
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
const updateUser = async ({ userId, username, password, role, updatedBy }) => {
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
};

/**
 * Delete an auth user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteUser = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    throw new ExternalServiceError("Unable to delete user", {
      code: error.status,
      details: error.message,
    });
  }
};

module.exports = { adminUserService: { createUser, updateUser, deleteUser } };
