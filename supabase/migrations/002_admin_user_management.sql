-- Run after 001_initial.sql.
-- This migration adds a safe helper for promoting the first manually-created Auth user to Admin.
create or replace function public.promote_first_admin(p_email text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists(select 1 from public.profiles where role='admin' and active=true) then
    raise exception 'An active admin already exists';
  end if;

  update public.profiles
  set role='admin', active=true, must_change_password=false, updated_at=now()
  where lower(email)=lower(trim(p_email));

  if not found then
    raise exception 'User not found. Create the Auth user first.';
  end if;
end $$;

revoke all on function public.promote_first_admin(text) from public;
