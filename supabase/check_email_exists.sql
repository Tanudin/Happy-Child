-- Run this SQL in Supabase SQL editor.
-- It lets the app check whether an account exists for a given email.

create or replace function public.email_exists_for_reset(input_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text;
begin
  if input_email is null then
    return false;
  end if;

  normalized_email := lower(trim(input_email));

  if normalized_email = '' then
    return false;
  end if;

  return exists (
    select 1
    from auth.users
    where lower(email) = normalized_email
      and deleted_at is null
  );
end;
$$;

revoke all on function public.email_exists_for_reset(text) from public;
grant execute on function public.email_exists_for_reset(text) to anon;
grant execute on function public.email_exists_for_reset(text) to authenticated;