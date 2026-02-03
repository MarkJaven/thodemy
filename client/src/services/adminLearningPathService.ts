import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import { auditLogService } from "./auditLogService";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
};

export type LearningPathSummary = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  course_ids?: string[] | null;
  total_hours?: number | null;
  total_days?: number | null;
  enrollment_code?: string | null;
  enrollment_enabled?: boolean | null;
  enrollment_limit?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  enrollment_count?: number | null;
  created_at?: string | null;
};

export type LearningPathDetail = {
  learningPath: LearningPathSummary;
  courses: Array<{
    id: string;
    title: string;
    description: string;
    topic_ids?: string[] | null;
    total_hours?: number | null;
    total_days?: number | null;
    status?: string | null;
  }>;
  topics: Array<{
    id: string;
    title: string;
    description?: string | null;
    time_allocated: number;
    time_unit?: string | null;
  }>;
  enrollments: Array<{
    id: string;
    user_id: string;
    status?: string | null;
    enrolled_at?: string | null;
    user?: {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
  }>;
  topicProgress: Array<{
    id: string;
    user_id: string;
    topic_id: string;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
};

export const adminLearningPathService = {
  async listLearningPaths(): Promise<LearningPathSummary[]> {
    try {
      const { data } = await apiClient.get("/api/admin/learning-paths");
      if (Array.isArray(data)) {
        return data as LearningPathSummary[];
      }
      return (data?.learningPaths ?? []) as LearningPathSummary[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getLearningPathDetail(id: string): Promise<LearningPathDetail> {
    try {
      const { data } = await apiClient.get(`/api/admin/learning-paths/${id}`);
      return data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async createLearningPath(payload: {
    title: string;
    description: string;
    status?: string;
    course_ids?: string[];
    enrollment_enabled?: boolean;
    enrollment_limit?: number | null;
    start_at?: string | null;
  }): Promise<LearningPathSummary> {
    try {
      const { data } = await apiClient.post("/api/admin/learning-paths", payload);
      return data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateLearningPath(
    id: string,
    payload: {
      title?: string;
      description?: string;
      status?: string;
      course_ids?: string[];
      enrollment_enabled?: boolean;
      enrollment_limit?: number | null;
      start_at?: string | null;
    }
  ): Promise<void> {
    try {
      await apiClient.patch(`/api/admin/learning-paths/${id}`, payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteLearningPath(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/admin/learning-paths/${id}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateLPEnrollmentStatus(enrollmentId: string, status: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("learning_path_enrollments")
      .update({ status })
      .eq("id", enrollmentId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "learning_path_enrollment",
      entityId: enrollmentId,
      action: "status_changed",
      details: { status },
    });
  },

  async deleteLPEnrollment(enrollmentId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/admin/lp-enrollments/${enrollmentId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
};
