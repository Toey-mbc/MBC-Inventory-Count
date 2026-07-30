-- MBC Inventory Online V1.6.1
-- Detailed report: Round > Warehouse > Location > SKU > Condition.
-- Self-contained repair: adds location fields required by the report before creating the view.
-- Safe to run more than once.

begin;

-- Some installations were created from 001_initial.sql only.
-- Add the columns introduced by the location-management migration so the
-- report and Locations page do not fail when `locations.zone` is missing.
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

-- Recreate the report view after all required columns exist.
drop view if exists public.inventory_count_report;

create view public.inventory_count_report
with (security_invoker = true)
as
select
  totals.round_id,
  rounds.code as round_code,
  rounds.name as round_name,
  rounds.status::text as round_status,
  totals.product_id,
  products.sku,
  products.name as product_name,
  totals.location_id,
  locations.code as location_code,
  locations.name as location_name,
  coalesce(locations.zone, '') as zone,
  locations.warehouse_id,
  warehouses.code as warehouse_code,
  warehouses.name as warehouse_name,
  totals.condition::text as condition,
  totals.quantity,
  totals.updated_at
from public.scan_totals totals
join public.count_rounds rounds on rounds.id = totals.round_id
join public.products products on products.id = totals.product_id
join public.locations locations on locations.id = totals.location_id
join public.warehouses warehouses on warehouses.id = locations.warehouse_id
where totals.quantity <> 0;

grant select on public.inventory_count_report to authenticated;

create index if not exists scan_totals_round_location_idx
  on public.scan_totals (round_id, location_id, product_id);

create index if not exists locations_warehouse_code_idx
  on public.locations (warehouse_id, code);

comment on view public.inventory_count_report is
  'Inventory count detail by round, warehouse, location, SKU and condition.';

commit;
