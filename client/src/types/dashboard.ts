export type Course = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  level?: string | null;
  duration_hours?: number | null;
  banner_url?: string | null;
  created_at?: string | null;
};

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  duration_minutes?: number | null;
  is_required?: boolean | null;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at?: string | null;
  status?: "pending" | "approved" | "rejected" | "active" | "completed" | "paused" | null;
};

export type UserProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at?: string | null;
};

export type Activity = {
  id: string;
  user_id?: string | null;
  course_id?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_url?: string | null;
  created_at?: string | null;
};

export type Quiz = {
  id: string;
  course_id: string;
  assigned_user_id?: string | null;
  title: string;
  description?: string | null;
  total_questions?: number | null;
  score_visible?: boolean | null;
  show_score?: boolean | null;
  max_score?: number | null;
};

export type QuizScore = {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  submitted_at?: string | null;
  graded_by?: string | null;
};

export type Form = {
  id: string;
  title: string;
  description: string;
  status?: "open" | "closed" | "draft" | null;
  assigned_user_id?: string | null;
  link_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  due_at?: string | null;
};

export type DashboardData = {
  courses: Course[];
  lessons: Lesson[];
  enrollments: Enrollment[];
  progress: UserProgress[];
  activities: Activity[];
  quizzes: Quiz[];
  quizScores: QuizScore[];
  forms: Form[];
};
