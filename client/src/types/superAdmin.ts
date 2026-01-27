export type Role = "user" | "admin" | "superadmin";

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserRole = {
  user_id: string;
  role: Role;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type AdminUser = UserProfile & {
  role: Role;
  role_updated_at?: string | null;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Activity = {
  id: string;
  course_id?: string | null;
  user_id?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ActivitySubmission = {
  id: string;
  activity_id?: string | null;
  user_id: string;
  course_id?: string | null;
  title: string;
  file_name: string;
  file_type: string;
  storage_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Quiz = {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  assigned_user_id?: string | null;
  show_score: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuizQuestion = {
  id: string;
  quiz_id: string;
  prompt: string;
  options: string[];
  correct_answer?: string | null;
  order_index: number;
};

export type QuizAttempt = {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, string>;
  score?: number | null;
  submitted_at?: string | null;
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
  status?: string | null;
  assigned_user_id?: string | null;
  link_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type FormQuestion = {
  id: string;
  form_id: string;
  prompt: string;
  options: string[];
  order_index: number;
};

export type FormResponse = {
  id: string;
  form_id: string;
  user_id: string;
  answers: Record<string, string>;
  submitted_at?: string | null;
};

export type QuestionDraft = {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer?: string;
};
