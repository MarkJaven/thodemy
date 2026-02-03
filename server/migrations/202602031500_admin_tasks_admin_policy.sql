-- Add policy for admin users to access admin_tasks table
-- This allows both admins and superadmins to manage tasks

-- Policy: Admins can do everything
CREATE POLICY admin_tasks_admin_all ON public.admin_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
