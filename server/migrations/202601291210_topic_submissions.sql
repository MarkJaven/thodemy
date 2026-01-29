-- Add topic status fields, topic submissions, and audit logs.
-- Idempotent migration for Supabase/Postgres.

-- Topics: add status + soft-delete metadata
alter table public.topics add column if not exists certificate_file_url text;
alter table public.topics add column if not exists start_date timestamptz;
alter table public.topics add column if not exists end_date timestamptz;
alter table public.topics add column if not exists author_id uuid references auth.users(id);
alter table public.topics add column if not exists status text not null default 'active';
alter table public.topics add column if not exists deleted_at timestamptz;
alter table public.topics add column if not exists edited boolean not null default false;

alter table public.topics alter column author_id set default auth.uid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'topics_status_check'
  ) then
    alter table public.topics
      add constraint topics_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

create unique index if not exists topics_title_unique
  on public.topics (lower(title))
  where deleted_at is null;

create index if not exists topics_status_idx on public.topics(status);

-- Topic submissions (user proof uploads)
create table if not exists public.topic_submissions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topic_submissions_topic_idx on public.topic_submissions(topic_id);
create index if not exists topic_submissions_user_idx on public.topic_submissions(user_id);
create index if not exists topic_submissions_status_idx on public.topic_submissions(status);
create index if not exists topic_submissions_submitted_idx on public.topic_submissions(submitted_at);

drop trigger if exists set_topic_submissions_updated_at on public.topic_submissions;
create trigger set_topic_submissions_updated_at
  before update on public.topic_submissions
  for each row execute function public.set_updated_at();

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  actor_id uuid references auth.users(id),
  timestamp timestamptz not null default now(),
  details jsonb
);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_timestamp_idx on public.audit_logs(timestamp);

alter table public.topic_submissions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Topic submissions readable by owner" on public.topic_submissions;
create policy "Topic submissions readable by owner"
  on public.topic_submissions for select
  using (auth.uid() = user_id);

drop policy if exists "Topic submissions insertable by owner" on public.topic_submissions;
create policy "Topic submissions insertable by owner"
  on public.topic_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Topic submissions readable by admin" on public.topic_submissions;
create policy "Topic submissions readable by admin"
  on public.topic_submissions for select
  using (public.is_admin());

drop policy if exists "Topic submissions updatable by admin" on public.topic_submissions;
create policy "Topic submissions updatable by admin"
  on public.topic_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Audit logs readable by admin" on public.audit_logs;
create policy "Audit logs readable by admin"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "Audit logs insertable by admin" on public.audit_logs;
create policy "Audit logs insertable by admin"
  on public.audit_logs for insert
  with check (public.is_admin());

drop policy if exists "Topics readable by admin" on public.topics;
create policy "Topics readable by admin"
  on public.topics for select
  using (public.is_admin());

drop policy if exists "Topics readable by authenticated" on public.topics;
create policy "Topics readable by authenticated"
  on public.topics for select
  using (
    auth.role() = 'authenticated'
    and status = 'active'
    and deleted_at is null
  );
