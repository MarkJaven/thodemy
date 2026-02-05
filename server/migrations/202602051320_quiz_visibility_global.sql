-- Migration: quizzes visible to assigned user or enrolled users in the course

begin;

drop policy if exists "Quizzes readable by assignee" on public.quizzes;

create policy "Quizzes readable by assignee"
  on public.quizzes
  for select
  using (
    assigned_user_id = auth.uid()
    or (
      assigned_user_id is null
      and course_id in (
        select course_id
        from public.enrollments
        where user_id = auth.uid()
          and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
      )
    )
  );

commit;
