-- MBC Inventory Production 2.0.4
-- Restore the reserved bootstrap administrator and make the System menu visible.
-- Safe to run more than once.

begin;

update public.profiles
set role = 'admin'::public.app_role,
    active = true,
    must_change_password = false,
    updated_at = now()
where lower(split_part(email, '@', 1)) = 'admin';

commit;
