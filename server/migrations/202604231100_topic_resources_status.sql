-- Add status (active/inactive) to topic resources for admin soft-deactivation.
-- Superadmins can still permanently delete; admins toggle status.
-- Idempotent migration for Supabase/Postgres.

alter table public.topic_resources
  add column if not exists status text not null default 'active';

alter table public.topic_resources
  add column if not exists deactivated_at timestamptz;

alter table public.topic_resources
  add column if not exists deactivated_by uuid references auth.users(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'topic_resources_status_check'
  ) then
    alter table public.topic_resources
      add constraint topic_resources_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

create index if not exists topic_resources_status_idx
  on public.topic_resources(status);
