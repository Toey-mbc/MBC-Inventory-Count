-- MBC Inventory Online V1.5.4
-- Add fields used by the warehouse/location management screen.
-- Safe to run more than once.

alter table public.warehouses
  add column if not exists description text,
  add column if not exists address text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.locations
  add column if not exists zone text,
  add column if not exists default_condition public.stock_condition not null default 'good',
  add column if not exists scan_code text,
  add column if not exists updated_at timestamptz not null default now();

update public.locations
set scan_code = 'LOC:' || id::text
where scan_code is null or btrim(scan_code) = '';

create unique index if not exists locations_scan_code_unique
  on public.locations (scan_code)
  where scan_code is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists warehouses_set_updated_at on public.warehouses;
create trigger warehouses_set_updated_at
before update on public.warehouses
for each row execute function public.set_updated_at();

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();
