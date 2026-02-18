export type Role = "user" | "admin" | "superadmin";

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username?: string | null;
  email: string | null;
  profile_setup_completed?: boolean | null;
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
  is_active?: boolean;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  topic_ids?: string[] | null;
  topic_prerequisites?: Record<string, string[]> | null;
  topic_corequisites?: Record<string, string[]> | null;
  topic_groups?: Array<{ name: string; topic_ids: string[] }> | null;
  total_hours?: number | null;
  total_days?: number | null;
  course_code?: string | null;
  enrollment_enabled?: boolean | null;
  enrollment_limit?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  duration_minutes?: number | null;
  is_required?: boolean | null;
};

export type LessonTopic = {
  id: string;
  lesson_id: string;
  title: string;
  content?: string | null;
  order_index: number;
};

export type Topic = {
  id: string;
  title: string;
  description?: string | null;
  certificate_file_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  author_id?: string | null;
  author?: {
    id: string;
    username?: string | null;
    email?: string | null;
  } | null;
  link_url?: string | null;
  time_allocated: number;
  time_unit?: "hours" | "days" | null;
  pre_requisites?: string[] | null;
  co_requisites?: string[] | null;
  status?: "active" | "inactive" | string | null;
  deleted_at?: string | null;
  edited?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type TopicProgress = {
  id: string;
  topic_id: string;
  user_id: string;
  status?: "in_progress" | "completed" | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TopicSubmission = {
  id: string;
  topic_id: string;
  user_id: string;
  file_url: string;
  message?: string | null;
  status?: "pending" | "in_progress" | "completed" | "rejected" | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_notes?: string | null;
};

export type CourseCompletionRequest = {
  id: string;
  course_id: string;
  learning_path_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  status?: "pending" | "approved" | "rejected" | null;
  created_at?: string | null;
  updated_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type LessonAssignment = {
  id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  start_at?: string | null;
  due_at?: string | null;
  status?: string | null;
  submitted_at?: string | null;
  review_status?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type LessonSubmission = {
  id: string;
  lesson_assignment_id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  submitted_at?: string | null;
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
  description?: string | null;
  github_url?: string | null;
  status?: string | null;
  score?: number | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  file_name?: string | null;
  file_type?: string | null;
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
  status?: string | null;
  link_url?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  show_score: boolean;
  max_score?: number | null;
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
  proof_url?: string | null;
  proof_file_name?: string | null;
  proof_file_type?: string | null;
  proof_message?: string | null;
  proof_submitted_at?: string | null;
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

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  course_ids?: string[] | null;
  total_hours?: number | null;
  total_days?: number | null;
  enrollment_code?: string | null;
  status?: string | null;
  enrollment_enabled?: boolean | null;
  enrollment_limit?: number | null;
  start_at?: string | null;
  end_at?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LearningPathEnrollment = {
  id: string;
  user_id: string;
  learning_path_id: string;
  status?: string | null;
  enrolled_at?: string | null;
  target_start_date?: string | null;
  target_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  actor_id?: string | null;
  timestamp?: string | null;
  details?: Record<string, unknown> | null;
};

export type AdminTask = {
  id: string;
  title: string;
  description?: string | null;
  priority?: "low" | "medium" | "high" | null;
  status?: "pending" | "completed" | null;
  created_by?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
