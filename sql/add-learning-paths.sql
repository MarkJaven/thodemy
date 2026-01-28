-- ============================================
-- LEARNING PATHS + LEARNING PATH ENROLLMENTS
-- ============================================
-- Run this in Supabase SQL Editor.
-- ============================================

BEGIN;

-- Learning Paths table
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  course_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  total_hours numeric,
  total_days integer,
  enrollment_code text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  enrollment_enabled boolean NOT NULL DEFAULT true,
  enrollment_limit integer,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS learning_paths_status_idx ON public.learning_paths(status);
CREATE UNIQUE INDEX IF NOT EXISTS learning_paths_code_idx ON public.learning_paths(enrollment_code);

-- Learning Path Enrollments table
CREATE TABLE IF NOT EXISTS public.learning_path_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'paused', 'removed')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  UNIQUE (user_id, learning_path_id)
);

CREATE INDEX IF NOT EXISTS lp_enrollments_user_idx ON public.learning_path_enrollments(user_id);
CREATE INDEX IF NOT EXISTS lp_enrollments_lp_idx ON public.learning_path_enrollments(learning_path_id);
CREATE INDEX IF NOT EXISTS lp_enrollments_status_idx ON public.learning_path_enrollments(status);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TOPICS: add link_url for learning resources
-- ============================================

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS link_url text;

-- ============================================
-- RLS POLICIES: learning_paths
-- ============================================

DROP POLICY IF EXISTS "Learning paths readable by admin" ON public.learning_paths;
CREATE POLICY "Learning paths readable by admin"
  ON public.learning_paths FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Learning paths manageable by admin" ON public.learning_paths;
CREATE POLICY "Learning paths manageable by admin"
  ON public.learning_paths FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Learning paths readable by superadmin" ON public.learning_paths;
CREATE POLICY "Learning paths readable by superadmin"
  ON public.learning_paths FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Learning paths manageable by superadmin" ON public.learning_paths;
CREATE POLICY "Learning paths manageable by superadmin"
  ON public.learning_paths FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "Learning paths readable by enrolled user" ON public.learning_paths;
CREATE POLICY "Learning paths readable by enrolled user"
  ON public.learning_paths FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'user'
    )
    AND id IN (
      SELECT learning_path_id
      FROM public.learning_path_enrollments
      WHERE user_id = auth.uid()
        AND status IN ('pending', 'approved', 'active', 'completed', 'enrolled', 'rejected', 'removed')
    )
  );

-- ============================================
-- RLS POLICIES: learning_path_enrollments
-- ============================================

DROP POLICY IF EXISTS "LP enrollments readable by owner" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments readable by owner"
  ON public.learning_path_enrollments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "LP enrollments insertable by authenticated" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments insertable by authenticated"
  ON public.learning_path_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "LP enrollments readable by admin" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments readable by admin"
  ON public.learning_path_enrollments FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "LP enrollments updatable by admin" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments updatable by admin"
  ON public.learning_path_enrollments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "LP enrollments deletable by admin" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments deletable by admin"
  ON public.learning_path_enrollments FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "LP enrollments deletable by owner" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments deletable by owner"
  ON public.learning_path_enrollments FOR DELETE
  USING (
    auth.uid() = user_id
    AND status IN ('rejected', 'removed')
  );

DROP POLICY IF EXISTS "LP enrollments updatable by owner" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments updatable by owner"
  ON public.learning_path_enrollments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "LP enrollments readable by superadmin" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments readable by superadmin"
  ON public.learning_path_enrollments FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "LP enrollments manageable by superadmin" ON public.learning_path_enrollments;
CREATE POLICY "LP enrollments manageable by superadmin"
  ON public.learning_path_enrollments FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================
-- COURSE COMPLETION PROOFS
-- ============================================

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

CREATE INDEX IF NOT EXISTS course_completion_requests_user_idx
  ON public.course_completion_requests(user_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_course_idx
  ON public.course_completion_requests(course_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_lp_idx
  ON public.course_completion_requests(learning_path_id);
CREATE INDEX IF NOT EXISTS course_completion_requests_status_idx
  ON public.course_completion_requests(status);

ALTER TABLE public.course_completion_requests ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Course completion readable by superadmin" ON public.course_completion_requests;
CREATE POLICY "Course completion readable by superadmin"
  ON public.course_completion_requests FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Course completion manageable by superadmin" ON public.course_completion_requests;
CREATE POLICY "Course completion manageable by superadmin"
  ON public.course_completion_requests FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================
-- STORAGE: course proofs
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('course-proofs', 'course-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Course proofs insert by owner" ON storage.objects;
CREATE POLICY "Course proofs insert by owner"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'course-proofs'
    AND auth.uid() = owner
  );

DROP POLICY IF EXISTS "Course proofs read by owner" ON storage.objects;
CREATE POLICY "Course proofs read by owner"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'course-proofs'
    AND (auth.uid() = owner OR public.is_admin())
  );

-- ============================================
-- TOPIC PROGRESS: allow completion without topic proof
-- ============================================

DROP POLICY IF EXISTS "Topic progress updatable by owner" ON public.topic_progress;
CREATE POLICY "Topic progress updatable by owner"
  ON public.topic_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.topic_prereqs_met(topic_id, user_id)
  );

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_learning_paths_updated_at ON public.learning_paths;
CREATE TRIGGER set_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lp_enrollments_updated_at ON public.learning_path_enrollments;
CREATE TRIGGER set_lp_enrollments_updated_at
  BEFORE UPDATE ON public.learning_path_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ============================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================
