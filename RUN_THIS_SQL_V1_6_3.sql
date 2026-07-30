-- MBC Inventory Online V1.6.3
-- Ensure the detailed report view used by Location -> SKU drill-down exists.
-- Safe to run more than once and does not delete scan data.

begin;

alter table public.locations
  add column if not exists zone text;

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

create index if not exists scan_totals_round_location_product_idx
  on public.scan_totals (round_id, location_id, product_id, condition);

create index if not exists scan_totals_product_location_idx
  on public.scan_totals (product_id, location_id, round_id);

comment on view public.inventory_count_report is
  'Detailed count report: round, warehouse, location, SKU and stock condition.';

commit;
