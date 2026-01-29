import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import type { TopicSubmission } from "../types/superAdmin";

type SubmissionFilters = {
  status?: string;
  topicId?: string;
  userId?: string;
  from?: string;
  to?: string;
};

export const topicSubmissionService = {
  async listSubmissions(filters: SubmissionFilters = {}): Promise<TopicSubmission[]> {
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.topicId) params.topic_id = filters.topicId;
      if (filters.userId) params.user_id = filters.userId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const { data } = await apiClient.get("/api/submissions", { params });
      return (data?.submissions ?? []) as TopicSubmission[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateSubmissionStatus(
    submissionId: string,
    payload: { status: "pending" | "in_progress" | "completed" | "rejected"; review_notes?: string }
  ): Promise<TopicSubmission> {
    try {
      const { data } = await apiClient.patch(`/api/submissions/${submissionId}/status`, payload);
      return data?.submission as TopicSubmission;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getSubmissionFileUrl(submissionId: string): Promise<string | null> {
    try {
      const { data } = await apiClient.get(`/api/submissions/${submissionId}/file`);
      return data?.file_url ?? null;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
