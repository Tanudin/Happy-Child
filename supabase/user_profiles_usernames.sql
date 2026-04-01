-- Run this in Supabase SQL Editor.
-- Adds unique usernames to user_profiles, backfills existing users,
-- and auto-generates usernames for future inserts/updates.

alter table if exists public.user_profiles
add column if not exists username text;

create or replace function public.normalize_username(input_text text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '', 'g'), ''), 'user');
$$;

create or replace function public.is_placeholder_display_name(input_text text)
returns boolean
language sql
immutable
as $$
  select coalesce(lower(btrim(input_text)), '') in ('', 'user', 'pending', 'update');
$$;

create or replace function public.generate_unique_username(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_display_name text,
  p_email text,
  p_preferred text default null
)
returns text
language plpgsql
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := public.normalize_username(
    coalesce(
      nullif(p_preferred, ''),
      nullif(coalesce(p_first_name, '') || coalesce(p_last_name, ''), ''),
      nullif(p_display_name, ''),
      split_part(coalesce(p_email, ''), '@', 1),
      'user'
    )
  );

  candidate := base_username;

  while exists (
    select 1
    from public.user_profiles up
    where up.username = candidate
      and up.user_id <> p_user_id
  ) loop
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- Backfill usernames for existing users (only missing/blank usernames).
do $$
declare
  profile_record record;
  new_username text;
begin
  for profile_record in
    select user_id, first_name, last_name, display_name, email
    from public.user_profiles
    where username is null or btrim(username) = ''
    order by user_id
  loop
    new_username := public.generate_unique_username(
      profile_record.user_id,
      profile_record.first_name,
      profile_record.last_name,
      profile_record.display_name,
      profile_record.email
    );

    update public.user_profiles up
    set username = new_username,
        display_name = case
          when public.is_placeholder_display_name(profile_record.display_name) then new_username
          else profile_record.display_name
        end
    where up.user_id = profile_record.user_id;
  end loop;
end
$$;

-- Ensure existing provided usernames are normalized and still unique.
do $$
declare
  profile_record record;
  new_username text;
begin
  for profile_record in
    select user_id, first_name, last_name, display_name, email, username
    from public.user_profiles
    where username is not null
      and btrim(username) <> ''
    order by user_id
  loop
    new_username := public.generate_unique_username(
      profile_record.user_id,
      profile_record.first_name,
      profile_record.last_name,
      profile_record.display_name,
      profile_record.email,
      profile_record.username
    );

    update public.user_profiles up
    set username = new_username,
        display_name = case
          when public.is_placeholder_display_name(profile_record.display_name) then new_username
          else profile_record.display_name
        end
    where up.user_id = profile_record.user_id;
  end loop;
end
$$;

alter table public.user_profiles
alter column username set not null;

create unique index if not exists user_profiles_username_unique_idx
on public.user_profiles (username);

create or replace function public.set_user_profile_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is null or btrim(new.username) = '' then
    new.username := public.generate_unique_username(
      new.user_id,
      new.first_name,
      new.last_name,
      new.display_name,
      new.email,
      null
    );
  else
    new.username := public.generate_unique_username(
      new.user_id,
      new.first_name,
      new.last_name,
      new.display_name,
      new.email,
      new.username
    );
  end if;

  if public.is_placeholder_display_name(new.display_name) then
    new.display_name := new.username;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_user_profile_username on public.user_profiles;

create trigger trg_set_user_profile_username
before insert or update of username, first_name, last_name, display_name, email
on public.user_profiles
for each row
execute function public.set_user_profile_username();

-- Refresh PostgREST schema cache so new column is available immediately.
notify pgrst, 'reload schema';
