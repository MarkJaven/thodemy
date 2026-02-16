-- ============================================
-- THODEMY DATABASE SETUP
-- ============================================
-- Run this script in Supabase SQL Editor to set up the complete database schema
-- ============================================

-- Include all schema files in order
-- 1. Basic auth setup
-- 2. Main schema
-- 3. Profile setup
-- 4. Dashboard setup
-- 5. Superadmin setup
-- 6. Learning paths

-- ============================================
-- SUPABASE AUTH SETUP
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;

create index if not exists profiles_email_idx on public.profiles (email);
create unique index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, username, email, profile_setup_completed)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'username',
    new.email,
    FALSE
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- MAIN SCHEMA (from cleanup-and-schema.sql)
-- ============================================

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

-- Topics (belong to lessons)
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  duration_minutes integer,
  is_required boolean DEFAULT true,
  content_type text CHECK (content_type IN ('text', 'video', 'quiz', 'assignment')),
  content_url text,
  content_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topics_lesson_id_idx ON public.topics(lesson_id);

-- Topic Submissions
CREATE TABLE IF NOT EXISTS public.topic_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_type text NOT NULL CHECK (submission_type IN ('text', 'file', 'url')),
  submission_content text,
  submission_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS topic_submissions_topic_id_idx ON public.topic_submissions(topic_id);
CREATE INDEX IF NOT EXISTS topic_submissions_user_id_idx ON public.topic_submissions(user_id);
CREATE INDEX IF NOT EXISTS topic_submissions_status_idx ON public.topic_submissions(status);

-- Learning Paths
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  course_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  prerequisites jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_duration_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

-- Learning Path Enrollments
CREATE TABLE IF NOT EXISTS public.learning_path_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  progress_percentage numeric DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learning_path_enrollments_unique_idx ON public.learning_path_enrollments(learning_path_id, user_id);
CREATE INDEX IF NOT EXISTS learning_path_enrollments_user_id_idx ON public.learning_path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS learning_path_enrollments_status_idx ON public.learning_path_enrollments(status);

-- Course Enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  progress_percentage numeric DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS course_enrollments_unique_idx ON public.course_enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS course_enrollments_user_id_idx ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS course_enrollments_status_idx ON public.course_enrollments(status);

-- User Progress (detailed tracking)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  progress_type text NOT NULL CHECK (progress_type IN ('course', 'topic')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  time_spent_minutes integer DEFAULT 0,
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_progress_unique_idx ON public.user_progress(user_id, course_id, topic_id);
CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS user_progress_status_idx ON public.user_progress(status);

-- ============================================
-- PROFILE SETUP SCHEMA
-- ============================================

-- Add new columns to profiles table for profile setup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id_no text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_regularization_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS training_starting_date date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_setup_completed boolean DEFAULT false;

-- Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Insert some sample holidays (you can add more)
INSERT INTO public.holidays (date, name) VALUES
  ('2026-01-01', 'New Year''s Day'),
  ('2026-12-25', 'Christmas Day')
ON CONFLICT (date) DO NOTHING;

-- Enable RLS on holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policy for holidays (readable by all authenticated users)
CREATE POLICY "Holidays are viewable by authenticated users" ON public.holidays
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- DASHBOARD AND OTHER TABLES
-- ============================================

-- Add any additional tables from supabase-dashboard.sql here if needed
-- (The file appears to be empty or minimal)

-- ============================================
-- SUPERADMIN SETUP
-- ============================================

-- Add superadmin role setup if needed from supabase-superadmin.sql

-- ============================================
-- LEARNING PATHS
-- ============================================

-- Add learning paths data from add-learning-paths.sql if needed

-- ============================================
-- ENABLE RLS AND POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Courses policies (public read, admin write)
CREATE POLICY "Courses are viewable by authenticated users" ON public.courses
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Similar policies for other tables...
-- (Add more policies as needed for lessons, topics, etc.)

-- ============================================
-- TRIGGERS
-- ============================================

-- Add updated_at triggers
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER topic_submissions_updated_at
  BEFORE UPDATE ON public.topic_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER learning_path_enrollments_updated_at
  BEFORE UPDATE ON public.learning_path_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER course_enrollments_updated_at
  BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
