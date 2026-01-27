import { apiClient, getApiErrorMessage } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";
import type {
  Activity,
  Course,
  DashboardData,
  Enrollment,
  Form,
  Lesson,
  Quiz,
  QuizScore,
  UserProgress,
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
  progress: [
    {
      id: "progress-1",
      user_id: userId,
      lesson_id: "lesson-ux-1",
      completed: true,
      completed_at: new Date().toISOString(),
    },
    {
      id: "progress-2",
      user_id: userId,
      lesson_id: "lesson-data-1",
      completed: false,
      completed_at: null,
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
  async getDashboardData(userId?: string): Promise<DashboardData> {
    const effectiveUserId = userId || "demo-user";
    const mockData = buildMockData(effectiveUserId);

    const userFilter = userId ? { user_id: userId } : undefined;
    const [courses, lessons, enrollments, progress, activities, quizzes, quizScores, forms] =
      await Promise.all([
        readTable<Course>("courses", mockData.courses),
        readTable<Lesson>("lessons", mockData.lessons),
        readTable<Enrollment>("enrollments", mockData.enrollments, userFilter),
        readTable<UserProgress>("user_progress", mockData.progress, userFilter),
        readTable<Activity>("activities", mockData.activities),
        readTable<Quiz>("quizzes", mockData.quizzes),
        readTable<QuizScore>("quiz_scores", mockData.quizScores, userFilter),
        readTable<Form>("forms", mockData.forms),
      ]);

    return {
      courses,
      lessons,
      enrollments,
      progress,
      activities,
      quizzes,
      quizScores,
      forms,
    };
  },
  async updateProgress(payload: {
    lessonId: string;
    completed: boolean;
    userId?: string;
  }): Promise<void> {
    try {
      await apiClient.patch("/api/progress", payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
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
  async submitForm(payload: { formId: string; responses: Record<string, string> }): Promise<void> {
    try {
      await apiClient.post("/api/forms/submit", payload);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  },
  async requestEnrollment(payload: { courseId: string; userId?: string }): Promise<void> {
    if (!supabase) {
      throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }
    if (!payload.userId) {
      throw new Error("User session required to enroll.");
    }
    const { error } = await supabase.from("enrollments").insert({
      course_id: payload.courseId,
      user_id: payload.userId,
      status: "pending",
    });
    if (error) {
      throw new Error(error.message);
    }
  },
};
