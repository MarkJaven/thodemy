-- Migration: add quiz proof fields and allow owners to update their attempts

begin;

alter table public.quiz_attempts add column if not exists proof_url text;
alter table public.quiz_attempts add column if not exists proof_file_name text;
alter table public.quiz_attempts add column if not exists proof_file_type text;
alter table public.quiz_attempts add column if not exists proof_message text;
alter table public.quiz_attempts add column if not exists proof_submitted_at timestamptz;

drop policy if exists "Quiz attempts updatable by owner" on public.quiz_attempts;
create policy "Quiz attempts updatable by owner"
  on public.quiz_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('quiz-proofs', 'quiz-proofs', false)
on conflict (id) do nothing;

drop policy if exists "Quiz proofs insert by owner" on storage.objects;
drop policy if exists "Quiz proofs read by owner" on storage.objects;
drop policy if exists "Quiz proofs read by admin" on storage.objects;

create policy "Quiz proofs insert by owner"
  on storage.objects
  for insert
  with check (bucket_id = 'quiz-proofs' and auth.uid() = owner);

create policy "Quiz proofs read by owner"
  on storage.objects
  for select
  using (bucket_id = 'quiz-proofs' and auth.uid() = owner);

create policy "Quiz proofs read by admin"
  on storage.objects
  for select
  using (bucket_id = 'quiz-proofs' and public.is_admin());

commit;
