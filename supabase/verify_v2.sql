-- MBC Inventory Count V2.0 - Read-only verification
-- Run after migrations 003 and 004. Every required object should return a non-null name.

select 'inventory_balances' as object_name, to_regclass('public.inventory_balances') as installed
union all select 'round_snapshots', to_regclass('public.round_snapshots')
union all select 'stock_adjustments', to_regclass('public.stock_adjustments')
union all select 'unknown_scan_events', to_regclass('public.unknown_scan_events')
union all select 'app_settings', to_regclass('public.app_settings')
union all select 'v_round_variance', to_regclass('public.v_round_variance')
union all select 'v_round_progress', to_regclass('public.v_round_progress');

select enumlabel as round_status
from pg_enum e join pg_type t on t.oid=e.enumtypid
where t.typnamespace='public'::regnamespace and t.typname='round_status'
order by e.enumsortorder;

select enumlabel as stock_condition
from pg_enum e join pg_type t on t.oid=e.enumtypid
where t.typnamespace='public'::regnamespace and t.typname='stock_condition'
order by e.enumsortorder;

select proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and proname in ('record_scan','undo_scan','set_count_quantity','set_round_status','apply_round_adjustments','complete_password_change')
order by proname;

select key,value from public.app_settings order by key;
