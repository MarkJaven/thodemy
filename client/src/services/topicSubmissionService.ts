import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import type { TopicSubmission } from "../types/superAdmin";

type SubmissionFilters = {
  status?: string;
  topicId?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

type PaginatedTopicSubmissions = {
  submissions: TopicSubmission[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const topicSubmissionService = {
  async listSubmissions(filters: SubmissionFilters = {}): Promise<PaginatedTopicSubmissions> {
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.topicId) params.topic_id = filters.topicId;
      if (filters.userId) params.user_id = filters.userId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.page) params.page = String(filters.page);
      if (filters.pageSize) params.page_size = String(filters.pageSize);

      const { data } = await apiClient.get("/api/submissions", { params });
      return {
        submissions: (data?.submissions ?? []) as TopicSubmission[],
        pagination: {
          page: Number(data?.pagination?.page ?? filters.page ?? 1),
          pageSize: Number(data?.pagination?.page_size ?? filters.pageSize ?? 10),
          total: Number(data?.pagination?.total ?? 0),
          totalPages: Number(data?.pagination?.total_pages ?? 0),
        },
      };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getSubmission(submissionId: string): Promise<TopicSubmission> {
    try {
      const { data } = await apiClient.get(`/api/submissions/${submissionId}`);
      return data?.submission as TopicSubmission;
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
