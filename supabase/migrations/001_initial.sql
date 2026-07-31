-- MBC Inventory Count Online - Initial schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin','warehouse_manager','sale_support','counter','viewer');
create type public.round_status as enum ('draft','active','review','approved');
create type public.stock_condition as enum ('good','damaged','demo');
create type public.scan_event_type as enum ('scan','correction','undo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'viewer',
  must_change_password boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique(warehouse_id,code)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  barcode text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.count_rounds (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  warehouse_id uuid not null references public.warehouses(id),
  status public.round_status not null default 'draft',
  environment text not null default 'production' check (environment in ('test','production')),
  created_by uuid references public.profiles(id),
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scan_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id uuid not null unique,
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  product_id uuid references public.products(id),
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null default 'good',
  barcode text not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  event_type public.scan_event_type not null default 'scan',
  parent_event_id uuid references public.scan_events(id),
  reason text,
  user_id uuid not null references public.profiles(id),
  device_id text,
  created_at timestamptz not null default now()
);
create index scan_events_round_idx on public.scan_events(round_id,created_at desc);
create index scan_events_product_idx on public.scan_events(product_id);
create index scan_events_user_idx on public.scan_events(user_id,created_at desc);

create table public.scan_totals (
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null,
  quantity bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key(round_id,product_id,location_id,condition)
);

create table public.unknown_barcodes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null,
  barcode text not null,
  quantity bigint not null default 0,
  status text not null default 'open' check(status in ('open','linked','ignored')),
  first_seen_by uuid references public.profiles(id),
  first_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(round_id,location_id,condition,barcode)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,email,full_name,role,must_change_password)
 values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),
   coalesce((new.raw_user_meta_data->>'role')::public.app_role,'viewer'),
   false);
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.current_role() returns public.app_role
language sql stable security definer set search_path=public as $$
 select role from public.profiles where id=auth.uid() and active=true
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce(public.current_role() in ('admin','warehouse_manager','sale_support','counter'),false)
$$;

create or replace function public.update_scan_total() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.product_id is not null then
   insert into public.scan_totals(round_id,product_id,location_id,condition,quantity)
   values(new.round_id,new.product_id,new.location_id,new.condition,new.quantity_delta)
   on conflict(round_id,product_id,location_id,condition)
   do update set quantity=public.scan_totals.quantity+excluded.quantity,updated_at=now();
 end if;
 return new;
end $$;
create trigger trg_scan_total after insert on public.scan_events for each row execute function public.update_scan_total();

create or replace function public.record_scan(
 p_round_id uuid,p_location_id uuid,p_condition public.stock_condition,p_barcode text,p_quantity integer,p_client_event_id uuid,p_device_id text default null
) returns table(event_id uuid,sku text,is_unknown boolean)
language plpgsql security definer set search_path=public as $$
declare v_product public.products%rowtype; v_event uuid; v_status public.round_status;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if p_quantity<1 or p_quantity>10000 then raise exception 'Invalid quantity'; end if;
 select status into v_status from public.count_rounds where id=p_round_id;
 if v_status is distinct from 'active' then raise exception 'Round is not active'; end if;
 select p.* into v_product from public.products p join public.product_barcodes b on b.product_id=p.id where b.barcode=trim(p_barcode) and p.active=true limit 1;
 if v_product.id is null then
   insert into public.unknown_barcodes(round_id,location_id,condition,barcode,quantity,first_seen_by)
   values(p_round_id,p_location_id,p_condition,trim(p_barcode),p_quantity,auth.uid())
   on conflict(round_id,location_id,condition,barcode)
   do update set quantity=public.unknown_barcodes.quantity+excluded.quantity,updated_at=now();
   insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
   values(auth.uid(),'unknown_scan','barcode',trim(p_barcode),jsonb_build_object('round_id',p_round_id,'quantity',p_quantity));
   return query select null::uuid,null::text,true;
   return;
 end if;
 insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,user_id,device_id)
 values(p_client_event_id,p_round_id,v_product.id,p_location_id,p_condition,trim(p_barcode),p_quantity,'scan',auth.uid(),p_device_id)
 on conflict(client_event_id) do nothing returning id into v_event;
 if v_event is null then
   select id into v_event from public.scan_events where client_event_id=p_client_event_id;
 end if;
 return query select v_event,v_product.sku,false;
end $$;

create or replace function public.undo_scan(p_scan_event_id uuid,p_reason text,p_client_event_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v public.scan_events%rowtype; v_id uuid;
begin
 select * into v from public.scan_events where id=p_scan_event_id;
 if v.id is null then raise exception 'Scan event not found'; end if;
 if v.quantity_delta <= 0 then raise exception 'Only positive scans can be undone'; end if;
 if not (v.user_id=auth.uid() or public.is_manager()) then raise exception 'Permission denied'; end if;
 if exists(select 1 from public.scan_events where parent_event_id=v.id and event_type='undo') then raise exception 'Already undone'; end if;
 insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,parent_event_id,reason,user_id)
 values(p_client_event_id,v.round_id,v.product_id,v.location_id,v.condition,v.barcode,-v.quantity_delta,'undo',v.id,p_reason,auth.uid()) returning id into v_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'undo_scan','scan_event',v.id::text,jsonb_build_object('reason',p_reason));
 return v_id;
end $$;

create or replace function public.set_round_status(p_round_id uuid,p_status public.round_status)
returns void language plpgsql security definer set search_path=public as $$
declare old_status public.round_status;
begin
 if not public.is_manager() then raise exception 'Manager permission required'; end if;
 select status into old_status from public.count_rounds where id=p_round_id for update;
 if old_status='draft' and p_status='active' then update public.count_rounds set status=p_status,started_at=now() where id=p_round_id;
 elsif old_status='active' and p_status='review' then update public.count_rounds set status=p_status,submitted_at=now() where id=p_round_id;
 elsif old_status='review' and p_status='approved' then update public.count_rounds set status=p_status,approved_at=now() where id=p_round_id;
 else raise exception 'Invalid status transition % -> %',old_status,p_status;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'round_status','count_round',p_round_id::text,jsonb_build_object('from',old_status,'to',p_status));
end $$;

create or replace function public.reset_test_data() returns void
language plpgsql security definer set search_path=public as $$
begin
 if public.current_role() <> 'admin' then raise exception 'Admin permission required'; end if;
 delete from public.count_rounds where environment='test';
 insert into public.audit_logs(actor_id,action,entity_type,details) values(auth.uid(),'reset_test_data','system','{}');
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.warehouses enable row level security;
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.product_barcodes enable row level security;
alter table public.count_rounds enable row level security;
alter table public.scan_events enable row level security;
alter table public.scan_totals enable row level security;
alter table public.unknown_barcodes enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_admin_update on public.profiles for update to authenticated using (public.current_role()='admin') with check (public.current_role()='admin');
create policy master_read_warehouses on public.warehouses for select to authenticated using(true);
create policy master_manage_warehouses on public.warehouses for all to authenticated using(public.is_manager()) with check(public.is_manager());
create policy master_read_locations on public.locations for select to authenticated using(true);
create policy master_manage_locations on public.locations for all to authenticated using(public.is_manager()) with check(public.is_manager());
create policy products_read on public.products for select to authenticated using(true);
create policy products_manage on public.products for all to authenticated using(public.is_manager()) with check(public.is_manager());
create policy barcodes_read on public.product_barcodes for select to authenticated using(true);
create policy barcodes_manage on public.product_barcodes for all to authenticated using(public.is_manager()) with check(public.is_manager());
create policy rounds_read on public.count_rounds for select to authenticated using(true);
create policy rounds_manage on public.count_rounds for all to authenticated using(public.is_manager()) with check(public.is_manager());
create policy events_read on public.scan_events for select to authenticated using(true);
create policy totals_read on public.scan_totals for select to authenticated using(true);
create policy unknown_read on public.unknown_barcodes for select to authenticated using(true);
create policy unknown_manage on public.unknown_barcodes for update to authenticated using(public.is_manager()) with check(public.is_manager());
create policy audit_manager_read on public.audit_logs for select to authenticated using(public.is_manager());

-- Functions are the only write path for scan events/totals
revoke all on function public.record_scan(uuid,uuid,public.stock_condition,text,integer,uuid,text) from public;
grant execute on function public.record_scan(uuid,uuid,public.stock_condition,text,integer,uuid,text) to authenticated;
revoke all on function public.undo_scan(uuid,text,uuid) from public;
grant execute on function public.undo_scan(uuid,text,uuid) to authenticated;
grant execute on function public.set_round_status(uuid,public.round_status) to authenticated;

-- Realtime totals
alter publication supabase_realtime add table public.scan_totals;

-- Starter master data
insert into public.warehouses(code,name) values ('MAIN','คลังหลัก') on conflict do nothing;
insert into public.locations(warehouse_id,code,name)
select id,'A-01','ชั้น A-01' from public.warehouses where code='MAIN' on conflict do nothing;
insert into public.locations(warehouse_id,code,name)
select id,'A-02','ชั้น A-02' from public.warehouses where code='MAIN' on conflict do nothing;
