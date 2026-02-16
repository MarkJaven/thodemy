import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import { calculateLearningPathEndDate } from "../lib/learningPathSchedule";
import type {
  Activity,
  ActivitySubmission,
  Course,
  DashboardData,
  Enrollment,
  Form,
  LearningPath,
  LearningPathEnrollment,
  Lesson,
  LessonAssignment,
  LessonSubmission,
  LessonTopic,
  Topic,
  TopicSubmission,
  CourseCompletionRequest,
  TopicProgress,
  TopicsData,
  Quiz,
  QuizAttempt,
  QuizScore,
} from "../types/dashboard";

const buildMockData = (userId: string): DashboardData => ({
  courses: [
    {
      id: "course-ux-01",
      title: "Design Systems for Training",
      description: "Build consistent learning journeys with reusable UI patterns.",
      category: "Design",
      level: "Intermediate",
      duration_hours: 6,
      banner_url: "",
      topic_ids: ["topic-setup", "topic-foundations"],
      total_hours: 6,
      total_days: 1,
      course_code: "CRS-UX01",
      status: "published",
      enrollment_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "course-data-02",
      title: "Data Essentials for Analysts",
      description: "Track progress, craft dashboards, and tell your data story.",
      category: "Analytics",
      level: "Beginner",
      duration_hours: 4,
      banner_url: "",
      topic_ids: ["topic-setup", "topic-collaboration"],
      total_hours: 4,
      total_days: 1,
      course_code: "CRS-DATA02",
      status: "published",
      enrollment_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "course-comms-03",
      title: "Confident Stakeholder Updates",
      description: "Communicate wins, blockers, and next steps with clarity.",
      category: "Leadership",
      level: "All Levels",
      duration_hours: 3,
      banner_url: "",
      topic_ids: ["topic-foundations"],
      total_hours: 3,
      total_days: 1,
      course_code: "CRS-COMMS03",
      status: "draft",
      enrollment_enabled: false,
      created_at: new Date().toISOString(),
    },
  ],
  lessons: [
    {
      id: "lesson-ux-1",
      course_id: "course-ux-01",
      title: "System Foundations",
      order_index: 1,
      duration_minutes: 25,
      is_required: true,
    },
    {
      id: "lesson-ux-2",
      course_id: "course-ux-01",
      title: "Component Libraries",
      order_index: 2,
      duration_minutes: 30,
      is_required: true,
    },
    {
      id: "lesson-data-1",
      course_id: "course-data-02",
      title: "Data Hygiene Basics",
      order_index: 1,
      duration_minutes: 20,
      is_required: true,
    },
    {
      id: "lesson-comms-1",
      course_id: "course-comms-03",
      title: "Narratives That Stick",
      order_index: 1,
      duration_minutes: 15,
      is_required: true,
    },
  ],
  lessonTopics: [
    {
      id: "topic-ux-1",
      lesson_id: "lesson-ux-1",
      title: "Design tokens overview",
      content: "Review core spacing, color, and typography decisions.",
      order_index: 1,
    },
    {
      id: "topic-ux-2",
      lesson_id: "lesson-ux-1",
      title: "Component states",
      content: "Document default, hover, and focus states for key UI.",
      order_index: 2,
    },
    {
      id: "topic-data-1",
      lesson_id: "lesson-data-1",
      title: "Data cleanup checklist",
      content: "Clean nulls, standardize naming, and validate calculations.",
      order_index: 1,
    },
  ],
  lessonAssignments: [
    {
      id: "assign-ux-1",
      user_id: userId,
      course_id: "course-ux-01",
      lesson_id: "lesson-ux-1",
      start_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      due_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      status: "assigned",
      submitted_at: null,
      review_status: null,
    },
    {
      id: "assign-data-1",
      user_id: userId,
      course_id: "course-data-02",
      lesson_id: "lesson-data-1",
      start_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      due_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      status: "submitted",
      submitted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      review_status: "late",
    },
  ],
  lessonSubmissions: [
    {
      id: "submission-1",
      lesson_assignment_id: "assign-data-1",
      user_id: userId,
      file_path: "demo/submission.png",
      file_type: "image/png",
      submitted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
  ],
  enrollments: [
    {
      id: "enroll-1",
      user_id: userId,
      course_id: "course-ux-01",
      enrolled_at: new Date().toISOString(),
      status: "active",
    },
    {
      id: "enroll-2",
      user_id: userId,
      course_id: "course-data-02",
      enrolled_at: new Date().toISOString(),
      status: "active",
    },
  ],
  learningPaths: [
    {
      id: "lp-foundations",
      title: "Productivity Foundations",
      description: "Build momentum across design, data, and communication essentials.",
      course_ids: ["course-ux-01", "course-data-02", "course-comms-03"],
      total_hours: 13,
      total_days: 2,
      enrollment_code: "LP-FOUND",
      status: "published",
      enrollment_enabled: true,
      created_at: new Date().toISOString(),
    },
  ],
  learningPathEnrollments: [
    {
      id: "lp-enroll-1",
      user_id: userId,
      learning_path_id: "lp-foundations",
      enrolled_at: new Date().toISOString(),
      status: "active",
    },
  ],
  courseCompletionRequests: [],
  activities: [
    {
      id: "activity-1",
      user_id: userId,
      course_id: "course-ux-01",
      title: "Week 1 Reflection",
      description: "Share a quick reflection about the system foundations lesson.",
      status: "active",
      file_name: "reflection.pdf",
      file_type: "application/pdf",
      file_url: "",
      created_at: new Date().toISOString(),
    },
    {
      id: "activity-2",
      user_id: null,
      course_id: "course-data-02",
      title: "Data Snapshot",
      description: "Upload your latest dashboard screenshot.",
      status: "active",
      file_name: null,
      file_type: null,
      file_url: null,
      created_at: new Date().toISOString(),
    },
  ],
  quizzes: [
    {
      id: "quiz-1",
      course_id: "course-ux-01",
      title: "Foundations Check",
      description: "Quick review from the Microsoft Form assignment.",
      total_questions: 10,
      status: "active",
      show_score: true,
      max_score: 100,
      link_url: "https://forms.office.com/",
      start_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      end_at: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "quiz-2",
      course_id: "course-data-02",
      title: "Data Fluency",
      description: "Submit your Microsoft Forms score once graded.",
      total_questions: 8,
      status: "active",
      show_score: false,
      max_score: 100,
      link_url: "https://forms.office.com/",
      start_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      end_at: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  quizScores: [
    {
      id: "score-1",
      quiz_id: "quiz-1",
      user_id: userId,
      score: 86,
      submitted_at: new Date().toISOString(),
      graded_by: "admin",
    },
  ],
  quizAttempts: [
    {
      id: "attempt-1",
      quiz_id: "quiz-1",
      user_id: userId,
      answers: {},
      score: null,
      submitted_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      proof_url: "demo/quiz-proof.pdf",
      proof_file_name: "quiz-proof.pdf",
      proof_file_type: "application/pdf",
      proof_submitted_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ],
  forms: [
    {
      id: "form-1",
      title: "Training Feedback",
      description: "Share how the training is helping your day-to-day work.",
      status: "open",
      assigned_user_id: userId,
      link_url: "https://forms.office.com/",
      start_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      end_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      due_at: "",
    },
    {
      id: "form-2",
      title: "Support Request",
      description: "Ask for help if you are blocked in a lesson.",
      status: "open",
      assigned_user_id: userId,
      link_url: "https://forms.office.com/",
      start_at: "",
      end_at: "",
      due_at: "",
    },
  ],
});

const buildMockTopicsData = (userId: string): TopicsData => ({
  topics: [
    {
      id: "topic-setup",
      title: "Orientation & Setup",
      description: "Complete your onboarding checklist and tool access.",
      link_url: "https://example.com/onboarding",
      time_allocated: 2,
      time_unit: "days",
      pre_requisites: [],
      co_requisites: [],
      created_at: new Date().toISOString(),
    },
    {
      id: "topic-foundations",
      title: "Core Foundations",
      description: "Review key workflows and expectations for the quarter.",
      link_url: "https://example.com/foundations",
      time_allocated: 3,
      time_unit: "days",
      pre_requisites: ["topic-setup"],
      co_requisites: [],
      created_at: new Date().toISOString(),
    },
    {
      id: "topic-collaboration",
      title: "Collaboration Rituals",
      description: "Practice standups, feedback loops, and handoffs.",
      link_url: "https://example.com/collaboration",
      time_allocated: 2,
      time_unit: "days",
      pre_requisites: ["topic-setup"],
      co_requisites: ["topic-foundations"],
      created_at: new Date().toISOString(),
    },
  ],
  topicProgress: [
    {
      id: "progress-setup",
      topic_id: "topic-setup",
      user_id: userId,
      start_date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      end_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      status: "completed",
      created_at: new Date().toISOString(),
    },
    {
      id: "progress-foundations",
      topic_id: "topic-foundations",
      user_id: userId,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
      status: "in_progress",
      created_at: new Date().toISOString(),
    },
  ],
  topicSubmissions: [],
});

const readTable = async <T,>(
  table: string,
  fallback: T[],
  filters?: Record<string, string>
): Promise<T[]> => {
  if (!supabase) return fallback;
  let query = supabase.from(table).select("*");
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as T[];
};

export const dashboardApi = {
  async getTopicsData(userId?: string): Promise<TopicsData> {
    const effectiveUserId = userId || "demo-user";
    const mockData = buildMockTopicsData(effectiveUserId);

    const userFilter = userId ? { user_id: userId } : undefined;
    let topics = mockData.topics;
    if (supabase) {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("status", "active")
        .is("deleted_at", null);
      if (error) {
        throw new Error(error.message);
      }
      topics = (data ?? []) as Topic[];
    }

    const topicProgress = await readTable<TopicProgress>(
      "topic_progress",
      mockData.topicProgress,
      userFilter
    );

    const topicSubmissions = await readTable<TopicSubmission>(
      "topic_submissions",
      mockData.topicSubmissions,
      userFilter
    );

    return { topics, topicProgress, topicSubmissions };
  },

  async startTopic(payload: {
    topicId: string;
    userId: string;
    timeAllocated: number;
    timeUnit?: "hours" | "days" | null;
    startDate?: Date;
  }): Promise<TopicProgress> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const startDate = payload.startDate ?? new Date();

    const { data, error } = await supabase
      .from("topic_progress")
      .insert({
        topic_id: payload.topicId,
        user_id: payload.userId,
        start_date: startDate.toISOString(),
        end_date: null,
        status: "in_progress",
      })
      .select("id, topic_id, user_id, start_date, end_date, status, created_at, updated_at")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as TopicProgress;
  },

  async submitTopicSubmission(payload: {
    topicId: string;
    userId: string;
    file: File;
    message?: string | null;
  }): Promise<TopicSubmission> {
    const formData = new FormData();
    formData.append("file", payload.file);
    if (payload.message) {
      formData.append("message", payload.message);
    }

    try {
      const { data } = await apiClient.post(
        `/api/topics/${payload.topicId}/submissions`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data?.submission as TopicSubmission;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },

  async getDashboardData(userId?: string): Promise<DashboardData> {
    const effectiveUserId = userId || "demo-user";
    const mockData = buildMockData(effectiveUserId);

    const userFilter = userId ? { user_id: userId } : undefined;
    const enrollments = await readTable<Enrollment>(
      "enrollments",
      mockData.enrollments,
      userFilter
    );
    const learningPathEnrollments = await readTable<LearningPathEnrollment>(
      "learning_path_enrollments",
      mockData.learningPathEnrollments,
      userFilter
    );
    const courseCompletionRequests = await readTable<CourseCompletionRequest>(
      "course_completion_requests",
      mockData.courseCompletionRequests,
      userFilter
    );

    const enrolledCourseIds = Array.from(
      new Set(
        enrollments
          .filter((entry) =>
            ["pending", "approved", "active", "completed", "enrolled"].includes(entry.status ?? "")
          )
          .map((entry) => entry.course_id)
          .filter(Boolean)
      )
    );

    const enrolledLearningPathIds = Array.from(
      new Set(
        learningPathEnrollments
          .map((entry) => entry.learning_path_id)
          .filter(Boolean)
      )
    );

    let learningPaths: LearningPath[] = [];
    if (!supabase || !userId) {
      learningPaths = await readTable<LearningPath>("learning_paths", mockData.learningPaths);
    } else if (enrolledLearningPathIds.length > 0) {
      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .in("id", enrolledLearningPathIds);
      if (error) {
        throw new Error(error.message);
      }
      learningPaths = (data ?? []) as LearningPath[];
    }

    const learningPathCourseIds = Array.from(
      new Set(learningPaths.flatMap((path) => path.course_ids ?? []).filter(Boolean))
    );
    const combinedCourseIds = Array.from(
      new Set([...enrolledCourseIds, ...learningPathCourseIds])
    );

    let courses: Course[] = [];
    if (!supabase || !userId) {
      courses = await readTable<Course>("courses", mockData.courses);
    } else if (combinedCourseIds.length > 0) {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .in("id", combinedCourseIds);
      if (error) {
        throw new Error(error.message);
      }
      courses = (data ?? []) as Course[];
    }

    const [
      lessons,
      lessonTopics,
      lessonAssignments,
      lessonSubmissions,
      activities,
      activitySubmissions,
      quizzes,
      quizScores,
      quizAttempts,
      forms,
    ] = await Promise.all([
      readTable<Lesson>("lessons", mockData.lessons),
      readTable<LessonTopic>("lesson_topics", mockData.lessonTopics),
      readTable<LessonAssignment>("lesson_assignments", mockData.lessonAssignments, userFilter),
      readTable<LessonSubmission>("lesson_submissions", mockData.lessonSubmissions, userFilter),
      readTable<Activity>("activities", mockData.activities),
      readTable<ActivitySubmission>("activity_submissions", [], userFilter),
      readTable<Quiz>("quizzes", mockData.quizzes),
      readTable<QuizScore>("quiz_scores", mockData.quizScores, userFilter),
      readTable<QuizAttempt>("quiz_attempts", mockData.quizAttempts, userFilter),
      readTable<Form>("forms", mockData.forms),
    ]);

    const submissionActivities: Activity[] = activitySubmissions.map((submission) => ({
      id: submission.id,
      user_id: submission.user_id,
      course_id: submission.course_id ?? null,
      activity_id: submission.activity_id ?? null,
      title: submission.title,
      description: submission.description ?? null,
      github_url: submission.github_url ?? null,
      status: submission.status ?? "pending",
      score: submission.score ?? null,
      reviewed_at: submission.reviewed_at ?? null,
      review_notes: submission.review_notes ?? null,
      file_name: submission.file_name,
      file_type: submission.file_type,
      file_url: submission.storage_path ?? null,
      created_at: submission.created_at ?? null,
    }));

    return {
      courses,
      lessons,
      lessonTopics,
      lessonAssignments,
      lessonSubmissions,
      enrollments,
      learningPaths,
      learningPathEnrollments,
      courseCompletionRequests,
      activities: [...submissionActivities, ...activities],
      quizzes,
      quizScores,
      quizAttempts,
      forms,
    };
  },
  async updateLessonAssignment(payload: {
    assignmentId: string;
    status: string;
    submittedAt?: string | null;
  }): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const { error } = await supabase
      .from("lesson_assignments")
      .update({ status: payload.status, submitted_at: payload.submittedAt ?? null })
      .eq("id", payload.assignmentId);
    if (error) {
      throw new Error(error.message);
    }
  },
  async submitLessonProof(payload: {
    assignmentId: string;
    userId: string;
    file: File;
  }): Promise<LessonSubmission> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const timestamp = Date.now();
    const safeName = payload.file.name.replace(/\s+/g, "_");
    const filePath = `${payload.userId}/${payload.assignmentId}/${timestamp}-${safeName}`;
    const upload = await supabase.storage.from("lesson-proofs").upload(filePath, payload.file);
    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const { data, error } = await supabase
      .from("lesson_submissions")
      .insert({
        lesson_assignment_id: payload.assignmentId,
        user_id: payload.userId,
        file_path: filePath,
        file_type: payload.file.type,
      })
      .select("id, lesson_assignment_id, user_id, file_path, file_type, submitted_at")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as LessonSubmission;
  },
  async submitActivity(payload: {
    title: string;
    file?: File | null;
    activityId?: string | null;
    description?: string | null;
    githubUrl?: string | null;
  }): Promise<ActivitySubmission> {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.file) {
      formData.append("file", payload.file);
    }
    if (payload.activityId) {
      formData.append("activity_id", payload.activityId);
    }
    if (payload.description) {
      formData.append("description", payload.description);
    }
    if (payload.githubUrl) {
      formData.append("github_url", payload.githubUrl);
    }

    try {
      const { data } = await apiClient.post("/api/activities", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data?.submission as ActivitySubmission;
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async deleteActivity(activityId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/activities/${activityId}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async submitQuizScore(payload: {
    quizId: string;
    score: number;
    userId?: string;
  }): Promise<void> {
    try {
      await apiClient.post("/api/quizzes/score", payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async completeQuiz(payload: { quizId: string; userId: string }): Promise<QuizAttempt> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("quiz_attempts")
      .select(
        "id, quiz_id, user_id, answers, score, submitted_at, proof_url, proof_file_name, proof_file_type, proof_message, proof_submitted_at"
      )
      .eq("quiz_id", payload.quizId)
      .eq("user_id", payload.userId)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing && existing.length > 0) {
      return existing[0] as QuizAttempt;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: payload.quizId,
        user_id: payload.userId,
        answers: {},
        submitted_at: now,
      })
      .select(
        "id, quiz_id, user_id, answers, score, submitted_at, proof_url, proof_file_name, proof_file_type, proof_message, proof_submitted_at"
      )
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as QuizAttempt;
  },
  async submitQuizProof(payload: {
    quizId: string;
    userId: string;
    file: File;
    message?: string | null;
  }): Promise<QuizAttempt> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const timestamp = Date.now();
    const safeName = payload.file.name.replace(/\s+/g, "_");
    const filePath = `${payload.userId}/${payload.quizId}/${timestamp}-${safeName}`;

    const upload = await supabase.storage.from("quiz-proofs").upload(filePath, payload.file);
    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const proofPayload = {
      proof_url: filePath,
      proof_file_name: payload.file.name,
      proof_file_type: payload.file.type,
      proof_message: payload.message?.trim() || null,
      proof_submitted_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("quiz_attempts")
      .select("id")
      .eq("quiz_id", payload.quizId)
      .eq("user_id", payload.userId)
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .update(proofPayload)
        .eq("id", existing[0].id)
        .select(
          "id, quiz_id, user_id, answers, score, submitted_at, proof_url, proof_file_name, proof_file_type, proof_message, proof_submitted_at"
        )
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as QuizAttempt;
    }

    const { data, error } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: payload.quizId,
        user_id: payload.userId,
        answers: {},
        submitted_at: new Date().toISOString(),
        ...proofPayload,
      })
      .select(
        "id, quiz_id, user_id, answers, score, submitted_at, proof_url, proof_file_name, proof_file_type, proof_message, proof_submitted_at"
      )
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as QuizAttempt;
  },
  async submitForm(payload: { formId: string; responses: Record<string, string> }): Promise<void> {
    try {
      await apiClient.post("/api/forms/submit", payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async requestEnrollment(payload: { courseCode: string }): Promise<{ courseId: string }> {
    try {
      const { data } = await apiClient.post("/api/courses/enroll", payload);
      return { courseId: data?.courseId };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async requestLearningPathEnrollment(payload: {
    enrollmentCode: string;
  }): Promise<{ learningPathId: string }> {
    try {
      const { data } = await apiClient.post("/api/learning-paths/enroll", payload);
      return { learningPathId: data?.learningPathId };
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async startLearningPathEnrollment(payload: {
    enrollmentId: string;
    userId: string;
    totalDays: number;
    startDate?: Date;
  }): Promise<{ actual_start_date: string; actual_end_date: string | null }> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const startDate = payload.startDate ?? new Date();
    const endDate =
      payload.totalDays > 0
        ? await calculateLearningPathEndDate(startDate, payload.totalDays)
        : startDate;
    const { error } = await supabase
      .from("learning_path_enrollments")
      .update({
        actual_start_date: startDate.toISOString(),
        actual_end_date: endDate ? endDate.toISOString() : null,
        status: "active",
      })
      .eq("id", payload.enrollmentId)
      .eq("user_id", payload.userId);
    if (error) {
      throw new Error(error.message);
    }
    return {
      actual_start_date: startDate.toISOString(),
      actual_end_date: endDate ? endDate.toISOString() : null,
    };
  },
  async deleteLearningPathEnrollment(enrollmentId: string): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const { error } = await supabase
      .from("learning_path_enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) {
      throw new Error(error.message);
    }
  },
};
