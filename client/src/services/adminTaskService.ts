import { supabase } from "../lib/supabaseClient";
import type { AdminTask } from "../types/superAdmin";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

export const adminTaskService = {
  async listTasks(): Promise<AdminTask[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("admin_tasks")
      .select("id, title, description, priority, status, created_by, completed_at, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminTask[];
  },

  async listPendingTasks(): Promise<AdminTask[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("admin_tasks")
      .select("id, title, description, priority, status, created_by, completed_at, created_at, updated_at")
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminTask[];
  },

  async createTask(payload: Pick<AdminTask, "title" | "description" | "priority">): Promise<AdminTask> {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const { data, error } = await client
      .from("admin_tasks")
      .insert({
        title: payload.title,
        description: payload.description ?? null,
        priority: payload.priority ?? "medium",
        status: "pending",
        created_by: userData?.user?.id ?? null,
      })
      .select("id, title, description, priority, status, created_by, completed_at, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data as AdminTask;
  },

  async completeTask(taskId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("admin_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", taskId);
    if (error) throw new Error(error.message);
  },

  async reopenTask(taskId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("admin_tasks")
      .update({ status: "pending", completed_at: null })
      .eq("id", taskId);
    if (error) throw new Error(error.message);
  },

  async updateTask(taskId: string, payload: Partial<Pick<AdminTask, "title" | "description" | "priority">>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("admin_tasks")
      .update(payload)
      .eq("id", taskId);
    if (error) throw new Error(error.message);
  },

  async deleteTask(taskId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("admin_tasks")
      .delete()
      .eq("id", taskId);
    if (error) throw new Error(error.message);
  },
};
