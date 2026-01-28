create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'admin', 'superadmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.user_roles alter column created_by set default auth.uid();
alter table public.user_roles alter column updated_by set default auth.uid();

alter table public.courses add column if not exists status text default 'draft';
alter table public.courses add column if not exists topic_ids uuid[] not null default '{}'::uuid[];
alter table public.courses add column if not exists topic_prerequisites jsonb not null default '{}'::jsonb;
alter table public.courses add column if not exists topic_corequisites jsonb not null default '{}'::jsonb;
alter table public.courses add column if not exists total_hours numeric;
alter table public.courses add column if not exists total_days integer;
alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists enrollment_enabled boolean not null default true;
alter table public.courses add column if not exists enrollment_limit integer;
alter table public.courses add column if not exists start_at timestamptz;
alter table public.courses add column if not exists end_at timestamptz;
alter table public.courses add column if not exists created_by uuid references auth.users(id);
alter table public.courses add column if not exists updated_at timestamptz not null default now();
alter table public.courses add column if not exists updated_by uuid references auth.users(id);
alter table public.courses alter column created_by set default auth.uid();
alter table public.courses alter column updated_by set default auth.uid();

alter table public.enrollments add column if not exists start_date timestamptz;
alter table public.enrollments add column if not exists end_date timestamptz;
alter table public.enrollments add column if not exists updated_at timestamptz not null default now();
alter table public.enrollments add column if not exists created_by uuid references auth.users(id);
alter table public.enrollments add column if not exists updated_by uuid references auth.users(id);
alter table public.enrollments alter column created_by set default auth.uid();
alter table public.enrollments alter column updated_by set default auth.uid();

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null,
  duration_minutes integer,
  is_required boolean default true
);

create table if not exists public.lesson_topics (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  content text,
  order_index integer not null default 0
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  time_allocated numeric not null,
  time_unit text not null default 'days' check (time_unit in ('hours', 'days')),
  pre_requisites uuid[] not null default '{}'::uuid[],
  co_requisites uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.topics add column if not exists time_unit text not null default 'days';
alter table public.topics drop constraint if exists topics_time_unit_check;
alter table public.topics
  add constraint topics_time_unit_check
  check (time_unit in ('hours', 'days'));

alter table public.topics alter column created_by set default auth.uid();
alter table public.topics alter column updated_by set default auth.uid();

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);

create table if not exists public.topic_completion_requests (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.lesson_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  start_at timestamptz,
  due_at timestamptz,
  status text default 'assigned',
  submitted_at timestamptz,
  review_status text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.lesson_submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_assignment_id uuid not null references public.lesson_assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  file_type text not null,
  submitted_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  description text,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.activities add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.activities add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.activities add column if not exists description text;
alter table public.activities add column if not exists status text default 'active';
alter table public.activities add column if not exists updated_at timestamptz not null default now();
alter table public.activities add column if not exists created_by uuid references auth.users(id);
alter table public.activities add column if not exists updated_by uuid references auth.users(id);
alter table public.activities alter column user_id drop not null;
alter table public.activities alter column file_name drop not null;
alter table public.activities alter column file_type drop not null;
alter table public.activities alter column created_by set default auth.uid();
alter table public.activities alter column updated_by set default auth.uid();

create table if not exists public.activity_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.activities(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  file_name text not null,
  file_type text not null,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.quizzes add column if not exists description text;
alter table public.quizzes add column if not exists assigned_user_id uuid references auth.users(id);
alter table public.quizzes add column if not exists status text default 'active';
alter table public.quizzes add column if not exists link_url text;
alter table public.quizzes add column if not exists start_at timestamptz;
alter table public.quizzes add column if not exists end_at timestamptz;
alter table public.quizzes add column if not exists created_at timestamptz not null default now();
alter table public.quizzes add column if not exists updated_at timestamptz not null default now();
alter table public.quizzes add column if not exists created_by uuid references auth.users(id);
alter table public.quizzes add column if not exists updated_by uuid references auth.users(id);
alter table public.quizzes add column if not exists show_score boolean not null default false;
alter table public.quizzes alter column created_by set default auth.uid();
alter table public.quizzes alter column updated_by set default auth.uid();

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text default 'active',
  assigned_user_id uuid references auth.users(id),
  link_url text,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

alter table public.forms add column if not exists status text default 'active';
alter table public.forms add column if not exists assigned_user_id uuid references auth.users(id);
alter table public.forms add column if not exists link_url text;
alter table public.forms add column if not exists start_at timestamptz;
alter table public.forms add column if not exists end_at timestamptz;
alter table public.forms add column if not exists created_at timestamptz not null default now();
alter table public.forms add column if not exists updated_at timestamptz not null default now();
alter table public.forms add column if not exists created_by uuid references auth.users(id);
alter table public.forms add column if not exists updated_by uuid references auth.users(id);
alter table public.forms alter column created_by set default auth.uid();
alter table public.forms alter column updated_by set default auth.uid();

create table if not exists public.form_questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists user_roles_role_idx on public.user_roles(role);
create index if not exists courses_status_idx on public.courses(status);
create unique index if not exists courses_code_idx on public.courses(course_code);
create index if not exists enrollments_status_idx on public.enrollments(status);
create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);
create index if not exists lessons_course_id_idx on public.lessons(course_id);
create index if not exists lesson_topics_lesson_id_idx on public.lesson_topics(lesson_id);
create index if not exists topics_created_at_idx on public.topics(created_at);
create index if not exists topic_progress_user_idx on public.topic_progress(user_id);
create index if not exists topic_progress_topic_idx on public.topic_progress(topic_id);
create index if not exists topic_completion_requests_user_idx on public.topic_completion_requests(user_id);
create index if not exists topic_completion_requests_topic_idx on public.topic_completion_requests(topic_id);
create index if not exists topic_completion_requests_status_idx on public.topic_completion_requests(status);
create index if not exists lesson_assignments_user_id_idx on public.lesson_assignments(user_id);
create index if not exists lesson_assignments_lesson_id_idx on public.lesson_assignments(lesson_id);
create index if not exists lesson_submissions_assignment_idx on public.lesson_submissions(lesson_assignment_id);
create index if not exists activities_course_idx on public.activities(course_id);
create index if not exists activity_submissions_user_idx on public.activity_submissions(user_id);
create index if not exists activity_submissions_course_idx on public.activity_submissions(course_id);
create index if not exists quizzes_course_idx on public.quizzes(course_id);
create index if not exists quizzes_assigned_user_idx on public.quizzes(assigned_user_id);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id);
create index if not exists quiz_attempts_quiz_idx on public.quiz_attempts(quiz_id);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id);
create index if not exists forms_assigned_user_idx on public.forms(assigned_user_id);
create index if not exists form_questions_form_idx on public.form_questions(form_id);
create index if not exists form_responses_form_idx on public.form_responses(form_id);
create index if not exists form_responses_user_idx on public.form_responses(user_id);

alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_topics enable row level security;
alter table public.topics enable row level security;
alter table public.topic_progress enable row level security;
alter table public.topic_completion_requests enable row level security;
alter table public.lesson_assignments enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.activities enable row level security;
alter table public.activity_submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.forms enable row level security;
alter table public.form_questions enable row level security;
alter table public.form_responses enable row level security;

drop policy if exists "Quizzes are readable by authenticated users" on public.quizzes;
drop policy if exists "Forms are readable by authenticated users" on public.forms;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'superadmin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'superadmin')
  );
$$;

create or replace function public.topic_prereqs_met(target_topic_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select bool_and(coalesce(progress.status = 'completed', false))
      from unnest(
        (
          select coalesce(pre_requisites, '{}'::uuid[])
          from public.topics
          where id = target_topic_id
        )
      ) as prereq_id
      left join public.topic_progress as progress
        on progress.topic_id = prereq_id
       and progress.user_id = target_user_id
    ),
    true
  );
$$;

create or replace function public.topic_completion_approved(target_topic_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.topic_completion_requests
    where topic_id = target_topic_id
      and user_id = target_user_id
      and status = 'approved'
  );
$$;

drop policy if exists "User roles readable by owner" on public.user_roles;
create policy "User roles readable by owner"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

drop policy if exists "User roles readable by admin" on public.user_roles;
create policy "User roles readable by admin"
  on public.user_roles
  for select
  using (public.is_admin());

drop policy if exists "User roles manageable by superadmin" on public.user_roles;
create policy "User roles manageable by superadmin"
  on public.user_roles
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Courses manageable by superadmin" on public.courses;

drop policy if exists "Courses readable by admin" on public.courses;
create policy "Courses readable by admin"
  on public.courses
  for select
  using (public.is_admin());

drop policy if exists "Courses insertable by admin" on public.courses;
create policy "Courses insertable by admin"
  on public.courses
  for insert
  with check (public.is_admin());

drop policy if exists "Courses updatable by admin" on public.courses;
create policy "Courses updatable by admin"
  on public.courses
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Courses deletable by admin" on public.courses;
create policy "Courses deletable by admin"
  on public.courses
  for delete
  using (public.is_admin());

drop policy if exists "Courses readable by user" on public.courses;
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

drop policy if exists "Enrollments manageable by superadmin" on public.enrollments;

drop policy if exists "Enrollments updatable by admin" on public.enrollments;
create policy "Enrollments updatable by admin"
  on public.enrollments
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Enrollments readable by admin" on public.enrollments;
create policy "Enrollments readable by admin"
  on public.enrollments
  for select
  using (public.is_admin());

drop policy if exists "Enrollments insertable by owner" on public.enrollments;
create policy "Enrollments insertable by owner"
  on public.enrollments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Enrollments readable by owner" on public.enrollments;

create policy "Enrollments readable by owner"
  on public.enrollments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lessons manageable by superadmin" on public.lessons;
drop policy if exists "Lessons readable by admin" on public.lessons;
drop policy if exists "Lessons readable by authenticated users" on public.lessons;

create policy "Lessons readable by admin"
  on public.lessons
  for select
  using (public.is_admin());

drop policy if exists "Lessons readable by authenticated users" on public.lessons;
create policy "Lessons readable by authenticated users"
  on public.lessons
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Lesson topics manageable by superadmin" on public.lesson_topics;
drop policy if exists "Lesson topics readable by admin" on public.lesson_topics;
drop policy if exists "Lesson topics readable by enrolled users" on public.lesson_topics;

create policy "Lesson topics readable by admin"
  on public.lesson_topics
  for select
  using (public.is_admin());

drop policy if exists "Lesson topics readable by enrolled users" on public.lesson_topics;
create policy "Lesson topics readable by enrolled users"
  on public.lesson_topics
  for select
  using (
    lesson_id in (
      select id
      from public.lessons
      where course_id in (
        select course_id
        from public.enrollments
        where user_id = auth.uid()
          and status in ('approved', 'active', 'completed')
      )
    )
  );

drop policy if exists "Topics manageable by superadmin" on public.topics;
drop policy if exists "Topics readable by authenticated users" on public.topics;
drop policy if exists "Topic progress readable by owner" on public.topic_progress;
drop policy if exists "Topic progress insertable by owner" on public.topic_progress;
drop policy if exists "Topic progress updatable by owner" on public.topic_progress;

create policy "Topics manageable by superadmin"
  on public.topics
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Topics readable by authenticated users" on public.topics;
create policy "Topics readable by authenticated users"
  on public.topics
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Topic progress readable by owner" on public.topic_progress;
create policy "Topic progress readable by owner"
  on public.topic_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Topic progress readable by admin" on public.topic_progress;
create policy "Topic progress readable by admin"
  on public.topic_progress
  for select
  using (public.is_admin());

drop policy if exists "Topic progress insertable by owner" on public.topic_progress;
create policy "Topic progress insertable by owner"
  on public.topic_progress
  for insert
  with check (auth.uid() = user_id and public.topic_prereqs_met(topic_id, user_id));

drop policy if exists "Topic progress updatable by owner" on public.topic_progress;
create policy "Topic progress updatable by owner"
  on public.topic_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.topic_prereqs_met(topic_id, user_id)
    and (status <> 'completed' or public.topic_completion_approved(topic_id, user_id))
  );

drop policy if exists "Topic progress updatable by admin" on public.topic_progress;
create policy "Topic progress updatable by admin"
  on public.topic_progress
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Topic completion requests readable by owner" on public.topic_completion_requests;
create policy "Topic completion requests readable by owner"
  on public.topic_completion_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Topic completion requests insertable by owner" on public.topic_completion_requests;
create policy "Topic completion requests insertable by owner"
  on public.topic_completion_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Topic completion requests readable by admin" on public.topic_completion_requests;
create policy "Topic completion requests readable by admin"
  on public.topic_completion_requests
  for select
  using (public.is_admin());

drop policy if exists "Topic completion requests updatable by admin" on public.topic_completion_requests;
create policy "Topic completion requests updatable by admin"
  on public.topic_completion_requests
  for update
  using (public.is_admin())
  with check (public.is_admin());
drop policy if exists "Topic progress readable by admin" on public.topic_progress;
create policy "Topic progress readable by admin"
  on public.topic_progress
  for select
  using (public.is_admin());

drop policy if exists "Lesson assignments manageable by superadmin" on public.lesson_assignments;
drop policy if exists "Lesson assignments readable by admin" on public.lesson_assignments;
drop policy if exists "Lesson assignments updatable by admin" on public.lesson_assignments;
drop policy if exists "Lesson assignments readable by owner" on public.lesson_assignments;
drop policy if exists "Lesson assignments updatable by owner" on public.lesson_assignments;

create policy "Lesson assignments readable by admin"
  on public.lesson_assignments
  for select
  using (public.is_admin());

drop policy if exists "Lesson assignments updatable by admin" on public.lesson_assignments;
create policy "Lesson assignments updatable by admin"
  on public.lesson_assignments
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Lesson assignments readable by owner" on public.lesson_assignments;
create policy "Lesson assignments readable by owner"
  on public.lesson_assignments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lesson assignments updatable by owner" on public.lesson_assignments;
create policy "Lesson assignments updatable by owner"
  on public.lesson_assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Lesson submissions manageable by superadmin" on public.lesson_submissions;
drop policy if exists "Lesson submissions readable by admin" on public.lesson_submissions;
drop policy if exists "Lesson submissions readable by owner" on public.lesson_submissions;
drop policy if exists "Lesson submissions insertable by owner" on public.lesson_submissions;

create policy "Lesson submissions readable by admin"
  on public.lesson_submissions
  for select
  using (public.is_admin());

drop policy if exists "Lesson submissions readable by owner" on public.lesson_submissions;
create policy "Lesson submissions readable by owner"
  on public.lesson_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lesson submissions insertable by owner" on public.lesson_submissions;
create policy "Lesson submissions insertable by owner"
  on public.lesson_submissions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Activities manageable by superadmin" on public.activities;
create policy "Activities manageable by superadmin"
  on public.activities
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Activities readable by admin" on public.activities;
create policy "Activities readable by admin"
  on public.activities
  for select
  using (public.is_admin());

drop policy if exists "Activities readable by enrolled user" on public.activities;

create policy "Activities readable by enrolled user"
  on public.activities
  for select
  using (
    auth.uid() = user_id
    or course_id in (
      select course_id
      from public.enrollments
      where user_id = auth.uid()
        and status in ('approved', 'active', 'completed')
    )
  );

drop policy if exists "Activity submissions manageable by superadmin" on public.activity_submissions;
create policy "Activity submissions manageable by superadmin"
  on public.activity_submissions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Activity submissions readable by admin" on public.activity_submissions;
create policy "Activity submissions readable by admin"
  on public.activity_submissions
  for select
  using (public.is_admin());

drop policy if exists "Activity submissions readable by owner" on public.activity_submissions;
create policy "Activity submissions readable by owner"
  on public.activity_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Activity submissions insertable by owner" on public.activity_submissions;
create policy "Activity submissions insertable by owner"
  on public.activity_submissions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Quizzes manageable by superadmin" on public.quizzes;
create policy "Quizzes manageable by superadmin"
  on public.quizzes
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Quizzes manageable by admin" on public.quizzes;
create policy "Quizzes manageable by admin"
  on public.quizzes
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Quizzes readable by admin" on public.quizzes;
create policy "Quizzes readable by admin"
  on public.quizzes
  for select
  using (public.is_admin());

drop policy if exists "Quizzes readable by assignee" on public.quizzes;

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

drop policy if exists "Quiz questions manageable by superadmin" on public.quiz_questions;
create policy "Quiz questions manageable by superadmin"
  on public.quiz_questions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Quiz questions manageable by admin" on public.quiz_questions;
create policy "Quiz questions manageable by admin"
  on public.quiz_questions
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Quiz questions readable by admin" on public.quiz_questions;
create policy "Quiz questions readable by admin"
  on public.quiz_questions
  for select
  using (public.is_admin());

drop policy if exists "Quiz questions readable by assignee" on public.quiz_questions;

create policy "Quiz questions readable by assignee"
  on public.quiz_questions
  for select
  using (
    quiz_id in (
      select id
      from public.quizzes
      where assigned_user_id = auth.uid()
        or course_id in (
          select course_id
          from public.enrollments
          where user_id = auth.uid()
            and status in ('approved', 'active', 'completed')
        )
    )
  );

drop policy if exists "Quiz attempts manageable by superadmin" on public.quiz_attempts;
create policy "Quiz attempts manageable by superadmin"
  on public.quiz_attempts
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Quiz attempts readable by admin" on public.quiz_attempts;
create policy "Quiz attempts readable by admin"
  on public.quiz_attempts
  for select
  using (public.is_admin());

drop policy if exists "Quiz attempts readable by owner" on public.quiz_attempts;
create policy "Quiz attempts readable by owner"
  on public.quiz_attempts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Quiz attempts insertable by owner" on public.quiz_attempts;
create policy "Quiz attempts insertable by owner"
  on public.quiz_attempts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Quiz scores manageable by superadmin" on public.quiz_scores;
drop policy if exists "Quiz scores manageable by admin" on public.quiz_scores;

create policy "Quiz scores manageable by superadmin"
  on public.quiz_scores
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Quiz scores manageable by admin" on public.quiz_scores;
create policy "Quiz scores manageable by admin"
  on public.quiz_scores
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Forms manageable by superadmin" on public.forms;
create policy "Forms manageable by superadmin"
  on public.forms
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Forms manageable by admin" on public.forms;
create policy "Forms manageable by admin"
  on public.forms
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Forms readable by admin" on public.forms;
create policy "Forms readable by admin"
  on public.forms
  for select
  using (public.is_admin());

drop policy if exists "Forms readable by assignee" on public.forms;

drop policy if exists "Forms readable by assignee or global" on public.forms;
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

drop policy if exists "Form questions manageable by superadmin" on public.form_questions;
create policy "Form questions manageable by superadmin"
  on public.form_questions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Form questions manageable by admin" on public.form_questions;
create policy "Form questions manageable by admin"
  on public.form_questions
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Form questions readable by admin" on public.form_questions;
create policy "Form questions readable by admin"
  on public.form_questions
  for select
  using (public.is_admin());

drop policy if exists "Form responses manageable by superadmin" on public.form_responses;
create policy "Form responses manageable by superadmin"
  on public.form_responses
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Form responses readable by admin" on public.form_responses;
create policy "Form responses readable by admin"
  on public.form_responses
  for select
  using (public.is_admin());

drop policy if exists "Profiles readable by superadmin" on public.profiles;

create policy "Profiles readable by superadmin"
  on public.profiles
  for select
  using (public.is_superadmin());

drop policy if exists "Profiles readable by admin" on public.profiles;
create policy "Profiles readable by admin"
  on public.profiles
  for select
  using (public.is_admin());

drop policy if exists "Profiles updatable by superadmin" on public.profiles;

create policy "Profiles updatable by superadmin"
  on public.profiles
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Form responses readable by owner" on public.form_responses;
create policy "Form responses readable by owner"
  on public.form_responses
  for select
  using (auth.uid() = user_id);

drop policy if exists "Form responses insertable by owner" on public.form_responses;
create policy "Form responses insertable by owner"
  on public.form_responses
  for insert
  with check (auth.uid() = user_id);

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_roles_updated_by on public.user_roles;
create trigger set_user_roles_updated_by
before update on public.user_roles
for each row execute function public.set_updated_by();

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists set_courses_updated_by on public.courses;
create trigger set_courses_updated_by
before update on public.courses
for each row execute function public.set_updated_by();

drop trigger if exists set_enrollments_updated_at on public.enrollments;
create trigger set_enrollments_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

drop trigger if exists set_enrollments_updated_by on public.enrollments;
create trigger set_enrollments_updated_by
before update on public.enrollments
for each row execute function public.set_updated_by();

drop trigger if exists set_topics_updated_at on public.topics;
create trigger set_topics_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists set_topics_updated_by on public.topics;
create trigger set_topics_updated_by
before update on public.topics
for each row execute function public.set_updated_by();

drop trigger if exists set_topic_progress_updated_at on public.topic_progress;
create trigger set_topic_progress_updated_at
before update on public.topic_progress
for each row execute function public.set_updated_at();

drop trigger if exists set_topic_completion_requests_updated_at on public.topic_completion_requests;
create trigger set_topic_completion_requests_updated_at
before update on public.topic_completion_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row execute function public.set_updated_at();

drop trigger if exists set_activities_updated_by on public.activities;
create trigger set_activities_updated_by
before update on public.activities
for each row execute function public.set_updated_by();

drop trigger if exists set_activity_submissions_updated_at on public.activity_submissions;
create trigger set_activity_submissions_updated_at
before update on public.activity_submissions
for each row execute function public.set_updated_at();

drop trigger if exists set_activity_submissions_updated_by on public.activity_submissions;
create trigger set_activity_submissions_updated_by
before update on public.activity_submissions
for each row execute function public.set_updated_by();

drop trigger if exists set_quizzes_updated_at on public.quizzes;
create trigger set_quizzes_updated_at
before update on public.quizzes
for each row execute function public.set_updated_at();

drop trigger if exists set_quizzes_updated_by on public.quizzes;
create trigger set_quizzes_updated_by
before update on public.quizzes
for each row execute function public.set_updated_by();

drop trigger if exists set_quiz_questions_updated_at on public.quiz_questions;
create trigger set_quiz_questions_updated_at
before update on public.quiz_questions
for each row execute function public.set_updated_at();

drop trigger if exists set_quiz_questions_updated_by on public.quiz_questions;
create trigger set_quiz_questions_updated_by
before update on public.quiz_questions
for each row execute function public.set_updated_by();

drop trigger if exists set_quiz_attempts_updated_at on public.quiz_attempts;
create trigger set_quiz_attempts_updated_at
before update on public.quiz_attempts
for each row execute function public.set_updated_at();

drop trigger if exists set_quiz_attempts_updated_by on public.quiz_attempts;
create trigger set_quiz_attempts_updated_by
before update on public.quiz_attempts
for each row execute function public.set_updated_by();

drop trigger if exists set_forms_updated_at on public.forms;
create trigger set_forms_updated_at
before update on public.forms
for each row execute function public.set_updated_at();

drop trigger if exists set_forms_updated_by on public.forms;
create trigger set_forms_updated_by
before update on public.forms
for each row execute function public.set_updated_by();

drop trigger if exists set_form_questions_updated_at on public.form_questions;
create trigger set_form_questions_updated_at
before update on public.form_questions
for each row execute function public.set_updated_at();

drop trigger if exists set_form_questions_updated_by on public.form_questions;
create trigger set_form_questions_updated_by
before update on public.form_questions
for each row execute function public.set_updated_by();

drop trigger if exists set_form_responses_updated_at on public.form_responses;
create trigger set_form_responses_updated_at
before update on public.form_responses
for each row execute function public.set_updated_at();

drop trigger if exists set_form_responses_updated_by on public.form_responses;
create trigger set_form_responses_updated_by
before update on public.form_responses
for each row execute function public.set_updated_by();

-- Storage bucket for lesson proof uploads
insert into storage.buckets (id, name, public)
values ('lesson-proofs', 'lesson-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('topic-proofs', 'topic-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Lesson proofs insert by owner" on storage.objects;
drop policy if exists "Lesson proofs read by owner" on storage.objects;
drop policy if exists "Lesson proofs read by admin" on storage.objects;

create policy "Lesson proofs insert by owner"
  on storage.objects
  for insert
  with check (
    bucket_id = 'lesson-proofs'
    and auth.uid() = owner
  );

create policy "Lesson proofs read by owner"
  on storage.objects
  for select
  using (
    bucket_id = 'lesson-proofs'
    and auth.uid() = owner
  );

create policy "Lesson proofs read by admin"
  on storage.objects
  for select
  using (
    bucket_id = 'lesson-proofs'
    and public.is_admin()
  );

drop policy if exists "Topic proofs insert by owner" on storage.objects;
drop policy if exists "Topic proofs read by owner" on storage.objects;
drop policy if exists "Topic proofs read by admin" on storage.objects;

create policy "Topic proofs insert by owner"
  on storage.objects
  for insert
  with check (
    bucket_id = 'topic-proofs'
    and auth.uid() = owner
  );

create policy "Topic proofs read by owner"
  on storage.objects
  for select
  using (
    bucket_id = 'topic-proofs'
    and auth.uid() = owner
  );

create policy "Topic proofs read by admin"
  on storage.objects
  for select
  using (
    bucket_id = 'topic-proofs'
    and public.is_admin()
  );
