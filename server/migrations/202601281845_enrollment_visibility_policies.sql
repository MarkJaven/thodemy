-- Migration: tighten enrollment visibility for courses/quizzes/forms
-- Applies to Supabase RLS policies.
-- Requires public.user_roles (for role check) and public.enrollments.
-- Idempotent: drops existing policies before recreating.

begin;

-- Courses (users only see enrolled courses)
drop policy if exists "Courses readable by user" on public.courses;
drop policy if exists "Courses are readable by authenticated users" on public.courses;
drop policy if exists "Courses are readable by enrolled users" on public.courses;

create policy "Courses readable by user"
  on public.courses
  for select
  using (
    exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = 'user'
    )
    and id in (
      select course_id
      from public.enrollments
      where user_id = auth.uid()
        and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
    )
  );

-- Quizzes (hidden unless user has an eligible enrollment)
drop policy if exists "Quizzes readable by assignee" on public.quizzes;
drop policy if exists "Quizzes are readable by assignee" on public.quizzes;

create policy "Quizzes readable by assignee"
  on public.quizzes
  for select
  using (
    exists (
      select 1
      from public.enrollments
      where user_id = auth.uid()
        and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
    )
    and (
      assigned_user_id = auth.uid()
      or assigned_user_id is null
      or course_id in (
        select course_id
        from public.enrollments
        where user_id = auth.uid()
          and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
      )
    )
  );

-- Forms (hidden unless user has an eligible enrollment)
drop policy if exists "Forms readable by assignee or global" on public.forms;
drop policy if exists "Forms are readable by owner or global" on public.forms;

create policy "Forms readable by assignee or global"
  on public.forms
  for select
  using (
    exists (
      select 1
      from public.enrollments
      where user_id = auth.uid()
        and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
    )
    and (assigned_user_id = auth.uid() or assigned_user_id is null)
  );

commit;
