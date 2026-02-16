-- Store named topic groups (sub-groups within a course).
alter table public.courses
  add column if not exists topic_groups jsonb not null default '[]'::jsonb;
