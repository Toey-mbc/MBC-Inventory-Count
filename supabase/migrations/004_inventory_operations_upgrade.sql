-- MBC Inventory Count Online V2.0
-- Safe upgrade for an existing V1.3 database. Run after 001, 002 and 003.

create extension if not exists pgcrypto;

-- Enum values are added by 003_extend_enums.sql and must be committed first.
alter table public.warehouses
  add column if not exists description text not null default '',
  add column if not exists address text not null default '',
  add column if not exists updated_at timestamptz not null default now();

alter table public.locations
  add column if not exists zone text not null default '',
  add column if not exists default_condition public.stock_condition not null default 'good',
  add column if not exists scan_code text,
  add column if not exists notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.locations
set scan_code='LOC:' || id::text
where scan_code is null;

-- Improve only the untouched starter locations from V1.3; custom names are preserved.
update public.locations set name='ของปกติ',default_condition='good',updated_at=now()
where code='A-01' and name='ชั้น A-01';
update public.locations set name='กล่องบุบ',default_condition='box_damaged',updated_at=now()
where code='A-02' and name='ชั้น A-02';

create unique index if not exists locations_scan_code_uidx on public.locations(scan_code) where scan_code is not null;

alter table public.products
  add column if not exists brand text not null default '',
  add column if not exists category text not null default '',
  add column if not exists unit text not null default 'ชิ้น',
  add column if not exists cost numeric(14,2) not null default 0,
  add column if not exists photo_url text,
  add column if not exists notes text not null default '';

alter table public.count_rounds
  add column if not exists planned_start date,
  add column if not exists notes text not null default '',
  add column if not exists blind_count boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists submitted_by uuid references public.profiles(id),
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists cancellation_reason text,
  add column if not exists adjustments_applied_at timestamptz,
  add column if not exists adjustments_applied_by uuid references public.profiles(id);

alter table public.unknown_barcodes
  add column if not exists resolved_product_id uuid references public.products(id),
  add column if not exists resolved_by uuid references public.profiles(id),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_note text not null default '';

create table if not exists public.unknown_scan_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null,
  barcode text not null,
  quantity integer not null check(quantity > 0),
  user_id uuid not null references public.profiles(id),
  device_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_balances (
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  condition public.stock_condition not null default 'good',
  quantity bigint not null default 0 check(quantity >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  primary key(product_id,location_id,condition)
);

create table if not exists public.round_snapshots (
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  condition public.stock_condition not null,
  system_quantity bigint not null default 0,
  captured_at timestamptz not null default now(),
  primary key(round_id,product_id,location_id,condition)
);

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null,
  before_quantity bigint not null,
  counted_quantity bigint not null,
  difference bigint not null,
  status text not null default 'pending' check(status in ('pending','applied','ignored')),
  note text not null default '',
  applied_at timestamptz,
  applied_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(round_id,product_id,location_id,condition)
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.app_settings(key,value)
values ('organization', jsonb_build_object('name','MBC Communications','system_name','Inventory Count System'))
on conflict(key) do nothing;

create index if not exists inventory_balances_location_idx on public.inventory_balances(location_id);
create index if not exists round_snapshots_round_idx on public.round_snapshots(round_id);
create index if not exists stock_adjustments_round_idx on public.stock_adjustments(round_id,status);
create index if not exists products_brand_idx on public.products(brand);
create index if not exists products_category_idx on public.products(category);

-- Harden scan recording: validates user/location and makes unknown offline retries idempotent.
create or replace function public.record_scan(
 p_round_id uuid,p_location_id uuid,p_condition public.stock_condition,p_barcode text,p_quantity integer,p_client_event_id uuid,p_device_id text default null
) returns table(event_id uuid,sku text,is_unknown boolean)
language plpgsql security definer set search_path=public as $$
declare v_product public.products%rowtype; v_event uuid; v_status public.round_status; v_round_warehouse uuid; v_location_warehouse uuid;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true) then raise exception 'User is inactive'; end if;
 if p_quantity<1 or p_quantity>10000 then raise exception 'Invalid quantity'; end if;
 if nullif(trim(p_barcode),'') is null then raise exception 'Barcode is required'; end if;
 select status,warehouse_id into v_status,v_round_warehouse from public.count_rounds where id=p_round_id;
 if v_status is distinct from 'active' then raise exception 'Round is not active'; end if;
 select warehouse_id into v_location_warehouse from public.locations where id=p_location_id and active=true;
 if v_location_warehouse is null or v_location_warehouse<>v_round_warehouse then raise exception 'Location is not in this round warehouse'; end if;
 select p.* into v_product from public.products p left join public.product_barcodes b on b.product_id=p.id
 where (b.barcode=trim(p_barcode) or lower(p.sku)=lower(trim(p_barcode))) and p.active=true order by b.is_primary desc nulls last limit 1;
 if v_product.id is null then
   insert into public.unknown_scan_events(client_event_id,round_id,location_id,condition,barcode,quantity,user_id,device_id)
   values(p_client_event_id,p_round_id,p_location_id,p_condition,trim(p_barcode),p_quantity,auth.uid(),p_device_id)
   on conflict(client_event_id) do nothing returning id into v_event;
   if v_event is not null then
     insert into public.unknown_barcodes(round_id,location_id,condition,barcode,quantity,first_seen_by)
     values(p_round_id,p_location_id,p_condition,trim(p_barcode),p_quantity,auth.uid())
     on conflict(round_id,location_id,condition,barcode)
     do update set quantity=public.unknown_barcodes.quantity+excluded.quantity,updated_at=now();
     insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
     values(auth.uid(),'unknown_scan','barcode',trim(p_barcode),jsonb_build_object('round_id',p_round_id,'quantity',p_quantity));
   end if;
   return query select v_event,null::text,true;
   return;
 end if;
 insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,user_id,device_id)
 values(p_client_event_id,p_round_id,v_product.id,p_location_id,p_condition,trim(p_barcode),p_quantity,'scan',auth.uid(),p_device_id)
 on conflict(client_event_id) do nothing returning id into v_event;
 if v_event is null then select id into v_event from public.scan_events where client_event_id=p_client_event_id; end if;
 return query select v_event,v_product.sku,false;
end $$;

-- Prevent undo after a round has been submitted or approved.
create or replace function public.undo_scan(p_scan_event_id uuid,p_reason text,p_client_event_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v public.scan_events%rowtype; v_id uuid; v_status public.round_status;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and active=true) then raise exception 'User is inactive'; end if;
 select * into v from public.scan_events where id=p_scan_event_id;
 if v.id is null then raise exception 'Scan event not found'; end if;
 select status into v_status from public.count_rounds where id=v.round_id;
 if v_status <> 'active' then raise exception 'Round is not active'; end if;
 if v.quantity_delta <= 0 then raise exception 'Only positive scans can be undone'; end if;
 if not (v.user_id=auth.uid() or public.is_manager()) then raise exception 'Permission denied'; end if;
 if exists(select 1 from public.scan_events where parent_event_id=v.id and event_type='undo') then raise exception 'Already undone'; end if;
 insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,parent_event_id,reason,user_id,device_id)
 values(p_client_event_id,v.round_id,v.product_id,v.location_id,v.condition,v.barcode,-v.quantity_delta,'undo',v.id,coalesce(nullif(trim(p_reason),''),'ยิงผิด'),auth.uid(),v.device_id)
 returning id into v_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
 values(auth.uid(),'undo_scan','scan_event',v.id::text,jsonb_build_object('reason',p_reason));
 return v_id;
end $$;

-- Variance view includes snapshot-only rows and counted-only rows.
create or replace view public.v_round_variance as
with keys as (
  select round_id,product_id,location_id,condition from public.round_snapshots
  union
  select round_id,product_id,location_id,condition from public.scan_totals
)
select
  k.round_id,k.product_id,p.sku,p.name as product_name,p.brand,p.category,p.unit,
  k.location_id,l.code as location_code,l.name as location_name,w.id as warehouse_id,w.code as warehouse_code,w.name as warehouse_name,
  k.condition,
  coalesce(s.system_quantity,0)::bigint as system_quantity,
  coalesce(t.quantity,0)::bigint as counted_quantity,
  (coalesce(t.quantity,0)-coalesce(s.system_quantity,0))::bigint as difference
from keys k
join public.products p on p.id=k.product_id
join public.locations l on l.id=k.location_id
join public.warehouses w on w.id=l.warehouse_id
left join public.round_snapshots s on s.round_id=k.round_id and s.product_id=k.product_id and s.location_id=k.location_id and s.condition=k.condition
left join public.scan_totals t on t.round_id=k.round_id and t.product_id=k.product_id and t.location_id=k.location_id and t.condition=k.condition;

create or replace view public.v_round_progress as
with snapshot_agg as (
  select round_id,count(*)::bigint as expected_lines from public.round_snapshots group by round_id
), total_agg as (
  select round_id,count(*) filter(where quantity<>0)::bigint as counted_lines,coalesce(sum(quantity),0)::bigint as counted_quantity
  from public.scan_totals group by round_id
)
select r.id as round_id,r.code,r.name,r.status,r.warehouse_id,w.code as warehouse_code,w.name as warehouse_name,
  coalesce(s.expected_lines,0) as expected_lines,coalesce(t.counted_lines,0) as counted_lines,
  case when coalesce(s.expected_lines,0)=0 then 0
       else round(100.0*coalesce(t.counted_lines,0)/s.expected_lines,1) end as progress_percent,
  coalesce(t.counted_quantity,0) as counted_quantity
from public.count_rounds r
join public.warehouses w on w.id=r.warehouse_id
left join snapshot_agg s on s.round_id=r.id
left join total_agg t on t.round_id=r.id;


-- Snapshot current stock when a round starts.
create or replace function public.capture_round_snapshot(p_round_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_warehouse uuid;
begin
  if not public.is_manager() then raise exception 'Manager permission required'; end if;
  select warehouse_id into v_warehouse from public.count_rounds where id=p_round_id;
  if v_warehouse is null then raise exception 'Round not found'; end if;

  delete from public.round_snapshots where round_id=p_round_id;
  insert into public.round_snapshots(round_id,product_id,location_id,condition,system_quantity)
  select p_round_id,b.product_id,b.location_id,b.condition,b.quantity
  from public.inventory_balances b
  join public.locations l on l.id=b.location_id
  where l.warehouse_id=v_warehouse;
end $$;

-- Replace the original workflow function with cancellation and snapshot support.
drop function if exists public.set_round_status(uuid,public.round_status);
create or replace function public.set_round_status(p_round_id uuid,p_status public.round_status,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare old_status public.round_status;
begin
  if not public.is_manager() then raise exception 'Manager permission required'; end if;
  select status into old_status from public.count_rounds where id=p_round_id for update;
  if old_status is null then raise exception 'Round not found'; end if;

  if old_status='draft' and p_status='active' then
    perform public.capture_round_snapshot(p_round_id);
    update public.count_rounds set status=p_status,started_at=now(),updated_at=now() where id=p_round_id;
  elsif old_status='active' and p_status='review' then
    update public.count_rounds set status=p_status,submitted_at=now(),submitted_by=auth.uid(),updated_at=now() where id=p_round_id;
  elsif old_status='review' and p_status='approved' then
    insert into public.stock_adjustments(round_id,product_id,location_id,condition,before_quantity,counted_quantity,difference)
    select p_round_id,x.product_id,x.location_id,x.condition,x.system_quantity,x.counted_quantity,x.counted_quantity-x.system_quantity
    from public.v_round_variance x
    where x.round_id=p_round_id and x.counted_quantity<>x.system_quantity
    on conflict(round_id,product_id,location_id,condition)
    do update set before_quantity=excluded.before_quantity,counted_quantity=excluded.counted_quantity,difference=excluded.difference,status='pending';
    update public.count_rounds set status=p_status,approved_at=now(),approved_by=auth.uid(),updated_at=now() where id=p_round_id;
  elsif old_status in ('draft','active','review') and p_status='cancelled' then
    update public.count_rounds set status=p_status,cancelled_at=now(),cancelled_by=auth.uid(),cancellation_reason=coalesce(nullif(trim(p_reason),''),'ยกเลิกโดยผู้ดูแล'),updated_at=now() where id=p_round_id;
  else
    raise exception 'Invalid status transition % -> %',old_status,p_status;
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'round_status','count_round',p_round_id::text,jsonb_build_object('from',old_status,'to',p_status,'reason',p_reason));
end $$;

-- Set an exact counted quantity by writing a correction event (keeps the audit trail).
create or replace function public.set_count_quantity(
  p_round_id uuid,p_product_id uuid,p_location_id uuid,p_condition public.stock_condition,
  p_quantity integer,p_reason text,p_client_event_id uuid
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_current bigint; v_delta bigint; v_barcode text; v_id uuid; v_status public.round_status; v_round_warehouse uuid; v_location_warehouse uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and active=true) then raise exception 'User is inactive'; end if;
  if p_quantity < 0 or p_quantity > 100000000 then raise exception 'Invalid quantity'; end if;
  select status,warehouse_id into v_status,v_round_warehouse from public.count_rounds where id=p_round_id;
  if v_status <> 'active' then raise exception 'Round is not active'; end if;
  select warehouse_id into v_location_warehouse from public.locations where id=p_location_id and active=true;
  if v_location_warehouse is null or v_location_warehouse<>v_round_warehouse then raise exception 'Location is not in this round warehouse'; end if;
  if not exists(select 1 from public.products where id=p_product_id and active=true) then raise exception 'Product is inactive or missing'; end if;

  select coalesce(quantity,0) into v_current from public.scan_totals
  where round_id=p_round_id and product_id=p_product_id and location_id=p_location_id and condition=p_condition;
  v_current:=coalesce(v_current,0);
  v_delta:=p_quantity-v_current;
  if v_delta=0 then return null; end if;

  select barcode into v_barcode from public.product_barcodes where product_id=p_product_id order by is_primary desc,created_at limit 1;
  insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,reason,user_id)
  values(p_client_event_id,p_round_id,p_product_id,p_location_id,p_condition,coalesce(v_barcode,'MANUAL'),v_delta,'correction',coalesce(nullif(trim(p_reason),''),'แก้ไขจำนวน'),auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.apply_round_adjustments(p_round_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_status public.round_status; v_count integer;
begin
  if not public.is_manager() then raise exception 'Manager permission required'; end if;
  select status into v_status from public.count_rounds where id=p_round_id for update;
  if v_status <> 'approved' then raise exception 'Round must be approved first'; end if;
  if exists(select 1 from public.count_rounds where id=p_round_id and adjustments_applied_at is not null) then
    raise exception 'Adjustments already applied';
  end if;

  insert into public.inventory_balances(product_id,location_id,condition,quantity,updated_at,updated_by)
  select product_id,location_id,condition,counted_quantity,now(),auth.uid()
  from public.stock_adjustments where round_id=p_round_id and status='pending'
  on conflict(product_id,location_id,condition)
  do update set quantity=excluded.quantity,updated_at=now(),updated_by=auth.uid();

  update public.stock_adjustments set status='applied',applied_at=now(),applied_by=auth.uid()
  where round_id=p_round_id and status='pending';
  get diagnostics v_count=row_count;

  update public.count_rounds set adjustments_applied_at=now(),adjustments_applied_by=auth.uid(),updated_at=now() where id=p_round_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'apply_adjustments','count_round',p_round_id::text,jsonb_build_object('rows',v_count));
  return v_count;
end $$;

create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles set must_change_password=false,updated_at=now() where id=auth.uid();
end $$;

-- Keep scan writes behind validated RPC functions.
revoke all on function public.record_scan(uuid,uuid,public.stock_condition,text,integer,uuid,text) from public;
grant execute on function public.record_scan(uuid,uuid,public.stock_condition,text,integer,uuid,text) to authenticated;
revoke all on function public.undo_scan(uuid,text,uuid) from public;
grant execute on function public.undo_scan(uuid,text,uuid) to authenticated;

-- Replace broad V1 policies that could bypass the V2 workflow or Admin API safeguards.
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists rounds_manage on public.count_rounds;
drop policy if exists rounds_create on public.count_rounds;
create policy rounds_create on public.count_rounds for insert to authenticated
with check(public.is_manager() and created_by=auth.uid());

-- RLS for upgraded tables.
alter table public.unknown_scan_events enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.round_snapshots enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists unknown_events_read on public.unknown_scan_events;
create policy unknown_events_read on public.unknown_scan_events for select to authenticated using(public.is_manager() or user_id=auth.uid());

drop policy if exists inventory_read on public.inventory_balances;
create policy inventory_read on public.inventory_balances for select to authenticated using(true);
drop policy if exists inventory_manage on public.inventory_balances;
create policy inventory_manage on public.inventory_balances for all to authenticated using(public.is_manager()) with check(public.is_manager());

drop policy if exists snapshots_read on public.round_snapshots;
create policy snapshots_read on public.round_snapshots for select to authenticated using(true);

drop policy if exists adjustments_read on public.stock_adjustments;
create policy adjustments_read on public.stock_adjustments for select to authenticated using(true);
drop policy if exists adjustments_manage on public.stock_adjustments;
-- Adjustments are immutable from the client; apply_round_adjustments is the controlled write path.

drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select to authenticated using(true);
drop policy if exists settings_manage on public.app_settings;
create policy settings_manage on public.app_settings for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');

revoke all on function public.capture_round_snapshot(uuid) from public;
-- Internal helper only. It is called by set_round_status and is not exposed to clients.
revoke all on function public.set_round_status(uuid,public.round_status,text) from public;
grant execute on function public.set_round_status(uuid,public.round_status,text) to authenticated;
revoke all on function public.set_count_quantity(uuid,uuid,uuid,public.stock_condition,integer,text,uuid) from public;
grant execute on function public.set_count_quantity(uuid,uuid,uuid,public.stock_condition,integer,text,uuid) to authenticated;
revoke all on function public.apply_round_adjustments(uuid) from public;
grant execute on function public.apply_round_adjustments(uuid) to authenticated;
revoke all on function public.complete_password_change() from public;
grant execute on function public.complete_password_change() to authenticated;

grant select on public.v_round_variance to authenticated;
grant select on public.v_round_progress to authenticated;
