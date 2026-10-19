-- Local, reviewable schema change. Not applied remotely. Generate its migration
-- with the Supabase CLI only when a separate release is authorized.
begin;
create table private.bakery_push_config (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  public_key text
);
insert into private.bakery_push_config(singleton) values(true);
create table private.bakery_push_devices (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  endpoint_hash bytea not null unique,
  secret_hash bytea not null,
  keys jsonb not null,
  application_key text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table private.bakery_push_bindings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references private.bakery_push_devices(id) on delete cascade,
  audience text not null check(audience in('owner','customer')),
  order_id uuid references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz,
  check((audience='owner' and user_id is not null and order_id is null) or (audience='customer' and order_id is not null and user_id is null))
);
create unique index bakery_push_customer_binding on private.bakery_push_bindings(device_id,order_id) where audience='customer';
create unique index bakery_push_owner_binding on private.bakery_push_bindings(device_id,user_id) where audience='owner';
create table private.bakery_push_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check(kind in('owner_new_order','customer_approved')),
  created_at timestamptz not null default now(),
  unique(order_id,kind)
);
create table private.bakery_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references private.bakery_push_events(id) on delete cascade,
  binding_id uuid not null references private.bakery_push_bindings(id) on delete cascade,
  status text not null default 'pending' check(status in('pending','processing','sent','skipped','failed')),
  attempts integer not null default 0,
  next_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  expires_at timestamptz not null,
  last_code integer,
  sent_at timestamptz,
  unique(event_id,binding_id)
);
create index bakery_push_due on private.bakery_push_deliveries(next_at) where status in('pending','processing');
alter table private.bakery_push_config enable row level security;
alter table private.bakery_push_devices enable row level security;
alter table private.bakery_push_bindings enable row level security;
alter table private.bakery_push_events enable row level security;
alter table private.bakery_push_deliveries enable row level security;
revoke all on private.bakery_push_config,private.bakery_push_devices,private.bakery_push_bindings,private.bakery_push_events,private.bakery_push_deliveries from public,anon,authenticated,service_role;
grant usage on schema private to service_role;

create function private.bakery_push_endpoint_valid(p_endpoint text) returns boolean
language sql immutable security invoker set search_path='' as $$
select coalesce(length(p_endpoint) between 30 and 2048 and p_endpoint ~ '^https://(fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|([a-z0-9-]+[.])*notify[.]windows[.]com)/[A-Za-z0-9_~%!$&''()*+,;=:@/?-]+$',false);
$$;
create function private.bakery_push_eligible(p_binding uuid,p_event uuid) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from private.bakery_push_bindings b join private.bakery_push_devices d on d.id=b.device_id
  join private.bakery_push_events e on e.id=p_event join public.orders o on o.id=e.order_id
  join private.bakery_push_config c on c.singleton
  where b.id=p_binding and d.active and c.enabled and d.application_key=c.public_key and (b.expires_at is null or b.expires_at>now())
  and ((b.audience='owner' and e.kind='owner_new_order' and o.status='pending_approval'
    and not exists(select 1 from public.order_attention a where a.order_id=o.id)
    and exists(select 1 from public.admin_users a where a.user_id=b.user_id and a.active and a.role in('owner','manager')))
  or (b.audience='customer' and e.kind='customer_approved' and b.order_id=o.id and o.status not in('pending_approval','rejected','cancelled'))));
$$;
create function private.get_bakery_push_config() returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object('enabled',enabled and public_key is not null,'publicKey',case when enabled then public_key else null end) from private.bakery_push_config where singleton;
$$;
create function public.get_bakery_push_config() returns jsonb language sql security invoker set search_path='' as $$select private.get_bakery_push_config();$$;

create function private.register_bakery_push(p_audience text,p_tracking_token text,p_endpoint text,p_keys jsonb,p_device_secret text,p_application_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_device uuid; v_binding uuid; v_config private.bakery_push_config;
begin
  select * into strict v_config from private.bakery_push_config where singleton;
  if not v_config.enabled or p_application_key is distinct from v_config.public_key then raise exception 'PUSH_NOT_CONFIGURED'; end if;
  if p_audience is null or p_audience not in('owner','customer') or p_device_secret is null or p_device_secret !~ '^[a-f0-9]{64}$'
    or not private.bakery_push_endpoint_valid(p_endpoint) or p_keys is null or jsonb_typeof(p_keys)<>'object'
    or coalesce(p_keys->>'p256dh','') !~ '^B[A-Za-z0-9_-]{86}$' or coalesce(p_keys->>'auth','') !~ '^[A-Za-z0-9_-]{22}$' then raise exception 'INVALID_PUSH_SUBSCRIPTION'; end if;
  if p_audience='owner' then
    if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active and a.role in('owner','manager')) then raise exception 'NOT_AUTHORIZED'; end if;
    perform pg_advisory_xact_lock(hashtextextended('bakery-push-owner:'||auth.uid()::text,0));
  else
    if p_tracking_token is null or p_tracking_token !~ '^[a-f0-9]{64}$' then raise exception 'ORDER_NOT_FOUND'; end if;
    select * into v_order from public.orders where tracking_token_hash=extensions.digest(p_tracking_token,'sha256') for update;
    if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  end if;
  insert into private.bakery_push_devices(endpoint,endpoint_hash,secret_hash,keys,application_key)
  values(p_endpoint,extensions.digest(p_endpoint,'sha256'),extensions.digest(p_device_secret,'sha256'),jsonb_build_object('p256dh',p_keys->>'p256dh','auth',p_keys->>'auth'),p_application_key)
  on conflict(endpoint_hash) do update set keys=excluded.keys,active=true,application_key=excluded.application_key,updated_at=now()
    where private.bakery_push_devices.secret_hash=excluded.secret_hash
  returning id into v_device;
  if v_device is null then raise exception 'PUSH_DEVICE_CONFLICT'; end if;
  select id into v_binding from private.bakery_push_bindings where device_id=v_device and audience=p_audience
    and ((p_audience='owner' and user_id=auth.uid()) or (p_audience='customer' and order_id=v_order.id));
  if v_binding is null then
    if (select count(*) from private.bakery_push_bindings b join private.bakery_push_devices d on d.id=b.device_id where d.active and d.application_key=v_config.public_key and b.audience=p_audience and (b.expires_at is null or b.expires_at>now()) and ((p_audience='owner' and b.user_id=auth.uid()) or (p_audience='customer' and b.order_id=v_order.id)))>=5 then raise exception 'PUSH_DEVICE_LIMIT'; end if;
    insert into private.bakery_push_bindings(device_id,audience,order_id,user_id,expires_at) values(v_device,p_audience,case when p_audience='customer' then v_order.id end,case when p_audience='owner' then auth.uid() end,case when p_audience='customer' then greatest(now()+interval '2 days',coalesce(v_order.requested_pickup_at,now())+interval '2 days') end) returning id into v_binding;
  else
    update private.bakery_push_bindings set expires_at=case when p_audience='customer' then greatest(now()+interval '2 days',coalesce(v_order.requested_pickup_at,now())+interval '2 days') end where id=v_binding;
  end if;
  -- Catch up when permission is granted just after approval. The locked order row
  -- serializes registration with the status transaction; a unique delivery dedupes retries.
  if p_audience='customer' and v_order.status not in('pending_approval','rejected','cancelled') then
    insert into private.bakery_push_deliveries(event_id,binding_id,expires_at)
      select e.id,v_binding,e.created_at+interval '1 day' from private.bakery_push_events e where e.order_id=v_order.id and e.kind='customer_approved' and e.created_at>now()-interval '1 day'
      on conflict(event_id,binding_id) do nothing;
  elsif p_audience='owner' then
    insert into private.bakery_push_deliveries(event_id,binding_id,expires_at)
      select e.id,v_binding,e.created_at+interval '10 minutes' from private.bakery_push_events e
      where e.kind='owner_new_order' and e.created_at>now()-interval '10 minutes' and private.bakery_push_eligible(v_binding,e.id)
      on conflict(event_id,binding_id) do nothing;
  end if;
  return jsonb_build_object('bindingId',v_binding,'orderId',v_order.id,'enabled',true);
end;$$;
create function public.register_bakery_push(p_audience text,p_tracking_token text,p_endpoint text,p_keys jsonb,p_device_secret text,p_application_key text) returns jsonb
language sql security invoker set search_path='' as $$select private.register_bakery_push(p_audience,p_tracking_token,p_endpoint,p_keys,p_device_secret,p_application_key);$$;

create function private.get_bakery_push_binding(p_audience text,p_tracking_token text,p_endpoint text,p_device_secret text) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from private.bakery_push_bindings b join private.bakery_push_devices d on d.id=b.device_id join private.bakery_push_config c on c.singleton
  where d.endpoint_hash=extensions.digest(p_endpoint,'sha256') and d.secret_hash=extensions.digest(p_device_secret,'sha256') and d.active and c.enabled and d.application_key=c.public_key
  and b.audience=p_audience and (b.expires_at is null or b.expires_at>now())
  and ((b.audience='owner' and b.user_id=auth.uid() and exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active and a.role in('owner','manager')))
  or(b.audience='customer' and exists(select 1 from public.orders o where o.id=b.order_id and p_tracking_token ~ '^[a-f0-9]{64}$' and o.tracking_token_hash=extensions.digest(p_tracking_token,'sha256')))));
$$;
create function public.get_bakery_push_binding(p_audience text,p_tracking_token text,p_endpoint text,p_device_secret text) returns boolean
language sql security invoker set search_path='' as $$select private.get_bakery_push_binding(p_audience,p_tracking_token,p_endpoint,p_device_secret);$$;
create function private.remove_bakery_push(p_audience text,p_tracking_token text,p_endpoint text,p_device_secret text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  delete from private.bakery_push_bindings b using private.bakery_push_devices d where b.device_id=d.id and d.endpoint_hash=extensions.digest(p_endpoint,'sha256') and d.secret_hash=extensions.digest(p_device_secret,'sha256')
    and b.audience=p_audience and ((p_audience='owner' and b.user_id=auth.uid()) or (p_audience='customer' and exists(select 1 from public.orders o where o.id=b.order_id and p_tracking_token ~ '^[a-f0-9]{64}$' and o.tracking_token_hash=extensions.digest(p_tracking_token,'sha256'))));
  return true;
end;$$;
create function public.remove_bakery_push(p_audience text,p_tracking_token text,p_endpoint text,p_device_secret text) returns boolean
language sql security invoker set search_path='' as $$select private.remove_bakery_push(p_audience,p_tracking_token,p_endpoint,p_device_secret);$$;

create function private.retire_bakery_push_device(p_endpoint text,p_device_secret text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  update private.bakery_push_devices set active=false where endpoint_hash=extensions.digest(p_endpoint,'sha256') and secret_hash=extensions.digest(p_device_secret,'sha256');
  return found;
end;$$;
create function public.retire_bakery_push_device(p_endpoint text,p_device_secret text) returns boolean
language sql security invoker set search_path='' as $$select private.retire_bakery_push_device(p_endpoint,p_device_secret);$$;
create function private.clear_bakery_owner_push() returns integer
language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active and a.role in('owner','manager')) then raise exception 'NOT_AUTHORIZED'; end if;
  delete from private.bakery_push_bindings where audience='owner' and user_id=auth.uid();
  get diagnostics v_count=row_count;
  return v_count;
end;$$;
create function public.clear_bakery_owner_push() returns integer language sql security invoker set search_path='' as $$select private.clear_bakery_owner_push();$$;

create function private.enqueue_bakery_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_kind text; v_event uuid;
begin
  v_kind=case when new.to_status='pending_approval' and new.from_status is null then 'owner_new_order' when new.to_status='approved' then 'customer_approved' end;
  if v_kind is null then return new; end if;
  insert into private.bakery_push_events(order_id,kind) values(new.order_id,v_kind) on conflict(order_id,kind) do nothing returning id into v_event;
  if v_event is null then return new; end if;
  insert into private.bakery_push_deliveries(event_id,binding_id,expires_at)
    select v_event,b.id,now()+case when v_kind='owner_new_order' then interval '10 minutes' else interval '1 day' end
    from private.bakery_push_bindings b where private.bakery_push_eligible(b.id,v_event) on conflict(event_id,binding_id) do nothing;
  return new;
end;$$;
create trigger bakery_push_order_event after insert on public.order_status_history for each row execute function private.enqueue_bakery_push();

create function private.claim_bakery_push(p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb;
begin
  update private.bakery_push_deliveries j set status='skipped',lease_token=null,lease_until=null
    where j.status in('pending','processing') and (j.status='pending' or j.lease_until<=now()) and (j.expires_at<=now() or not private.bakery_push_eligible(j.binding_id,j.event_id));
  update private.bakery_push_deliveries set status='failed',lease_token=null,lease_until=null where status in('pending','processing') and attempts>=5 and (status='pending' or lease_until<=now());
  with due as(select id from private.bakery_push_deliveries where attempts<5 and next_at<=now() and (status='pending' or (status='processing' and lease_until<=now())) order by next_at,id for update skip locked limit least(greatest(coalesce(p_limit,20),1),50)),
    claimed as(update private.bakery_push_deliveries j set status='processing',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes' from due where j.id=due.id returning j.*)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'leaseToken',lease_token,'attempts',attempts)),'[]'::jsonb) into v_result from claimed;
  return v_result;
end;$$;
create function public.claim_bakery_push(p_limit integer default 20) returns jsonb language sql security invoker set search_path='' as $$select private.claim_bakery_push(p_limit);$$;
create function private.prepare_bakery_push(p_id uuid,p_lease_token uuid) returns jsonb
language sql security definer set search_path='' as $$
select jsonb_build_object('subscription',jsonb_build_object('endpoint',d.endpoint,'keys',d.keys),'payload',jsonb_build_object('version',1,'eventId',e.id,'orderId',e.order_id,'kind',e.kind),'ttl',case when e.kind='owner_new_order' then 300 else 3600 end)
from private.bakery_push_deliveries j join private.bakery_push_bindings b on b.id=j.binding_id join private.bakery_push_devices d on d.id=b.device_id join private.bakery_push_events e on e.id=j.event_id
where j.id=p_id and j.status='processing' and j.lease_token=p_lease_token and j.lease_until>now() and j.expires_at>now() and private.bakery_push_eligible(j.binding_id,j.event_id);
$$;
create function public.prepare_bakery_push(p_id uuid,p_lease_token uuid) returns jsonb language sql security invoker set search_path='' as $$select private.prepare_bakery_push(p_id,p_lease_token);$$;
create function private.finish_bakery_push(p_id uuid,p_lease_token uuid,p_code integer,p_retry_seconds integer default 0) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_job private.bakery_push_deliveries; v_status text;
begin
  select * into v_job from private.bakery_push_deliveries where id=p_id and status='processing' and lease_token=p_lease_token and lease_until>now() for update;
  if not found then return false; end if;
  if p_code in(404,410) then update private.bakery_push_devices d set active=false where d.id=(select device_id from private.bakery_push_bindings where id=v_job.binding_id); end if;
  v_status=case when p_code between 200 and 299 then 'sent' when p_code=0 then 'skipped' when (p_code=429 or p_code>=500 or p_code=-1) and v_job.attempts<5 then 'pending' else 'failed' end;
  update private.bakery_push_deliveries set status=v_status,last_code=p_code,sent_at=case when v_status='sent' then now() end,next_at=now()+make_interval(secs=>least(3600,greatest(5,coalesce(p_retry_seconds,0),power(2,v_job.attempts)::integer*5))),lease_token=null,lease_until=null where id=p_id;
  return true;
end;$$;
create function public.finish_bakery_push(p_id uuid,p_lease_token uuid,p_code integer,p_retry_seconds integer default 0) returns boolean language sql security invoker set search_path='' as $$select private.finish_bakery_push(p_id,p_lease_token,p_code,p_retry_seconds);$$;

-- Privilege assignment is explicit; private implementation functions have no
-- default PUBLIC execute. No browser can claim a job or read a subscription.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','private') and p.proname in('bakery_push_endpoint_valid','bakery_push_eligible','enqueue_bakery_push','get_bakery_push_config','register_bakery_push','get_bakery_push_binding','remove_bakery_push','retire_bakery_push_device','clear_bakery_owner_push','claim_bakery_push','prepare_bakery_push','finish_bakery_push') loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
    if r.proname in('get_bakery_push_config','register_bakery_push','get_bakery_push_binding','remove_bakery_push','retire_bakery_push_device') then execute format('grant execute on function %s to anon,authenticated',r.signature); end if;
    if r.proname='clear_bakery_owner_push' then execute format('grant execute on function %s to authenticated',r.signature); end if;
    if r.proname in('get_bakery_push_config','claim_bakery_push','prepare_bakery_push','finish_bakery_push') then execute format('grant execute on function %s to service_role',r.signature); end if;
  end loop;
end;$$;
commit;
