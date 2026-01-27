import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import type {
  Activity,
  ActivitySubmission,
  AdminUser,
  Course,
  Enrollment,
  Form,
  FormQuestion,
  FormResponse,
  QuestionDraft,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizScore,
  Role,
  UserProfile,
} from "../types/superAdmin";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
};

const parseOptions = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

export const superAdminService = {
  async getCurrentRole(userId?: string): Promise<Role | null> {
    if (!userId) return null;
    const client = requireSupabase();
    const { data, error } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.role as Role) ?? null;
  },

  async listUsers(): Promise<AdminUser[]> {
    const client = requireSupabase();
    const { data: profiles, error: profileError } = await client
      .from("profiles")
      .select("id, first_name, last_name, email, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (profileError) throw new Error(profileError.message);

    const { data: roles, error: roleError } = await client
      .from("user_roles")
      .select("user_id, role, updated_at");
    if (roleError) throw new Error(roleError.message);

    const roleMap = new Map(
      (roles ?? []).map((entry) => [entry.user_id, { role: entry.role, updated_at: entry.updated_at }])
    );

    return (profiles ?? []).map((profile: UserProfile) => {
      const roleEntry = roleMap.get(profile.id);
      return {
        ...profile,
        role: (roleEntry?.role as Role) ?? "user",
        role_updated_at: roleEntry?.updated_at ?? null,
      };
    });
  },

  async upsertUserRole(userId: string, role: Role): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("user_roles").upsert({ user_id: userId, role });
    if (error) throw new Error(error.message);
  },

  async updateUserProfile(userId: string, payload: Partial<UserProfile>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("profiles").update(payload).eq("id", userId);
    if (error) throw new Error(error.message);
  },

  async createUser(payload: {
    email: string;
    first_name?: string;
    last_name?: string;
    role: Role;
  }): Promise<void> {
    try {
      await apiClient.post("/api/admin/users", payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/admin/users/${userId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async listCourses(): Promise<Course[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("courses")
      .select("id, title, description, status, created_by, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Course[];
  },

  async createCourse(payload: Pick<Course, "title" | "description" | "status">): Promise<Course> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("courses")
      .insert(payload)
      .select("id, title, description, status, created_by, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data as Course;
  },

  async updateCourse(courseId: string, payload: Partial<Course>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("courses").update(payload).eq("id", courseId);
    if (error) throw new Error(error.message);
  },

  async deleteCourse(courseId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("courses").delete().eq("id", courseId);
    if (error) throw new Error(error.message);
  },

  async listEnrollments(): Promise<Enrollment[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("enrollments")
      .select("id, user_id, course_id, status, start_date, end_date, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Enrollment[];
  },

  async updateEnrollmentStatus(
    enrollmentId: string,
    payload: { status: string; start_date?: string | null; end_date?: string | null }
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("enrollments").update(payload).eq("id", enrollmentId);
    if (error) throw new Error(error.message);
  },

  async listActivities(): Promise<Activity[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("activities")
      .select("id, course_id, user_id, title, description, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Activity[];
  },

  async createActivity(
    payload: Pick<Activity, "title" | "description" | "course_id" | "status" | "user_id">
  ) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("activities")
      .insert(payload)
      .select("id, course_id, user_id, title, description, status, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return data as Activity;
  },

  async updateActivity(activityId: string, payload: Partial<Activity>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("activities").update(payload).eq("id", activityId);
    if (error) throw new Error(error.message);
  },

  async deleteActivity(activityId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("activities").delete().eq("id", activityId);
    if (error) throw new Error(error.message);
  },

  async listActivitySubmissions(): Promise<ActivitySubmission[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("activity_submissions")
      .select(
        "id, activity_id, user_id, course_id, title, file_name, file_type, storage_path, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ActivitySubmission[];
  },
  async getActivitySubmissionUrl(storagePath?: string | null): Promise<string | null> {
    if (!storagePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from("activity-submissions")
      .createSignedUrl(storagePath, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },

  async deleteActivitySubmission(submissionId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("activity_submissions").delete().eq("id", submissionId);
    if (error) throw new Error(error.message);
  },

  async listQuizzes(): Promise<Quiz[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quizzes")
      .select(
        "id, title, description, course_id, assigned_user_id, show_score, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Quiz[];
  },

  async listQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quiz_questions")
      .select("id, quiz_id, prompt, options, correct_answer, order_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      ...item,
      options: parseOptions(item.options),
    })) as QuizQuestion[];
  },

  async createQuiz(payload: {
    quiz: Pick<Quiz, "title" | "description" | "course_id" | "assigned_user_id" | "show_score">;
    questions: QuestionDraft[];
  }): Promise<Quiz> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quizzes")
      .insert(payload.quiz)
      .select("id, title, description, course_id, assigned_user_id, show_score, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);

    if (payload.questions.length > 0) {
      const { error: questionError } = await client.from("quiz_questions").insert(
        payload.questions.map((question, index) => ({
          quiz_id: data.id,
          prompt: question.prompt,
          options: question.options,
          correct_answer: question.correctAnswer ?? null,
          order_index: index,
        }))
      );
      if (questionError) throw new Error(questionError.message);
    }

    return data as Quiz;
  },

  async updateQuiz(payload: {
    quizId: string;
    updates: Partial<Quiz>;
    questions: QuestionDraft[];
  }): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("quizzes").update(payload.updates).eq("id", payload.quizId);
    if (error) throw new Error(error.message);

    const { error: deleteError } = await client
      .from("quiz_questions")
      .delete()
      .eq("quiz_id", payload.quizId);
    if (deleteError) throw new Error(deleteError.message);

    if (payload.questions.length > 0) {
      const { error: insertError } = await client.from("quiz_questions").insert(
        payload.questions.map((question, index) => ({
          quiz_id: payload.quizId,
          prompt: question.prompt,
          options: question.options,
          correct_answer: question.correctAnswer ?? null,
          order_index: index,
        }))
      );
      if (insertError) throw new Error(insertError.message);
    }
  },

  async deleteQuiz(quizId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("quizzes").delete().eq("id", quizId);
    if (error) throw new Error(error.message);
  },

  async listQuizAttempts(): Promise<QuizAttempt[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, answers, score, submitted_at")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as QuizAttempt[];
  },
  async listQuizScores(): Promise<QuizScore[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quiz_scores")
      .select("id, quiz_id, user_id, score, submitted_at, graded_by")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as QuizScore[];
  },
  async createQuizScore(payload: { quiz_id: string; user_id: string; score: number }) {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quiz_scores")
      .insert(payload)
      .select("id, quiz_id, user_id, score, submitted_at, graded_by")
      .single();
    if (error) throw new Error(error.message);
    return data as QuizScore;
  },
  async updateQuizScore(scoreId: string, score: number): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("quiz_scores").update({ score }).eq("id", scoreId);
    if (error) throw new Error(error.message);
  },

  async updateQuizAttemptScore(attemptId: string, score: number): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("quiz_attempts").update({ score }).eq("id", attemptId);
    if (error) throw new Error(error.message);
  },

  async listForms(): Promise<Form[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("forms")
      .select(
        "id, title, description, status, assigned_user_id, link_url, start_at, end_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Form[];
  },

  async listFormQuestions(formId: string): Promise<FormQuestion[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("form_questions")
      .select("id, form_id, prompt, options, order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      ...item,
      options: parseOptions(item.options),
    })) as FormQuestion[];
  },

  async createForm(payload: {
    form: Pick<
      Form,
      "title" | "description" | "status" | "assigned_user_id" | "link_url" | "start_at" | "end_at"
    >;
    questions: QuestionDraft[];
  }): Promise<Form> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("forms")
      .insert(payload.form)
      .select(
        "id, title, description, status, assigned_user_id, link_url, start_at, end_at, created_at, updated_at"
      )
      .single();
    if (error) throw new Error(error.message);

    if (payload.questions.length > 0) {
      const { error: questionError } = await client.from("form_questions").insert(
        payload.questions.map((question, index) => ({
          form_id: data.id,
          prompt: question.prompt,
          options: question.options,
          order_index: index,
        }))
      );
      if (questionError) throw new Error(questionError.message);
    }

    return data as Form;
  },

  async updateForm(payload: {
    formId: string;
    updates: Partial<Form>;
    questions: QuestionDraft[];
  }): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("forms").update(payload.updates).eq("id", payload.formId);
    if (error) throw new Error(error.message);

    const { error: deleteError } = await client
      .from("form_questions")
      .delete()
      .eq("form_id", payload.formId);
    if (deleteError) throw new Error(deleteError.message);

    if (payload.questions.length > 0) {
      const { error: insertError } = await client.from("form_questions").insert(
        payload.questions.map((question, index) => ({
          form_id: payload.formId,
          prompt: question.prompt,
          options: question.options,
          order_index: index,
        }))
      );
      if (insertError) throw new Error(insertError.message);
    }
  },

  async deleteForm(formId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("forms").delete().eq("id", formId);
    if (error) throw new Error(error.message);
  },

  async listFormResponses(): Promise<FormResponse[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("form_responses")
      .select("id, form_id, user_id, answers, submitted_at")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FormResponse[];
  },
};
