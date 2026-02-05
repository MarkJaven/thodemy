import { supabase } from "../lib/supabaseClient";
import { apiClient, getApiErrorMessage, withTimeout } from "../lib/apiClient";
import { auditLogService } from "./auditLogService";
import type {
  Activity,
  ActivitySubmission,
  AdminUser,
  Course,
  Lesson,
  LessonAssignment,
  LessonSubmission,
  LessonTopic,
  Topic,
  TopicSubmission,
  CourseCompletionRequest,
  TopicProgress,
  Enrollment,
  Form,
  FormQuestion,
  FormResponse,
  QuestionDraft,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizScore,
  LearningPath,
  LearningPathEnrollment,
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

const REQUEST_HARD_TIMEOUT_MS = 20000;

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
    try {
      const { data } = await apiClient.get("/api/admin/users");
      return (data?.users ?? []) as AdminUser[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
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
    username: string;
    password: string;
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

  async updateUserAccount(
    userId: string,
    payload: { username?: string; password?: string; role?: Role; is_active?: boolean }
  ): Promise<void> {
    const updatePayload: { username?: string; password?: string; role?: Role; is_active?: boolean } = {};
    if (payload.username !== undefined) updatePayload.username = payload.username;
    if (payload.password !== undefined) updatePayload.password = payload.password;
    if (payload.role !== undefined) updatePayload.role = payload.role;
    if (payload.is_active !== undefined) updatePayload.is_active = payload.is_active;

    if (Object.keys(updatePayload).length === 0) {
      return;
    }

    try {
      await apiClient.patch(`/api/admin/users/${userId}`, updatePayload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async listCourses(): Promise<Course[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("courses")
      .select(
        "id, title, description, status, topic_ids, topic_prerequisites, topic_corequisites, total_hours, total_days, course_code, enrollment_enabled, enrollment_limit, start_at, end_at, created_by, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Course[];
  },

  async listLearningPaths(): Promise<LearningPath[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("learning_paths")
      .select(
        "id, title, description, course_ids, total_hours, total_days, enrollment_code, status, enrollment_enabled, enrollment_limit, start_at, end_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as LearningPath[];
  },

  async listLearningPathEnrollments(): Promise<LearningPathEnrollment[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("learning_path_enrollments")
      .select(
        "id, user_id, learning_path_id, status, enrolled_at, start_date, end_date, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as LearningPathEnrollment[];
  },

  async updateLearningPathEnrollmentStatus(
    enrollmentId: string,
    status: string
  ): Promise<void> {
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

  async createCourse(payload: Pick<Course, "title" | "description" | "status">): Promise<Course> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("courses")
      .insert(payload)
      .select("id, title, description, status, created_by, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "course",
      entityId: data.id,
      action: "created",
      details: { title: data.title, status: data.status },
    });
    return data as Course;
  },

  async updateCourse(courseId: string, payload: Partial<Course>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("courses").update(payload).eq("id", courseId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "course",
      entityId: courseId,
      action: "updated",
      details: { title: payload.title ?? null, status: payload.status ?? null },
    });
  },

  async deleteCourse(courseId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("courses").delete().eq("id", courseId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "course",
      entityId: courseId,
      action: "deleted",
    });
  },

  async listLessons(): Promise<Lesson[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lessons")
      .select("id, course_id, title, order_index, duration_minutes, is_required")
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Lesson[];
  },

  async createLesson(payload: Pick<Lesson, "course_id" | "title" | "order_index">): Promise<Lesson> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lessons")
      .insert(payload)
      .select("id, course_id, title, order_index, duration_minutes, is_required")
      .single();
    if (error) throw new Error(error.message);
    return data as Lesson;
  },

  async updateLesson(lessonId: string, payload: Partial<Lesson>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lessons").update(payload).eq("id", lessonId);
    if (error) throw new Error(error.message);
  },

  async deleteLesson(lessonId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lessons").delete().eq("id", lessonId);
    if (error) throw new Error(error.message);
  },

  async listLessonTopics(): Promise<LessonTopic[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lesson_topics")
      .select("id, lesson_id, title, content, order_index")
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as LessonTopic[];
  },

  async createLessonTopic(
    payload: Pick<LessonTopic, "lesson_id" | "title" | "content" | "order_index">
  ): Promise<LessonTopic> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lesson_topics")
      .insert(payload)
      .select("id, lesson_id, title, content, order_index")
      .single();
    if (error) throw new Error(error.message);
    return data as LessonTopic;
  },

  async updateLessonTopic(topicId: string, payload: Partial<LessonTopic>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lesson_topics").update(payload).eq("id", topicId);
    if (error) throw new Error(error.message);
  },

  async deleteLessonTopic(topicId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lesson_topics").delete().eq("id", topicId);
    if (error) throw new Error(error.message);
  },

  async listTopics(): Promise<Topic[]> {
    try {
      const { data } = await apiClient.get("/api/topics");
      return (data?.topics ?? []) as Topic[];
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async listTopicProgress(): Promise<TopicProgress[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("topic_progress")
      .select("id, topic_id, user_id, status, start_date, end_date, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as TopicProgress[];
  },

  async updateTopicProgressStatus(payload: {
    topicId: string;
    userId: string;
    status: "in_progress" | "completed";
    end_date?: string | null;
  }): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("topic_progress")
      .update({ status: payload.status, end_date: payload.end_date ?? null })
      .eq("topic_id", payload.topicId)
      .eq("user_id", payload.userId);
    if (error) throw new Error(error.message);
  },

  async listTopicCompletionRequests(): Promise<TopicSubmission[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("topic_submissions")
      .select(
        "id, topic_id, user_id, file_url, message, status, submitted_at, created_at, updated_at, reviewed_at, reviewed_by, review_notes"
      )
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as TopicSubmission[];
  },

  async updateTopicCompletionRequest(
    requestId: string,
    payload: Partial<TopicSubmission>
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("topic_submissions")
      .update(payload)
      .eq("id", requestId);
    if (error) throw new Error(error.message);
  },

  async getTopicProofUrl(storagePath?: string | null): Promise<string | null> {
    if (!storagePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from("topic-proofs")
      .createSignedUrl(storagePath, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },

  async listCourseCompletionRequests(): Promise<CourseCompletionRequest[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("course_completion_requests")
      .select(
        "id, course_id, learning_path_id, user_id, storage_path, file_name, file_type, status, created_at, updated_at, reviewed_at, reviewed_by"
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CourseCompletionRequest[];
  },

  async updateCourseCompletionRequest(
    requestId: string,
    payload: Partial<CourseCompletionRequest>
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client
      .from("course_completion_requests")
      .update(payload)
      .eq("id", requestId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "course_completion_request",
      entityId: requestId,
      action: payload.status ? "status_changed" : "updated",
      details: { status: payload.status ?? null },
    });
  },

  async getCourseProofUrl(storagePath?: string | null): Promise<string | null> {
    if (!storagePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from("course-proofs")
      .createSignedUrl(storagePath, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },

  async createTopic(
    payload: Pick<
      Topic,
      | "title"
      | "description"
      | "link_url"
      | "time_allocated"
      | "time_unit"
      | "pre_requisites"
      | "co_requisites"
      | "certificate_file_url"
      | "start_date"
      | "end_date"
      | "author_id"
      | "status"
    >
  ): Promise<Topic> {
    try {
      const { data } = await withTimeout(
        apiClient.post("/api/topics", payload),
        REQUEST_HARD_TIMEOUT_MS,
        "Saving topic timed out. Please check the server connection."
      );
      return data?.topic as Topic;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async updateTopic(topicId: string, payload: Partial<Topic>): Promise<void> {
    try {
      await withTimeout(
        apiClient.patch(`/api/topics/${topicId}`, payload),
        REQUEST_HARD_TIMEOUT_MS,
        "Updating topic timed out. Please check the server connection."
      );
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async deleteTopic(topicId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/topics/${topicId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async listLessonAssignments(): Promise<LessonAssignment[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lesson_assignments")
      .select(
        "id, user_id, course_id, lesson_id, start_at, due_at, status, submitted_at, review_status, reviewed_at, reviewed_by"
      )
      .order("due_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as LessonAssignment[];
  },

  async createLessonAssignments(assignments: Omit<LessonAssignment, "id">[]): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lesson_assignments").insert(assignments);
    if (error) throw new Error(error.message);
  },

  async updateLessonAssignment(
    assignmentId: string,
    payload: Partial<LessonAssignment>
  ): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lesson_assignments").update(payload).eq("id", assignmentId);
    if (error) throw new Error(error.message);
  },

  async deleteLessonAssignment(assignmentId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("lesson_assignments").delete().eq("id", assignmentId);
    if (error) throw new Error(error.message);
  },

  async listLessonSubmissions(): Promise<LessonSubmission[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("lesson_submissions")
      .select("id, lesson_assignment_id, user_id, file_path, file_type, submitted_at")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as LessonSubmission[];
  },

  async getLessonSubmissionUrl(filePath?: string | null): Promise<string | null> {
    if (!filePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from("lesson-proofs")
      .createSignedUrl(filePath, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  },

  async getQuizProofUrl(storagePath?: string | null): Promise<string | null> {
    if (!storagePath) return null;
    const client = requireSupabase();
    const { data, error } = await client.storage
      .from("quiz-proofs")
      .createSignedUrl(storagePath, 300);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
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
    await auditLogService.recordAuditLog({
      entityType: "enrollment",
      entityId: enrollmentId,
      action: "status_changed",
      details: { status: payload.status },
    });
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
    await auditLogService.recordAuditLog({
      entityType: "activity",
      entityId: data.id,
      action: "created",
      details: { title: data.title, status: data.status },
    });
    return data as Activity;
  },

  async updateActivity(activityId: string, payload: Partial<Activity>): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("activities").update(payload).eq("id", activityId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "activity",
      entityId: activityId,
      action: "updated",
      details: { title: payload.title ?? null, status: payload.status ?? null },
    });
  },

  async deleteActivity(activityId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("activities").delete().eq("id", activityId);
    if (error) throw new Error(error.message);
    await auditLogService.recordAuditLog({
      entityType: "activity",
      entityId: activityId,
      action: "deleted",
    });
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
    await auditLogService.recordAuditLog({
      entityType: "activity_submission",
      entityId: submissionId,
      action: "deleted",
    });
  },

  async listQuizzes(): Promise<Quiz[]> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quizzes")
      .select(
        "id, title, description, course_id, assigned_user_id, status, link_url, start_at, end_at, show_score, max_score, created_at, updated_at"
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
    quiz: Pick<
      Quiz,
      | "title"
      | "description"
      | "course_id"
      | "assigned_user_id"
      | "status"
      | "link_url"
      | "start_at"
      | "end_at"
      | "show_score"
      | "max_score"
    >;
    questions: QuestionDraft[];
  }): Promise<Quiz> {
    const client = requireSupabase();
    const { data, error } = await client
      .from("quizzes")
      .insert(payload.quiz)
      .select(
        "id, title, description, course_id, assigned_user_id, status, link_url, start_at, end_at, show_score, max_score, created_at, updated_at"
      )
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
      .select(
        "id, quiz_id, user_id, answers, score, submitted_at, proof_url, proof_file_name, proof_file_type, proof_message, proof_submitted_at"
      )
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

  async deleteQuizScore(scoreId: string): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from("quiz_scores").delete().eq("id", scoreId);
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
