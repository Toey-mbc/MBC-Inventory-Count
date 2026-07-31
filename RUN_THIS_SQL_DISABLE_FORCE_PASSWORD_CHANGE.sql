-- MBC Inventory: disable forced password change
-- Safe to run more than once on an existing database.

alter table public.profiles
  alter column must_change_password set default false;

update public.profiles
set must_change_password = false,
    updated_at = now()
where must_change_password is distinct from false;

drop function if exists public.complete_password_change();

notify pgrst, 'reload schema';
