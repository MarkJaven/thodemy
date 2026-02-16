-- ============================================
-- THODEMY DATABASE SCHEMA (Clean Version)
-- ============================================
-- Run this in Supabase SQL Editor to clean up
-- the database and ensure proper structure.
-- ============================================

-- ============================================
-- STEP 1: DROP LEGACY SEQUELIZE TABLES
-- ============================================
-- These PascalCase tables are from old Sequelize setup
-- and are not used by the current Supabase-based app.

DROP TABLE IF EXISTS public."ActivitySubmissions" CASCADE;
DROP TABLE IF EXISTS public."Activities" CASCADE;
DROP TABLE IF EXISTS public."Lessons" CASCADE;
DROP TABLE IF EXISTS public."Modules" CASCADE;
DROP TABLE IF EXISTS public."Users" CASCADE;

-- Also drop unused tables
DROP TABLE IF EXISTS public.user_progress CASCADE;

-- ============================================
-- STEP 2: CORE TABLES
-- ============================================

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  username text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.user_roles ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.user_roles ALTER COLUMN updated_by SET DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON public.user_roles(role);

-- ============================================
-- STEP 3: COURSE MANAGEMENT
-- ============================================

-- Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text,
  level text,
  duration_hours integer,
  banner_url text,
  topic_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  topic_prerequisites jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_corequisites jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_hours numeric,
  total_days integer,
  course_code text,
  status text DEFAULT 'draft',
  enrollment_enabled boolean NOT NULL DEFAULT true,
  enrollment_limit integer,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS courses_status_idx ON public.courses(status);
CREATE UNIQUE INDEX IF NOT EXISTS courses_code_idx ON public.courses(course_code);

-- Lessons (belong to courses)
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL,
  duration_minutes integer,
  is_required boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS lessons_course_id_idx ON public.lessons(course_id);

-- Lesson Topics (belong to lessons)
CREATE TABLE IF NOT EXISTS public.lesson_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  order_index integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS lesson_topics_lesson_id_idx ON public.lesson_topics(lesson_id);

-- Enrollments (user enrolled in course)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON public.enrollments(status);

-- ============================================
-- STEP 4: TOPICS (Standalone Learning Topics)
-- ============================================

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  certificate_file_url text,
  start_date timestamptz,
  end_date timestamptz,
  author_id uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  link_url text,
  time_allocated numeric NOT NULL,
  time_unit text NOT NULL DEFAULT 'days' CHECK (time_unit IN ('hours', 'days')),
  pre_requisites uuid[] NOT NULL DEFAULT '{}'::uuid[],
  co_requisites uuid[] NOT NULL DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  deleted_at timestamptz,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS topics_created_at_idx ON public.topics(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS topics_title_unique ON public.topics(lower(title)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS topics_status_idx ON public.topics(status);

-- Topic Progress (user progress on topics)
CREATE TABLE IF NOT EXISTS public.topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS public.topic_completion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.topic_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_completion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  learning_path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Audit logs (submission + topic actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  timestamp timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

CREATE INDEX IF NOT EXISTS topic_progress_user_idx ON public.topic_progress(user_id);
CREATE INDEX IF NOT EXISTS topic_progress_topic_idx ON public.topic_progress(topic_id);
CREATE INDEX IF NOT EXISTS topic_completion_requests_user_idx ON public.topic_completion_requests(user_id);
CREATE INDEX IF NOT EXISTS topic_completion_requests_topic_idx ON public.topic_completion_requests(topic_id);
CREATE INDEX IF NOT EXISTS topic_submissions_user_idx ON public.topic_submissions(user_id);
CREATE INDEX IF NOT EXISTS topic_submissions_topic_idx ON public.topic_submissions(topic_id);
CREATE INDEX IF NOT EXISTS topic_submissions_status_idx ON public.topic_submissions(status);
CREATE INDEX IF NOT EXISTS topic_submissions_submitted_idx ON public.topic_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS course_completion_requests_user_idx ON public.course_completion_requests(user_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_course_idx ON public.course_completion_requests(course_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_lp_idx ON public.course_completion_requests(learning_path_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_status_idx ON public.course_completion_requests(status);
CREATE INDEX IF NOT EXISTS topic_completion_requests_status_idx ON public.topic_completion_requests(status);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON public.audit_logs(timestamp);

-- ============================================
-- STEP 5: LESSON ASSIGNMENTS & SUBMISSIONS
-- ============================================

-- Lesson Assignments (assigned lessons to users)
CREATE TABLE IF NOT EXISTS public.lesson_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text DEFAULT 'assigned',
  start_at timestamptz,
  due_at timestamptz,
  submitted_at timestamptz,
  review_status text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS lesson_assignments_user_id_idx ON public.lesson_assignments(user_id);
CREATE INDEX IF NOT EXISTS lesson_assignments_lesson_id_idx ON public.lesson_assignments(lesson_id);

-- Lesson Submissions (proof uploads for assignments)
CREATE TABLE IF NOT EXISTS public.lesson_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_assignment_id uuid NOT NULL REFERENCES public.lesson_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lesson_submissions_assignment_idx ON public.lesson_submissions(lesson_assignment_id);

-- ============================================
-- STEP 6: ACTIVITIES
-- ============================================

-- Activities (assignments/tasks)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active',
  file_name text,
  file_type text,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS activities_course_idx ON public.activities(course_id);

-- Activity Submissions
CREATE TABLE IF NOT EXISTS public.activity_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  github_url text,
  status text DEFAULT 'pending',
  score numeric,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  file_name text,
  file_type text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS activity_submissions_user_idx ON public.activity_submissions(user_id);
CREATE INDEX IF NOT EXISTS activity_submissions_course_idx ON public.activity_submissions(course_id);

-- ============================================
-- STEP 7: QUIZZES
-- ============================================

-- Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  total_questions integer,
  max_score integer,
  show_score boolean NOT NULL DEFAULT false,
  assigned_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS quizzes_course_idx ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS quizzes_assigned_user_idx ON public.quizzes(assigned_user_id);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON public.quiz_questions(quiz_id);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  proof_url text,
  proof_file_name text,
  proof_file_type text,
  proof_message text,
  proof_submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS quiz_attempts_quiz_idx ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_idx ON public.quiz_attempts(user_id);

-- Quiz Scores (manual grading)
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_by text
);

CREATE INDEX IF NOT EXISTS quiz_scores_quiz_idx ON public.quiz_scores(quiz_id);
CREATE INDEX IF NOT EXISTS quiz_scores_user_idx ON public.quiz_scores(user_id);

-- ============================================
-- STEP 8: FORMS
-- ============================================

-- Forms
CREATE TABLE IF NOT EXISTS public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'active',
  link_url text,
  assigned_user_id uuid REFERENCES auth.users(id),
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS forms_assigned_user_idx ON public.forms(assigned_user_id);

-- Form Questions
CREATE TABLE IF NOT EXISTS public.form_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS form_questions_form_idx ON public.form_questions(form_id);

-- Form Responses
CREATE TABLE IF NOT EXISTS public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS form_responses_form_idx ON public.form_responses(form_id);
CREATE INDEX IF NOT EXISTS form_responses_user_idx ON public.form_responses(user_id);

-- ============================================
-- STEP 9: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_completion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 10: HELPER FUNCTIONS
-- ============================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-set updated_by function
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Check if current user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;

-- Check if topic prerequisites are complete
CREATE OR REPLACE FUNCTION public.topic_prereqs_met(target_topic_id uuid, target_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (
      SELECT bool_and(COALESCE(progress.status = 'completed', false))
      FROM unnest(
        (
          SELECT COALESCE(pre_requisites, '{}'::uuid[])
          FROM public.topics
          WHERE id = target_topic_id
        )
      ) AS prereq_id
      LEFT JOIN public.topic_progress AS progress
        ON progress.topic_id = prereq_id
       AND progress.user_id = target_user_id
    ),
    true
  );
$$;

-- Check if topic completion request is approved
CREATE OR REPLACE FUNCTION public.topic_completion_approved(target_topic_id uuid, target_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.topic_completion_requests
    WHERE topic_id = target_topic_id
      AND user_id = target_user_id
      AND status = 'approved'
  );
$$;

-- Handle new user creation (auto-create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'username',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 11: TRIGGERS
-- ============================================

-- Profile triggers
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles triggers
DROP TRIGGER IF EXISTS set_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Courses triggers
DROP TRIGGER IF EXISTS set_courses_updated_at ON public.courses;
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Topics triggers
DROP TRIGGER IF EXISTS set_topics_updated_at ON public.topics;
CREATE TRIGGER set_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Topic progress triggers
DROP TRIGGER IF EXISTS set_topic_progress_updated_at ON public.topic_progress;
CREATE TRIGGER set_topic_progress_updated_at
  BEFORE UPDATE ON public.topic_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Topic completion request triggers
DROP TRIGGER IF EXISTS set_topic_completion_requests_updated_at ON public.topic_completion_requests;
CREATE TRIGGER set_topic_completion_requests_updated_at
  BEFORE UPDATE ON public.topic_completion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Topic submissions triggers
DROP TRIGGER IF EXISTS set_topic_submissions_updated_at ON public.topic_submissions;
CREATE TRIGGER set_topic_submissions_updated_at
  BEFORE UPDATE ON public.topic_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- STEP 12: ROW LEVEL SECURITY POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are selectable by owner" ON public.profiles;
CREATE POLICY "Profiles are selectable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles are updatable by owner" ON public.profiles;
CREATE POLICY "Profiles are updatable by owner"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles readable by superadmin" ON public.profiles;
CREATE POLICY "Profiles readable by superadmin"
  ON public.profiles FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Profiles readable by admin" ON public.profiles;
CREATE POLICY "Profiles readable by admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Profiles updatable by superadmin" ON public.profiles;
CREATE POLICY "Profiles updatable by superadmin"
  ON public.profiles FOR UPDATE
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- User roles policies
DROP POLICY IF EXISTS "User roles readable by owner" ON public.user_roles;
CREATE POLICY "User roles readable by owner"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User roles readable by admin" ON public.user_roles;
CREATE POLICY "User roles readable by admin"
  ON public.user_roles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "User roles manageable by superadmin" ON public.user_roles;
CREATE POLICY "User roles manageable by superadmin"
  ON public.user_roles FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Courses policies
DROP POLICY IF EXISTS "Courses readable by admin" ON public.courses;
CREATE POLICY "Courses readable by admin"
  ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Courses readable by user" ON public.courses;
CREATE POLICY "Courses readable by user"
  ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'user'
    )
    AND id IN (
      SELECT course_id
      FROM public.enrollments
      WHERE user_id = auth.uid()
        AND status IN ('pending', 'approved', 'active', 'completed', 'enrolled')
    )
  );

-- Topics policies
DROP POLICY IF EXISTS "Topics manageable by superadmin" ON public.topics;
CREATE POLICY "Topics manageable by superadmin"
  ON public.topics FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Topics readable by admin" ON public.topics;
CREATE POLICY "Topics readable by admin"
  ON public.topics FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Topics readable by authenticated" ON public.topics;
CREATE POLICY "Topics readable by authenticated"
  ON public.topics FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active' AND deleted_at IS NULL);

-- Topic progress policies
DROP POLICY IF EXISTS "Topic progress readable by owner" ON public.topic_progress;
CREATE POLICY "Topic progress readable by owner"
  ON public.topic_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic progress readable by admin" ON public.topic_progress;
CREATE POLICY "Topic progress readable by admin"
  ON public.topic_progress FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Topic progress insertable by owner" ON public.topic_progress;
CREATE POLICY "Topic progress insertable by owner"
  ON public.topic_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic progress updatable by owner" ON public.topic_progress;
CREATE POLICY "Topic progress updatable by owner"
  ON public.topic_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.topic_prereqs_met(topic_id, user_id)
  );

DROP POLICY IF EXISTS "Topic progress updatable by admin" ON public.topic_progress;
CREATE POLICY "Topic progress updatable by admin"
  ON public.topic_progress FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Topic completion request policies
DROP POLICY IF EXISTS "Topic completion requests readable by owner" ON public.topic_completion_requests;
CREATE POLICY "Topic completion requests readable by owner"
  ON public.topic_completion_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic completion requests insertable by owner" ON public.topic_completion_requests;
CREATE POLICY "Topic completion requests insertable by owner"
  ON public.topic_completion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic completion requests readable by admin" ON public.topic_completion_requests;
CREATE POLICY "Topic completion requests readable by admin"
  ON public.topic_completion_requests FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Topic completion requests updatable by admin" ON public.topic_completion_requests;
CREATE POLICY "Topic completion requests updatable by admin"
  ON public.topic_completion_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Topic submissions policies
DROP POLICY IF EXISTS "Topic submissions readable by owner" ON public.topic_submissions;
CREATE POLICY "Topic submissions readable by owner"
  ON public.topic_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic submissions insertable by owner" ON public.topic_submissions;
CREATE POLICY "Topic submissions insertable by owner"
  ON public.topic_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Topic submissions readable by admin" ON public.topic_submissions;
CREATE POLICY "Topic submissions readable by admin"
  ON public.topic_submissions FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Topic submissions updatable by admin" ON public.topic_submissions;
CREATE POLICY "Topic submissions updatable by admin"
  ON public.topic_submissions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Audit log policies
DROP POLICY IF EXISTS "Audit logs readable by admin" ON public.audit_logs;
CREATE POLICY "Audit logs readable by admin"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Audit logs insertable by admin" ON public.audit_logs;
CREATE POLICY "Audit logs insertable by admin"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Course completion request policies
DROP POLICY IF EXISTS "Course completion readable by owner" ON public.course_completion_requests;
CREATE POLICY "Course completion readable by owner"
  ON public.course_completion_requests FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Course completion insertable by owner" ON public.course_completion_requests;
CREATE POLICY "Course completion insertable by owner"
  ON public.course_completion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Course completion readable by admin" ON public.course_completion_requests;
CREATE POLICY "Course completion readable by admin"
  ON public.course_completion_requests FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Course completion updatable by admin" ON public.course_completion_requests;
CREATE POLICY "Course completion updatable by admin"
  ON public.course_completion_requests FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Enrollments policies
DROP POLICY IF EXISTS "Enrollments readable by owner" ON public.enrollments;
CREATE POLICY "Enrollments readable by owner"
  ON public.enrollments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enrollments insertable by owner" ON public.enrollments;
CREATE POLICY "Enrollments insertable by owner"
  ON public.enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enrollments readable by admin" ON public.enrollments;
CREATE POLICY "Enrollments readable by admin"
  ON public.enrollments FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Enrollments updatable by admin" ON public.enrollments;
CREATE POLICY "Enrollments updatable by admin"
  ON public.enrollments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Quizzes policies
DROP POLICY IF EXISTS "Quizzes manageable by superadmin" ON public.quizzes;
CREATE POLICY "Quizzes manageable by superadmin"
  ON public.quizzes FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Quizzes manageable by admin" ON public.quizzes;
CREATE POLICY "Quizzes manageable by admin"
  ON public.quizzes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Quizzes readable by admin" ON public.quizzes;
CREATE POLICY "Quizzes readable by admin"
  ON public.quizzes FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Quizzes readable by assignee" ON public.quizzes;
CREATE POLICY "Quizzes readable by assignee"
  ON public.quizzes FOR SELECT
  USING (
    assigned_user_id = auth.uid()
    OR (
      -- Quiz with no course and no assigned user: visible to anyone with any active enrollment or learning path
      assigned_user_id IS NULL
      AND course_id IS NULL
      AND (
        EXISTS (
          SELECT 1
          FROM public.enrollments
          WHERE user_id = auth.uid()
            AND status IN ('pending', 'approved', 'active', 'completed', 'enrolled')
        )
        OR EXISTS (
          SELECT 1
          FROM public.learning_path_enrollments
          WHERE user_id = auth.uid()
            AND status IN ('pending', 'approved', 'active', 'completed')
        )
      )
    )
    OR (
      -- Quiz assigned to a specific course: visible to users enrolled in that course (direct or via learning path)
      assigned_user_id IS NULL
      AND (
        course_id IN (
          SELECT course_id
          FROM public.enrollments
          WHERE user_id = auth.uid()
            AND status IN ('pending', 'approved', 'active', 'completed', 'enrolled')
        )
        OR course_id IN (
          SELECT unnest(lp.course_ids)
          FROM public.learning_path_enrollments lpe
          JOIN public.learning_paths lp ON lp.id = lpe.learning_path_id
          WHERE lpe.user_id = auth.uid()
            AND lpe.status IN ('pending', 'approved', 'active', 'completed')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Quiz attempts manageable by superadmin" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts manageable by superadmin"
  ON public.quiz_attempts FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Quiz attempts readable by admin" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts readable by admin"
  ON public.quiz_attempts FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Quiz attempts readable by owner" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts readable by owner"
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz attempts insertable by owner" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts insertable by owner"
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz attempts updatable by owner" ON public.quiz_attempts;
CREATE POLICY "Quiz attempts updatable by owner"
  ON public.quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Quiz scores manageable by superadmin" ON public.quiz_scores;
CREATE POLICY "Quiz scores manageable by superadmin"
  ON public.quiz_scores FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Quiz scores manageable by admin" ON public.quiz_scores;
CREATE POLICY "Quiz scores manageable by admin"
  ON public.quiz_scores FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Quiz questions manageable by superadmin" ON public.quiz_questions;
CREATE POLICY "Quiz questions manageable by superadmin"
  ON public.quiz_questions FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Quiz questions manageable by admin" ON public.quiz_questions;
CREATE POLICY "Quiz questions manageable by admin"
  ON public.quiz_questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Quiz questions readable by assignee" ON public.quiz_questions;
CREATE POLICY "Quiz questions readable by assignee"
  ON public.quiz_questions FOR SELECT
  USING (
    quiz_id IN (
      SELECT id
      FROM public.quizzes
      WHERE assigned_user_id = auth.uid()
         OR (assigned_user_id IS NULL AND course_id IS NULL)
         OR (
           assigned_user_id IS NULL
           AND course_id IN (
             SELECT course_id
             FROM public.enrollments
             WHERE user_id = auth.uid()
               AND status IN ('pending', 'approved', 'active', 'completed', 'enrolled')
           )
         )
    )
  );

-- Forms policies
DROP POLICY IF EXISTS "Forms manageable by superadmin" ON public.forms;
CREATE POLICY "Forms manageable by superadmin"
  ON public.forms FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Forms manageable by admin" ON public.forms;
CREATE POLICY "Forms manageable by admin"
  ON public.forms FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Forms readable by admin" ON public.forms;
CREATE POLICY "Forms readable by admin"
  ON public.forms FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Form questions manageable by superadmin" ON public.form_questions;
CREATE POLICY "Form questions manageable by superadmin"
  ON public.form_questions FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Form questions manageable by admin" ON public.form_questions;
CREATE POLICY "Form questions manageable by admin"
  ON public.form_questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================
-- STEP 13: STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-proofs', 'lesson-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('topic-proofs', 'topic-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-proofs', 'course-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-proofs', 'quiz-proofs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-submissions', 'activity-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Activity submissions insert by owner" ON storage.objects;
DROP POLICY IF EXISTS "Activity submissions read by owner" ON storage.objects;
DROP POLICY IF EXISTS "Activity submissions read by admin" ON storage.objects;
DROP POLICY IF EXISTS "Activity submissions delete by admin" ON storage.objects;

DROP POLICY IF EXISTS "Lesson proofs insert by owner" ON storage.objects;
CREATE POLICY "Lesson proofs insert by owner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Lesson proofs read by owner" ON storage.objects;
CREATE POLICY "Lesson proofs read by owner"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Lesson proofs read by admin" ON storage.objects;
CREATE POLICY "Lesson proofs read by admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-proofs' AND public.is_admin());

DROP POLICY IF EXISTS "Topic proofs insert by owner" ON storage.objects;
CREATE POLICY "Topic proofs insert by owner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'topic-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Topic proofs read by owner" ON storage.objects;
CREATE POLICY "Topic proofs read by owner"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'topic-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Topic proofs read by admin" ON storage.objects;
CREATE POLICY "Topic proofs read by admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'topic-proofs' AND public.is_admin());

DROP POLICY IF EXISTS "Course proofs insert by owner" ON storage.objects;
CREATE POLICY "Course proofs insert by owner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Course proofs read by owner" ON storage.objects;
CREATE POLICY "Course proofs read by owner"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Course proofs read by admin" ON storage.objects;
CREATE POLICY "Course proofs read by admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-proofs' AND public.is_admin());

DROP POLICY IF EXISTS "Quiz proofs insert by owner" ON storage.objects;
CREATE POLICY "Quiz proofs insert by owner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quiz-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Quiz proofs read by owner" ON storage.objects;
CREATE POLICY "Quiz proofs read by owner"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Quiz proofs read by admin" ON storage.objects;
CREATE POLICY "Quiz proofs read by admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quiz-proofs' AND public.is_admin());

CREATE POLICY "Activity submissions insert by owner"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'activity-submissions' AND auth.uid() = owner);

CREATE POLICY "Activity submissions read by owner"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-submissions' AND auth.uid() = owner);

CREATE POLICY "Activity submissions read by admin"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-submissions' AND public.is_admin());

CREATE POLICY "Activity submissions delete by admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'activity-submissions' AND public.is_admin());

-- ============================================
-- DONE! Your database is now clean.
-- ============================================
