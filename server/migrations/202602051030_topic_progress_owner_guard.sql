-- Guard topic progress so learners cannot self-complete topics.
-- Only admins/superadmins can mark completion; learners can only create/update in_progress.

-- Topic progress insert/update policies

drop policy if exists "Topic progress insertable by owner" on public.topic_progress;
create policy "Topic progress insertable by owner"
  on public.topic_progress
  for insert
  with check (
    auth.uid() = user_id
    and public.topic_prereqs_met(topic_id, user_id)
    and status <> 'completed'
  );

drop policy if exists "Topic progress updatable by owner" on public.topic_progress;
create policy "Topic progress updatable by owner"
  on public.topic_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.topic_prereqs_met(topic_id, user_id)
    and status <> 'completed'
  );
