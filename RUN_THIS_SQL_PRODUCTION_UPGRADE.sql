-- MBC Inventory Production Controls
-- Run after migrations 001-006. Safe to run more than once.

alter table public.profiles
  add column if not exists access_mode text not null default 'edit';

update public.profiles
set access_mode = 'read'
where role = 'viewer' and access_mode <> 'read';

update public.profiles
set access_mode = 'edit'
where access_mode is null or access_mode not in ('read','edit');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_access_mode_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_access_mode_check
      check (access_mode in ('read','edit'));
  end if;
end $$;

create or replace function public.current_access_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select access_mode
  from public.profiles
  where id = auth.uid() and active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid() and active = true),
    false
  )
$$;

create or replace function public.can_edit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' or access_mode = 'edit'
     from public.profiles where id = auth.uid() and active = true),
    false
  )
$$;

-- Keep compatibility with earlier policies/functions that call is_manager().
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_edit()
$$;

create table if not exists public.workspace_states (
  id text primary key default 'main',
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.workspace_states enable row level security;

drop policy if exists workspace_state_read on public.workspace_states;
create policy workspace_state_read
on public.workspace_states for select
to authenticated
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.active));

drop policy if exists workspace_state_write on public.workspace_states;
drop policy if exists workspace_state_insert on public.workspace_states;
drop policy if exists workspace_state_update on public.workspace_states;
create policy workspace_state_insert
on public.workspace_states for insert
to authenticated
with check (public.can_edit());
create policy workspace_state_update
on public.workspace_states for update
to authenticated
using (public.can_edit())
with check (public.can_edit());

alter table public.count_rounds
  add column if not exists baseline_source text not null default 'system',
  add column if not exists baseline_file_name text,
  add column if not exists baseline_imported_at timestamptz,
  add column if not exists baseline_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists notes text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'count_rounds_baseline_source_check'
      and conrelid = 'public.count_rounds'::regclass
  ) then
    alter table public.count_rounds
      add constraint count_rounds_baseline_source_check
      check (baseline_source in ('system','import'));
  end if;
end $$;

create table if not exists public.count_round_baselines (
  round_id uuid not null references public.count_rounds(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  condition public.stock_condition not null,
  system_quantity bigint not null default 0 check (system_quantity >= 0),
  source text not null default 'system' check (source in ('system','import')),
  created_at timestamptz not null default now(),
  primary key (round_id, product_id, location_id, condition)
);

alter table public.count_round_baselines enable row level security;

drop policy if exists round_baselines_read on public.count_round_baselines;
create policy round_baselines_read
on public.count_round_baselines for select
to authenticated
using (true);

drop policy if exists round_baselines_manage on public.count_round_baselines;
create policy round_baselines_manage
on public.count_round_baselines for all
to authenticated
using (public.can_edit())
with check (public.can_edit());

-- Tighten user-profile changes to Admin only while preserving self-read.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read
on public.profiles for select
to authenticated
using (active = true or id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Managers in older migrations now resolve to can_edit(). Admin-only data clearing
-- remains available only through the server API, which verifies the caller first.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workspace_states'
  ) then
    alter publication supabase_realtime add table public.workspace_states;
  end if;
end $$;

create index if not exists workspace_states_updated_at_idx
  on public.workspace_states(updated_at desc);
create index if not exists count_round_baselines_round_idx
  on public.count_round_baselines(round_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,email,full_name,role,access_mode,must_change_password)
 values(
   new.id,
   coalesce(new.email,''),
   coalesce(new.raw_user_meta_data->>'full_name',''),
   coalesce((new.raw_user_meta_data->>'role')::public.app_role,'counter'),
   case when new.raw_user_meta_data->>'access_mode' = 'read' then 'read' else 'edit' end,
   coalesce((new.raw_user_meta_data->>'must_change_password')::boolean,true)
 )
 on conflict (id) do update set
   email = excluded.email,
   full_name = excluded.full_name,
   role = excluded.role,
   access_mode = excluded.access_mode,
   must_change_password = excluded.must_change_password,
   updated_at = now();
 return new;
end $$;

-- Production defaults and permission hardening.
alter table public.count_rounds
  alter column environment set default 'production';

update public.count_rounds
set environment = 'production'
where environment = 'test';

drop policy if exists audit_authenticated_read on public.audit_logs;
create policy audit_authenticated_read
on public.audit_logs for select
to authenticated
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.active));

create or replace function public.record_scan(
 p_round_id uuid,p_location_id uuid,p_condition public.stock_condition,p_barcode text,p_quantity integer,p_client_event_id uuid,p_device_id text default null
) returns table(event_id uuid,sku text,is_unknown boolean)
language plpgsql security definer set search_path=public as $$
declare v_product public.products%rowtype; v_event uuid; v_status public.round_status;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if not public.can_edit() then raise exception 'Read-only permission'; end if;
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
 if v_event is null then select id into v_event from public.scan_events where client_event_id=p_client_event_id; end if;
 return query select v_event,v_product.sku,false;
end $$;

create or replace function public.undo_scan(p_scan_event_id uuid,p_reason text,p_client_event_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v public.scan_events%rowtype; v_id uuid;
begin
 if not public.can_edit() then raise exception 'Read-only permission'; end if;
 select * into v from public.scan_events where id=p_scan_event_id;
 if v.id is null then raise exception 'Scan event not found'; end if;
 if v.quantity_delta <= 0 then raise exception 'Only positive scans can be undone'; end if;
 if not (v.user_id=auth.uid() or public.is_admin()) then raise exception 'Permission denied'; end if;
 if exists(select 1 from public.scan_events where parent_event_id=v.id and event_type='undo') then raise exception 'Already undone'; end if;
 insert into public.scan_events(client_event_id,round_id,product_id,location_id,condition,barcode,quantity_delta,event_type,parent_event_id,reason,user_id)
 values(p_client_event_id,v.round_id,v.product_id,v.location_id,v.condition,v.barcode,-v.quantity_delta,'undo',v.id,p_reason,auth.uid()) returning id into v_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(auth.uid(),'undo_scan','scan_event',v.id::text,jsonb_build_object('reason',p_reason));
 return v_id;
end $$;

drop function if exists public.reset_test_data();

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
  set role='admin', access_mode='edit', active=true, must_change_password=false, updated_at=now()
  where lower(email)=lower(trim(p_email));
  if not found then raise exception 'User not found. Create the Auth user first.'; end if;
end $$;

revoke all on function public.promote_first_admin(text) from public;

-- Append-only scan events are stored separately from workspace master state so the
-- system remains responsive when a round contains tens of thousands of scans.
create table if not exists public.workspace_scan_events (
  id text primary key,
  round_id text not null,
  event jsonb not null,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.workspace_scan_events enable row level security;

drop policy if exists workspace_scan_events_read on public.workspace_scan_events;
create policy workspace_scan_events_read
on public.workspace_scan_events for select
to authenticated
using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.active));

drop policy if exists workspace_scan_events_write on public.workspace_scan_events;
create policy workspace_scan_events_write
on public.workspace_scan_events for insert
to authenticated
with check (public.can_edit());

create index if not exists workspace_scan_events_round_time_idx
  on public.workspace_scan_events(round_id, created_at);

-- Move events left in the older shared JSON row into the append-only table.
insert into public.workspace_scan_events(id, round_id, event, created_at)
select
  events.event_item->>'id',
  coalesce(events.event_item->>'roundId',''),
  events.event_item,
  now() + ((events.ordinal - 1) * interval '1 millisecond')
from public.workspace_states ws
cross join lateral jsonb_array_elements(coalesce(ws.state->'scanEvents','[]'::jsonb))
  with ordinality as events(event_item, ordinal)
where ws.id='main'
  and coalesce(events.event_item->>'id','') <> ''
  and coalesce(events.event_item->>'roundId','') <> ''
on conflict (id) do nothing;

update public.workspace_states
set state = state - 'scanEvents',
    revision = revision + 1,
    updated_at = now()
where id='main' and state ? 'scanEvents';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='workspace_scan_events'
  ) then
    alter publication supabase_realtime add table public.workspace_scan_events;
  end if;
end $$;

notify pgrst, 'reload schema';

-- Atomic optimistic-concurrency save used by the online workspace bridge.
create or replace function public.save_workspace_state(
  p_state jsonb,
  p_base_revision bigint
)
returns table(state jsonb, revision bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.workspace_states%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.can_edit() then raise exception 'Read-only permission'; end if;

  select * into v_current
  from public.workspace_states
  where id = 'main'
  for update;

  if not found then
    if coalesce(p_base_revision, 0) <> 0 then return; end if;
    insert into public.workspace_states as ws(id,state,revision,updated_at,updated_by)
    values('main',coalesce(p_state,'{}'::jsonb),1,v_now,auth.uid())
    returning ws.state,ws.revision,ws.updated_at
    into state,revision,updated_at;
    return next;
    return;
  end if;

  if v_current.revision <> coalesce(p_base_revision,0) then return; end if;

  update public.workspace_states as ws
  set state = coalesce(p_state,'{}'::jsonb),
      revision = v_current.revision + 1,
      updated_at = v_now,
      updated_by = auth.uid()
  where id = 'main'
  returning ws.state,ws.revision,ws.updated_at
  into state,revision,updated_at;

  return next;
end $$;

revoke all on function public.save_workspace_state(jsonb,bigint) from public;
grant execute on function public.save_workspace_state(jsonb,bigint) to authenticated;

insert into public.workspace_states(id,state,revision)
values('main','{}'::jsonb,0)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = auth.uid() and active = true;
  if not found then raise exception 'Active profile not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
  values(auth.uid(),'change_password','profile',auth.uid()::text,'{}'::jsonb);
end $$;

revoke all on function public.complete_password_change() from public;
grant execute on function public.complete_password_change() to authenticated;

notify pgrst, 'reload schema';
