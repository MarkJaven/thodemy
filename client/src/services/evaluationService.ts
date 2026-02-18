import { apiClient, getApiErrorMessage } from "../lib/apiClient";

export interface Evaluation {
  id: string;
  user_id: string;
  learning_path_id: string | null;
  evaluator_id: string | null;
  status: "draft" | "in_progress" | "finalized";
  trainee_info: Record<string, unknown>;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
  trainee_name?: string;
  trainee_email?: string;
  evaluator_name?: string;
  learning_path_title?: string;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  sheet: string;
  category: string | null;
  criterion_key: string;
  criterion_label: string | null;
  score: number | null;
  max_score: number;
  weight: number | null;
  remarks: string | null;
  source: "manual" | "auto_quiz" | "auto_activity";
  source_ref_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationDetail extends Evaluation {
  scores: EvaluationScore[];
}

export interface ScoreInput {
  sheet: string;
  category?: string;
  criterion_key: string;
  criterion_label?: string;
  score: number | null;
  max_score?: number;
  weight?: number;
  remarks?: string;
  source?: string;
  source_ref_id?: string;
}

export const evaluationApiService = {
  async listEvaluations(params?: {
    userId?: string;
    status?: string;
  }): Promise<Evaluation[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.userId) queryParams.set("userId", params.userId);
      if (params?.status) queryParams.set("status", params.status);
      const qs = queryParams.toString();
      const { data } = await apiClient.get(
        `/api/admin/evaluations${qs ? `?${qs}` : ""}`
      );
      return data as Evaluation[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getEvaluation(evaluationId: string): Promise<EvaluationDetail> {
    try {
      const { data } = await apiClient.get(
        `/api/admin/evaluations/${evaluationId}`
      );
      return data as EvaluationDetail;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async createEvaluation(payload: {
    userId: string;
    learningPathId?: string;
    traineeInfo?: Record<string, unknown>;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<{ id: string }> {
    try {
      const { data } = await apiClient.post("/api/admin/evaluations", payload);
      return data as { id: string };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateEvaluation(
    evaluationId: string,
    updates: Partial<{
      status: string;
      trainee_info: Record<string, unknown>;
      period_start: string | null;
      period_end: string | null;
      learning_path_id: string | null;
      evaluator_id: string | null;
    }>
  ): Promise<{ id: string; status: string; updated_at: string }> {
    try {
      const { data } = await apiClient.patch(
        `/api/admin/evaluations/${evaluationId}`,
        updates
      );
      return data as { id: string; status: string; updated_at: string };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteEvaluation(evaluationId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/admin/evaluations/${evaluationId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async upsertScores(
    evaluationId: string,
    scores: ScoreInput[]
  ): Promise<{ id: string; sheet: string; criterion_key: string; score: number }[]> {
    try {
      const { data } = await apiClient.post(
        `/api/admin/evaluations/${evaluationId}/scores`,
        { scores }
      );
      return data as { id: string; sheet: string; criterion_key: string; score: number }[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteScore(
    evaluationId: string,
    sheet: string,
    criterionKey: string
  ): Promise<{ deleted: boolean }> {
    try {
      const encodedKey = encodeURIComponent(criterionKey);
      const { data } = await apiClient.delete(
        `/api/admin/evaluations/${evaluationId}/scores/${sheet}/${encodedKey}`
      );
      return data as { deleted: boolean };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async autoPopulate(
    evaluationId: string
  ): Promise<{ count: number; scores: ScoreInput[] }> {
    try {
      const { data } = await apiClient.post(
        `/api/admin/evaluations/${evaluationId}/auto-populate`
      );
      return data as { count: number; scores: ScoreInput[] };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  getExportUrl(evaluationId: string): string {
    return `/api/admin/evaluations/${evaluationId}/export.xlsx`;
  },
};
