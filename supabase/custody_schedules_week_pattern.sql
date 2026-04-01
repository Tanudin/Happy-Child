-- Run this in Supabase SQL Editor.
-- Adds every-week / odd-week / even-week support for custody schedules.

alter table if exists public.custody_schedules
add column if not exists week_pattern text not null default 'all';

-- Normalize unexpected values to 'all' for backward compatibility.
update public.custody_schedules
set week_pattern = 'all'
where week_pattern not in ('all', 'odd', 'even');

-- Add a check constraint if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custody_schedules_week_pattern_check'
  ) then
    alter table public.custody_schedules
      add constraint custody_schedules_week_pattern_check
      check (week_pattern in ('all', 'odd', 'even'));
  end if;
end
$$;

-- Refresh PostgREST schema cache so the new column is available immediately.
notify pgrst, 'reload schema';
