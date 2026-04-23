-- Topic resources (admin-uploaded learning material attached to a topic).
-- Idempotent migration for Supabase/Postgres.

create table if not exists public.topic_resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text,
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topic_resources_topic_idx on public.topic_resources(topic_id);
create index if not exists topic_resources_uploader_idx on public.topic_resources(uploaded_by);

drop trigger if exists set_topic_resources_updated_at on public.topic_resources;
create trigger set_topic_resources_updated_at
  before update on public.topic_resources
  for each row execute function public.set_updated_at();

alter table public.topic_resources enable row level security;

drop policy if exists "Topic resources readable by authenticated" on public.topic_resources;
create policy "Topic resources readable by authenticated"
  on public.topic_resources for select
  using (auth.role() = 'authenticated');

drop policy if exists "Topic resources writable by admin" on public.topic_resources;
create policy "Topic resources writable by admin"
  on public.topic_resources for all
  using (public.is_admin())
  with check (public.is_admin());

-- Private storage bucket (served via signed URLs)
insert into storage.buckets (id, name, public)
values ('topic-resources', 'topic-resources', false)
on conflict (id) do nothing;

drop policy if exists "Topic resources bucket readable by authenticated" on storage.objects;
create policy "Topic resources bucket readable by authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'topic-resources');

drop policy if exists "Topic resources bucket writable by admin" on storage.objects;
create policy "Topic resources bucket writable by admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'topic-resources' and public.is_admin());

drop policy if exists "Topic resources bucket updatable by admin" on storage.objects;
create policy "Topic resources bucket updatable by admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'topic-resources' and public.is_admin());

drop policy if exists "Topic resources bucket deletable by admin" on storage.objects;
create policy "Topic resources bucket deletable by admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'topic-resources' and public.is_admin());
