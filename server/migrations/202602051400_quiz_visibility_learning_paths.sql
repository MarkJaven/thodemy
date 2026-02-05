-- Migration: quizzes visible to assigned user OR enrolled users in the course
-- This includes both direct course enrollments AND learning path enrollments.
-- Fixes issue where quizzes set to "all" are not visible to users enrolled via learning paths.

begin;

drop policy if exists "Quizzes readable by assignee" on public.quizzes;

create policy "Quizzes readable by assignee"
  on public.quizzes
  for select
  using (
    -- Direct assignment to current user
    assigned_user_id = auth.uid()
    or (
      -- Quiz assigned to "all" users in the course
      assigned_user_id is null
      and (
        -- Check direct course enrollment
        course_id in (
          select course_id
          from public.enrollments
          where user_id = auth.uid()
            and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
        )
        or
        -- Check learning path enrollment (course is part of learning path user is enrolled in)
        course_id in (
          select unnest(lp.course_ids)
          from public.learning_paths lp
          inner join public.learning_path_enrollments lpe
            on lpe.learning_path_id = lp.id
          where lpe.user_id = auth.uid()
            and lpe.status in ('pending', 'approved', 'active', 'completed', 'enrolled')
        )
      )
    )
  );

commit;
