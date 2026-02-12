-- ============================================================
-- Evaluation System Tables
-- ============================================================

-- Master evaluation record per trainee
CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learning_path_id uuid REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  evaluator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'finalized')),
  trainee_info jsonb DEFAULT '{}',
  period_start date,
  period_end date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS evaluations_user_id_idx ON public.evaluations(user_id);
CREATE INDEX IF NOT EXISTS evaluations_status_idx ON public.evaluations(status);
CREATE INDEX IF NOT EXISTS evaluations_evaluator_id_idx ON public.evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS evaluations_created_at_idx ON public.evaluations(created_at DESC);

-- Enable RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Admins and superadmins can do everything
CREATE POLICY evaluations_admin_all ON public.evaluations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Users can read their own evaluations
CREATE POLICY evaluations_user_select ON public.evaluations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_evaluations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evaluations_updated_at_trigger ON public.evaluations;
CREATE TRIGGER evaluations_updated_at_trigger
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluations_updated_at();

-- ============================================================
-- Evaluation scores (all sheets/categories in one table)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.evaluation_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  sheet text NOT NULL,
  category text,
  criterion_key text NOT NULL,
  criterion_label text,
  score numeric,
  max_score numeric DEFAULT 5,
  weight numeric,
  remarks text,
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'auto_quiz', 'auto_activity')),
  source_ref_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(evaluation_id, sheet, criterion_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS eval_scores_evaluation_id_idx ON public.evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS eval_scores_sheet_idx ON public.evaluation_scores(sheet);
CREATE INDEX IF NOT EXISTS eval_scores_eval_sheet_idx ON public.evaluation_scores(evaluation_id, sheet);

-- Enable RLS
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Admins and superadmins can do everything
CREATE POLICY eval_scores_admin_all ON public.evaluation_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Users can read scores for their own evaluations
CREATE POLICY eval_scores_user_select ON public.evaluation_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluations
      WHERE evaluations.id = evaluation_scores.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_evaluation_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS eval_scores_updated_at_trigger ON public.evaluation_scores;
CREATE TRIGGER eval_scores_updated_at_trigger
  BEFORE UPDATE ON public.evaluation_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_evaluation_scores_updated_at();
