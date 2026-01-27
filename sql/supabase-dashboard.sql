create extension if not exists "pgcrypto";

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text,
  level text,
  duration_hours integer,
  banner_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index integer not null,
  duration_minutes integer,
  is_required boolean default true
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
  max_score integer
);

alter table public.quizzes add column if not exists show_score boolean not null default false;
alter table public.quizzes add column if not exists assigned_user_id uuid references auth.users(id);

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
  submitted_at timestamptz not null default now()
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
create index if not exists enrollments_user_id_idx on public.enrollments(user_id);
create index if not exists enrollments_course_id_idx on public.enrollments(course_id);
create index if not exists progress_user_id_idx on public.user_progress(user_id);
create index if not exists progress_lesson_id_idx on public.user_progress(lesson_id);
create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists quiz_scores_user_id_idx on public.quiz_scores(user_id);
create index if not exists quiz_scores_quiz_id_idx on public.quiz_scores(quiz_id);
create index if not exists quizzes_course_id_idx on public.quizzes(course_id);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.user_progress enable row level security;
alter table public.activities enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_scores enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.forms enable row level security;

create policy "Courses are readable by authenticated users"
  on public.courses
  for select
  using (auth.role() = 'authenticated');

create policy "Lessons are readable by authenticated users"
  on public.lessons
  for select
  using (auth.role() = 'authenticated');

create policy "Enrollments are readable by owner"
  on public.enrollments
  for select
  using (auth.uid() = user_id);

create policy "Enrollments are insertable by owner"
  on public.enrollments
  for insert
  with check (auth.uid() = user_id);

create policy "Progress is readable by owner"
  on public.user_progress
  for select
  using (auth.uid() = user_id);

create policy "Progress is updatable by owner"
  on public.user_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
    or course_id in (
      select course_id
      from public.enrollments
      where user_id = auth.uid()
        and status in ('approved', 'active', 'completed')
    )
  );

create policy "Quiz scores are readable by owner"
  on public.quiz_scores
  for select
  using (auth.uid() = user_id);

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

create policy "Quiz attempts readable by owner"
  on public.quiz_attempts
  for select
  using (auth.uid() = user_id);

create policy "Quiz attempts insertable by owner"
  on public.quiz_attempts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Forms are readable by authenticated users" on public.forms;

drop policy if exists "Forms are readable by owner" on public.forms;

create policy "Forms are readable by owner or global"
  on public.forms
  for select
  using (assigned_user_id = auth.uid() or assigned_user_id is null);
