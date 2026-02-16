-- Add explicit target and actual schedule dates for learning path enrollments.
alter table public.learning_path_enrollments
  add column if not exists target_start_date timestamptz,
  add column if not exists target_end_date timestamptz,
  add column if not exists actual_start_date timestamptz,
  add column if not exists actual_end_date timestamptz;

-- Backfill target dates from legacy schedule fields.
update public.learning_path_enrollments
set
  target_start_date = coalesce(target_start_date, start_date),
  target_end_date = coalesce(target_end_date, end_date)
where target_start_date is null
   or target_end_date is null;

-- Backfill actual dates from legacy data for existing enrollments.
update public.learning_path_enrollments
set
  actual_start_date = coalesce(actual_start_date, start_date),
  actual_end_date = coalesce(actual_end_date, end_date)
where actual_start_date is null
  and start_date is not null;
