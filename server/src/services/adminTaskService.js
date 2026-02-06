const { supabaseAdmin } = require("../config/supabase");
const { DatabaseError, NotFoundError } = require("../utils/errors");

const TASK_SELECT =
  "id, title, description, priority, status, created_by, completed_at, created_at, updated_at";

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

const completeTask = async ({ taskId }) =>
  updateTask({
    taskId,
    updates: { status: "completed", completed_at: new Date().toISOString() },
  });

const reopenTask = async ({ taskId }) =>
  updateTask({
    taskId,
    updates: { status: "pending", completed_at: null },
  });

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
