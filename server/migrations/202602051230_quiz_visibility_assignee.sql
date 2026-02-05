-- Migration: allow assigned users to read quizzes without enrollment
-- Ensures direct assignments are visible even if not enrolled in a course.

begin;

drop policy if exists "Quizzes readable by assignee" on public.quizzes;

create policy "Quizzes readable by assignee"
  on public.quizzes
  for select
  using (
    assigned_user_id = auth.uid()
    or (
      exists (
        select 1
        from public.enrollments
        where user_id = auth.uid()
          and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
      )
      and (
        assigned_user_id is null
        or course_id in (
          select course_id
          from public.enrollments
          where user_id = auth.uid()
            and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
        )
      )
    )
  );

commit;
