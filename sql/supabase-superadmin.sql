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
create index if not exists enrollments_status_idx on public.enrollments(status);
create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);
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

create policy "User roles readable by owner"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

create policy "User roles manageable by superadmin"
  on public.user_roles
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Courses manageable by superadmin"
  on public.courses
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Courses readable by admin"
  on public.courses
  for select
  using (public.is_admin());

create policy "Enrollments manageable by superadmin"
  on public.enrollments
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Enrollments updatable by admin"
  on public.enrollments
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Enrollments readable by admin"
  on public.enrollments
  for select
  using (public.is_admin());

create policy "Enrollments insertable by owner"
  on public.enrollments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Enrollments readable by owner" on public.enrollments;

create policy "Enrollments readable by owner"
  on public.enrollments
  for select
  using (auth.uid() = user_id);

create policy "Activities manageable by superadmin"
  on public.activities
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

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

create policy "Activity submissions manageable by superadmin"
  on public.activity_submissions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Activity submissions readable by admin"
  on public.activity_submissions
  for select
  using (public.is_admin());

create policy "Activity submissions readable by owner"
  on public.activity_submissions
  for select
  using (auth.uid() = user_id);

create policy "Activity submissions insertable by owner"
  on public.activity_submissions
  for insert
  with check (auth.uid() = user_id);

create policy "Quizzes manageable by superadmin"
  on public.quizzes
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Quizzes readable by admin"
  on public.quizzes
  for select
  using (public.is_admin());

drop policy if exists "Quizzes readable by assignee" on public.quizzes;

create policy "Quizzes readable by assignee"
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

create policy "Quiz questions manageable by superadmin"
  on public.quiz_questions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

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

create policy "Quiz attempts manageable by superadmin"
  on public.quiz_attempts
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Quiz attempts readable by admin"
  on public.quiz_attempts
  for select
  using (public.is_admin());

create policy "Quiz attempts readable by owner"
  on public.quiz_attempts
  for select
  using (auth.uid() = user_id);

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

create policy "Quiz scores manageable by admin"
  on public.quiz_scores
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Forms manageable by superadmin"
  on public.forms
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Forms readable by admin"
  on public.forms
  for select
  using (public.is_admin());

drop policy if exists "Forms readable by assignee" on public.forms;

create policy "Forms readable by assignee or global"
  on public.forms
  for select
  using (assigned_user_id = auth.uid() or assigned_user_id is null);

create policy "Form questions manageable by superadmin"
  on public.form_questions
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Form questions readable by admin"
  on public.form_questions
  for select
  using (public.is_admin());

create policy "Form responses manageable by superadmin"
  on public.form_responses
  for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Form responses readable by admin"
  on public.form_responses
  for select
  using (public.is_admin());

drop policy if exists "Profiles readable by superadmin" on public.profiles;

create policy "Profiles readable by superadmin"
  on public.profiles
  for select
  using (public.is_superadmin());

drop policy if exists "Profiles updatable by superadmin" on public.profiles;

create policy "Profiles updatable by superadmin"
  on public.profiles
  for update
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy "Form responses readable by owner"
  on public.form_responses
  for select
  using (auth.uid() = user_id);

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
