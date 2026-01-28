import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import { calculateTopicEndDate } from "../lib/topicDates";
import type {
  Activity,
  Course,
  DashboardData,
  Enrollment,
  Form,
  Lesson,
  LessonAssignment,
  LessonSubmission,
  LessonTopic,
  Topic,
  TopicCompletionRequest,
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
      show_score: true,
      max_score: 100,
    },
    {
      id: "quiz-2",
      course_id: "course-data-02",
      title: "Data Fluency",
      description: "Submit your Microsoft Forms score once graded.",
      total_questions: 8,
      show_score: false,
      max_score: 100,
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
  topicCompletionRequests: [],
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
    const [topics, topicProgress] = await Promise.all([
      readTable<Topic>("topics", mockData.topics),
      readTable<TopicProgress>("topic_progress", mockData.topicProgress, userFilter),
    ]);

    const topicCompletionRequests = await readTable<TopicCompletionRequest>(
      "topic_completion_requests",
      mockData.topicCompletionRequests,
      userFilter
    );

    return { topics, topicProgress, topicCompletionRequests };
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
    const endDate = calculateTopicEndDate(startDate, payload.timeAllocated, payload.timeUnit);

    const { data, error } = await supabase
      .from("topic_progress")
      .insert({
        topic_id: payload.topicId,
        user_id: payload.userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: "in_progress",
      })
      .select("id, topic_id, user_id, start_date, end_date, status, created_at, updated_at")
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as TopicProgress;
  },

  async completeTopic(payload: { topicId: string; userId: string }): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const { error } = await supabase
      .from("topic_progress")
      .update({ status: "completed" })
      .eq("topic_id", payload.topicId)
      .eq("user_id", payload.userId);
    if (error) {
      throw new Error(error.message);
    }
  },
  async submitTopicCompletionProof(payload: {
    topicId: string;
    courseId?: string | null;
    userId: string;
    file: File;
  }): Promise<TopicCompletionRequest> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(payload.file.type)) {
      throw new Error("Proof file must be a JPG or PNG image.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("topic_completion_requests")
      .select("id, status")
      .eq("topic_id", payload.topicId)
      .eq("user_id", payload.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing) {
      throw new Error("A completion proof is already pending review.");
    }

    const timestamp = Date.now();
    const safeName = payload.file.name.replace(/\s+/g, "_");
    const filePath = `${payload.userId}/${payload.topicId}/${timestamp}-${safeName}`;
    const upload = await supabase.storage.from("topic-proofs").upload(filePath, payload.file, {
      contentType: payload.file.type,
      upsert: false,
    });
    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const { data, error } = await supabase
      .from("topic_completion_requests")
      .insert({
        topic_id: payload.topicId,
        user_id: payload.userId,
        course_id: payload.courseId ?? null,
        storage_path: filePath,
        file_name: payload.file.name,
        file_type: payload.file.type,
        status: "pending",
      })
      .select(
        "id, topic_id, user_id, course_id, storage_path, file_name, file_type, status, created_at, updated_at, reviewed_at, reviewed_by"
      )
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data as TopicCompletionRequest;
  },

  async getDashboardData(userId?: string): Promise<DashboardData> {
    const effectiveUserId = userId || "demo-user";
    const mockData = buildMockData(effectiveUserId);

    const userFilter = userId ? { user_id: userId } : undefined;
    const [
      courses,
      lessons,
      lessonTopics,
      lessonAssignments,
      lessonSubmissions,
      enrollments,
      activities,
      quizzes,
      quizScores,
      quizAttempts,
      forms,
    ] = await Promise.all([
      readTable<Course>("courses", mockData.courses),
      readTable<Lesson>("lessons", mockData.lessons),
      readTable<LessonTopic>("lesson_topics", mockData.lessonTopics),
      readTable<LessonAssignment>("lesson_assignments", mockData.lessonAssignments, userFilter),
      readTable<LessonSubmission>("lesson_submissions", mockData.lessonSubmissions, userFilter),
      readTable<Enrollment>("enrollments", mockData.enrollments, userFilter),
      readTable<Activity>("activities", mockData.activities),
      readTable<Quiz>("quizzes", mockData.quizzes),
      readTable<QuizScore>("quiz_scores", mockData.quizScores, userFilter),
      readTable<QuizAttempt>("quiz_attempts", mockData.quizAttempts, userFilter),
      readTable<Form>("forms", mockData.forms),
    ]);

    return {
      courses,
      lessons,
      lessonTopics,
      lessonAssignments,
      lessonSubmissions,
      enrollments,
      activities,
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
    fileName: string;
    fileType: string;
  }): Promise<void> {
    try {
      await apiClient.post("/api/activities", payload);
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
      .select("id, quiz_id, user_id, answers, score, submitted_at")
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
      .select("id, quiz_id, user_id, answers, score, submitted_at")
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
};
