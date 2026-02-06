import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import type { AdminTask } from "../types/superAdmin";

const TASKS_ENDPOINT = "/api/admin/tasks";

export const adminTaskService = {
  async listTasks(): Promise<AdminTask[]> {
    try {
      const { data } = await apiClient.get(TASKS_ENDPOINT);
      return (data?.tasks ?? []) as AdminTask[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async listPendingTasks(): Promise<AdminTask[]> {
    try {
      const { data } = await apiClient.get(TASKS_ENDPOINT, {
        params: { status: "pending" },
      });
      return (data?.tasks ?? []) as AdminTask[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async createTask(payload: Pick<AdminTask, "title" | "description" | "priority">): Promise<AdminTask> {
    try {
      const { data } = await apiClient.post(TASKS_ENDPOINT, payload);
      return data?.task as AdminTask;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async completeTask(taskId: string): Promise<void> {
    try {
      await apiClient.post(`${TASKS_ENDPOINT}/${taskId}/complete`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async reopenTask(taskId: string): Promise<void> {
    try {
      await apiClient.post(`${TASKS_ENDPOINT}/${taskId}/reopen`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateTask(taskId: string, payload: Partial<Pick<AdminTask, "title" | "description" | "priority">>): Promise<void> {
    try {
      await apiClient.patch(`${TASKS_ENDPOINT}/${taskId}`, payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      await apiClient.delete(`${TASKS_ENDPOINT}/${taskId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
