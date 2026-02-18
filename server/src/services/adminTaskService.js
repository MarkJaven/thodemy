/**
 * Admin Task Service
 * CRUD operations for admin task management.
 * @module services/adminTaskService
 */

const { supabaseAdmin } = require("../config/supabase");
const { DatabaseError, NotFoundError } = require("../utils/errors");

const TASK_SELECT =
  "id, title, description, priority, status, created_by, completed_at, created_at, updated_at";

/**
 * Throws a typed error if a Supabase error is present.
 * @param {object|null} error - Supabase error object
 * @param {string} message - Error message
 * @throws {NotFoundError|DatabaseError}
 */
const handleSupabaseError = (error, message) => {
  if (!error) return;
  if (error.code === "PGRST116") {
    throw new NotFoundError(message || "Admin task not found.");
  }
  throw new DatabaseError(message || "Database operation failed.", {
    code: error.code,
    details: error.message,
  });
};

/**
 * Retrieves all admin tasks, optionally filtered by status.
 * @param {{ status?: string }} [options]
 * @returns {Promise<Array<object>>}
 */
const listTasks = async ({ status } = {}) => {
  let query = supabaseAdmin.from("admin_tasks").select(TASK_SELECT);
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });
  handleSupabaseError(error, "Unable to load admin tasks.");
  return data ?? [];
};

/**
 * Creates a new admin task.
 * @param {{ title: string, description?: string, priority?: string, createdBy?: string }} payload
 * @returns {Promise<object>} Created task record
 */
const createTask = async ({ title, description, priority, createdBy }) => {
  const payload = {
    title,
    description: description ?? null,
    priority: priority ?? "medium",
    status: "pending",
    created_by: createdBy ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from("admin_tasks")
    .insert(payload)
    .select(TASK_SELECT)
    .single();
  handleSupabaseError(error, "Unable to create admin task.");
  return data;
};

/**
 * Updates an existing admin task by ID.
 * @param {{ taskId: string, updates: object }} payload
 * @returns {Promise<object>} Updated task record
 */
const updateTask = async ({ taskId, updates }) => {
  const payload = { ...updates };
  const { data, error } = await supabaseAdmin
    .from("admin_tasks")
    .update(payload)
    .eq("id", taskId)
    .select(TASK_SELECT)
    .single();
  handleSupabaseError(error, "Unable to update admin task.");
  return data;
};

/** Marks a task as completed with a timestamp. */
const completeTask = async ({ taskId }) =>
  updateTask({
    taskId,
    updates: { status: "completed", completed_at: new Date().toISOString() },
  });

/** Reopens a completed task by resetting its status to pending. */
const reopenTask = async ({ taskId }) =>
  updateTask({
    taskId,
    updates: { status: "pending", completed_at: null },
  });

/**
 * Permanently deletes an admin task.
 * @param {{ taskId: string }} payload
 * @returns {Promise<{ id: string }>}
 * @throws {NotFoundError} If the task does not exist
 */
const deleteTask = async ({ taskId }) => {
  const { data, error } = await supabaseAdmin
    .from("admin_tasks")
    .delete()
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  handleSupabaseError(error, "Unable to delete admin task.");
  if (!data) {
    throw new NotFoundError("Admin task not found.");
  }
  return data;
};

module.exports = {
  adminTaskService: {
    listTasks,
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    deleteTask,
  },
};
