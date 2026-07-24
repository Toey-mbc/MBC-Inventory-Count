-- MBC Inventory Count V2.0 - Step 1
-- Run and commit this file BEFORE 004_inventory_operations_upgrade.sql.
-- PostgreSQL requires new enum values to be committed before they are used by later migrations.

do $$ begin alter type public.round_status add value if not exists 'cancelled'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'box_damaged'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'defective'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'pending_inspection'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'customer_claim'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'supplier_claim'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'repaired'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'scrap'; exception when duplicate_object then null; end $$;
do $$ begin alter type public.stock_condition add value if not exists 'accessory'; exception when duplicate_object then null; end $$;
