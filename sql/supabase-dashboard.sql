create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text,
  level text,
  duration_hours integer,
  banner_url text,
  topic_ids uuid[] not null default '{}'::uuid[],
  topic_prerequisites jsonb not null default '{}'::jsonb,
  topic_corequisites jsonb not null default '{}'::jsonb,
  topic_groups jsonb not null default '[]'::jsonb,
  total_hours numeric,
  total_days integer,
  course_code text,
  status text default 'draft',
  enrollment_enabled boolean not null default true,
  enrollment_limit integer,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.courses add column if not exists topic_ids uuid[] not null default '{}'::uuid[];
alter table public.courses add column if not exists topic_prerequisites jsonb not null default '{}'::jsonb;
alter table public.courses add column if not exists topic_corequisites jsonb not null default '{}'::jsonb;
alter table public.courses add column if not exists topic_groups jsonb not null default '[]'::jsonb;
alter table public.courses add column if not exists total_hours numeric;
alter table public.courses add column if not exists total_days integer;
alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists status text default 'draft';
alter table public.courses add column if not exists enrollment_enabled boolean not null default true;
alter table public.courses add column if not exists enrollment_limit integer;
alter table public.courses add column if not exists start_at timestamptz;
alter table public.courses add column if not exists end_at timestamptz;
alter table public.courses add column if not exists created_by uuid references auth.users(id);
alter table public.courses add column if not exists updated_at timestamptz not null default now();
alter table public.courses add column if not exists updated_by uuid references auth.users(id);

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

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  status text
);

alter table public.enrollments add column if not exists start_date timestamptz;
alter table public.enrollments add column if not exists end_date timestamptz;

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  file_name text,
  file_type text,
  file_url text,
  created_at timestamptz not null default now()
);

alter table public.activities add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.activities alter column user_id drop not null;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  total_questions integer,
  score_visible boolean not null default false,
  show_score boolean not null default false,
  assigned_user_id uuid references auth.users(id),
  status text default 'active',
  link_url text,
  start_at timestamptz,
  end_at timestamptz,
  max_score integer
);

alter table public.quizzes add column if not exists show_score boolean not null default false;
alter table public.quizzes add column if not exists assigned_user_id uuid references auth.users(id);
alter table public.quizzes add column if not exists status text default 'active';
alter table public.quizzes add column if not exists link_url text;
alter table public.quizzes add column if not exists start_at timestamptz;
alter table public.quizzes add column if not exists end_at timestamptz;

create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  submitted_at timestamptz not null default now(),
  graded_by text
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  order_index integer not null default 0
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  submitted_at timestamptz not null default now(),
  proof_url text,
  proof_file_name text,
  proof_file_type text,
  proof_message text,
  proof_submitted_at timestamptz
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  status text,
  assigned_user_id uuid references auth.users(id),
  link_url text,
  start_at timestamptz,
  end_at timestamptz,
  due_at timestamptz
);

alter table public.forms add column if not exists assigned_user_id uuid references auth.users(id);
alter table public.forms add column if not exists link_url text;
alter table public.forms add column if not exists start_at timestamptz;
alter table public.forms add column if not exists end_at timestamptz;

create index if not exists lessons_course_id_idx on public.lessons(course_id);
create index if not exists lesson_topics_lesson_id_idx on public.lesson_topics(lesson_id);
create index if not exists lesson_assignments_user_id_idx on public.lesson_assignments(user_id);
create index if not exists lesson_assignments_lesson_id_idx on public.lesson_assignments(lesson_id);
create index if not exists lesson_submissions_assignment_idx on public.lesson_submissions(lesson_assignment_id);
create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx on public.enrollments(course_id);
create index if not exists progress_user_id_idx on public.user_progress(user_id);
create index if not exists progress_lesson_id_idx on public.user_progress(lesson_id);
create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists quiz_scores_user_id_idx on public.quiz_scores(user_id);
create index if not exists quiz_scores_quiz_id_idx on public.quiz_scores(quiz_id);
create index if not exists quizzes_course_id_idx on public.quizzes(course_id);
create unique index if not exists courses_code_idx on public.courses(course_code);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_topics enable row level security;
alter table public.lesson_assignments enable row level security;
alter table public.lesson_submissions enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_progress enable row level security;
alter table public.activities enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_scores enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.forms enable row level security;

drop policy if exists "Courses are readable by authenticated users" on public.courses;
drop policy if exists "Courses are readable by enrolled users" on public.courses;
create policy "Courses are readable by enrolled users"
  on public.courses
  for select
  using (
    exists (
      select 1
      from public.enrollments
      where user_id = auth.uid()
        and course_id = id
        and status in ('pending', 'approved', 'active', 'completed', 'enrolled')
    )
  );

drop policy if exists "Lessons are readable by authenticated users" on public.lessons;
create policy "Lessons are readable by authenticated users"
  on public.lessons
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Lesson topics are readable by enrolled users" on public.lesson_topics;
create policy "Lesson topics are readable by enrolled users"
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

drop policy if exists "Lesson assignments are readable by owner" on public.lesson_assignments;
create policy "Lesson assignments are readable by owner"
  on public.lesson_assignments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lesson assignments are updatable by owner" on public.lesson_assignments;
create policy "Lesson assignments are updatable by owner"
  on public.lesson_assignments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Lesson submissions are readable by owner" on public.lesson_submissions;
create policy "Lesson submissions are readable by owner"
  on public.lesson_submissions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Lesson submissions are insertable by owner" on public.lesson_submissions;
create policy "Lesson submissions are insertable by owner"
  on public.lesson_submissions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Enrollments are readable by owner" on public.enrollments;
create policy "Enrollments are readable by owner"
  on public.enrollments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Enrollments are insertable by owner" on public.enrollments;
create policy "Enrollments are insertable by owner"
  on public.enrollments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Progress is readable by owner" on public.user_progress;
create policy "Progress is readable by owner"
  on public.user_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "Progress is updatable by owner" on public.user_progress;
create policy "Progress is updatable by owner"
  on public.user_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Activities are readable by owner" on public.activities;
create policy "Activities are readable by owner"
  on public.activities
  for select
  using (auth.uid() = user_id);

drop policy if exists "Activities are readable by enrolled user" on public.activities;

create policy "Activities are readable by enrolled user"
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

drop policy if exists "Activities are insertable by owner" on public.activities;
create policy "Activities are insertable by owner"
  on public.activities
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Quizzes are readable by authenticated users" on public.quizzes;

drop policy if exists "Quizzes are readable by assignee" on public.quizzes;

create policy "Quizzes are readable by assignee"
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

drop policy if exists "Quiz scores are readable by owner" on public.quiz_scores;
create policy "Quiz scores are readable by owner"
  on public.quiz_scores
  for select
  using (auth.uid() = user_id);

drop policy if exists "Quiz scores are insertable by owner" on public.quiz_scores;
create policy "Quiz scores are insertable by owner"
  on public.quiz_scores
  for insert
  with check (auth.uid() = user_id);

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

drop policy if exists "Quiz attempts updatable by owner" on public.quiz_attempts;
create policy "Quiz attempts updatable by owner"
  on public.quiz_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Forms are readable by authenticated users" on public.forms;

drop policy if exists "Forms are readable by owner" on public.forms;

drop policy if exists "Forms are readable by owner or global" on public.forms;
create policy "Forms are readable by owner or global"
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

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  link_url text,
  time_allocated numeric not null,
  time_unit text not null default 'days' check (time_unit in ('hours', 'days')),
  pre_requisites uuid[] not null default '{}'::uuid[],
  co_requisites uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

alter table public.topics add column if not exists link_url text;
alter table public.topics add column if not exists time_unit text not null default 'days';
alter table public.topics drop constraint if exists topics_time_unit_check;
alter table public.topics
  add constraint topics_time_unit_check
  check (time_unit in ('hours', 'days'));

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

create table if not exists public.course_completion_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists topics_created_at_idx on public.topics(created_at);
create index if not exists topic_progress_user_idx on public.topic_progress(user_id);
create index if not exists topic_progress_topic_idx on public.topic_progress(topic_id);
create index if not exists topic_completion_requests_user_idx on public.topic_completion_requests(user_id);
create index if not exists topic_completion_requests_topic_idx on public.topic_completion_requests(topic_id);
create index if not exists topic_completion_requests_status_idx on public.topic_completion_requests(status);
create index if not exists course_completion_requests_user_idx on public.course_completion_requests(user_id);
create index if not exists course_completion_requests_course_idx on public.course_completion_requests(course_id);
create index if not exists course_completion_requests_lp_idx on public.course_completion_requests(learning_path_id);
create index if not exists course_completion_requests_status_idx on public.course_completion_requests(status);

alter table public.topics enable row level security;
alter table public.topic_progress enable row level security;
alter table public.topic_completion_requests enable row level security;
alter table public.course_completion_requests enable row level security;

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

drop policy if exists "Topics are readable by authenticated users" on public.topics;
drop policy if exists "Topic progress readable by owner" on public.topic_progress;
drop policy if exists "Topic progress insertable by owner" on public.topic_progress;
drop policy if exists "Topic progress updatable by owner" on public.topic_progress;
drop policy if exists "Topic completion requests readable by owner" on public.topic_completion_requests;
drop policy if exists "Topic completion requests insertable by owner" on public.topic_completion_requests;
drop policy if exists "Course completion readable by owner" on public.course_completion_requests;
drop policy if exists "Course completion insertable by owner" on public.course_completion_requests;

create policy "Topics are readable by authenticated users"
  on public.topics
  for select
  using (auth.role() = 'authenticated');

create policy "Topic progress readable by owner"
  on public.topic_progress
  for select
  using (auth.uid() = user_id);

create policy "Topic progress insertable by owner"
  on public.topic_progress
  for insert
  with check (auth.uid() = user_id and public.topic_prereqs_met(topic_id, user_id));

create policy "Topic progress updatable by owner"
  on public.topic_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.topic_prereqs_met(topic_id, user_id)
  );

create policy "Topic completion requests readable by owner"
  on public.topic_completion_requests
  for select
  using (auth.uid() = user_id);

create policy "Topic completion requests insertable by owner"
  on public.topic_completion_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Course completion readable by owner"
  on public.course_completion_requests
  for select
  using (auth.uid() = user_id);

create policy "Course completion insertable by owner"
  on public.course_completion_requests
  for insert
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('topic-proofs', 'topic-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Topic proofs insert by owner" on storage.objects;
drop policy if exists "Topic proofs read by owner" on storage.objects;

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

insert into storage.buckets (id, name, public)
values ('course-proofs', 'course-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Course proofs insert by owner" on storage.objects;
drop policy if exists "Course proofs read by owner" on storage.objects;

create policy "Course proofs insert by owner"
  on storage.objects
  for insert
  with check (
    bucket_id = 'course-proofs'
    and auth.uid() = owner
  );

create policy "Course proofs read by owner"
  on storage.objects
  for select
  using (
    bucket_id = 'course-proofs'
    and auth.uid() = owner
  );

insert into storage.buckets (id, name, public)
values ('quiz-proofs', 'quiz-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Quiz proofs insert by owner" on storage.objects;
drop policy if exists "Quiz proofs read by owner" on storage.objects;

create policy "Quiz proofs insert by owner"
  on storage.objects
  for insert
  with check (
    bucket_id = 'quiz-proofs'
    and auth.uid() = owner
  );

create policy "Quiz proofs read by owner"
  on storage.objects
  for select
  using (
    bucket_id = 'quiz-proofs'
    and auth.uid() = owner
  );
