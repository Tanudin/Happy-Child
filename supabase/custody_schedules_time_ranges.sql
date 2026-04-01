-- Run this in Supabase SQL Editor.
-- Adds per-day responsibility time windows and week-pattern rules for custody schedules.

alter table if exists public.custody_schedules
add column if not exists day_time_ranges jsonb not null default '{}'::jsonb;

alter table if exists public.custody_schedules
add column if not exists week_pattern text not null default 'all';

update public.custody_schedules
set week_pattern = 'all'
where week_pattern not in ('all', 'odd', 'even');

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
