-- Restored from the existing September order implementation; hardened locally
-- on 19 October. Not applied to a remote database. No payment provider enabled.
begin;

create table public.fulfillment_hours (
  service_type text not null check (service_type in ('pickup', 'delivery')),
  iso_weekday smallint not null check (iso_weekday between 1 and 7),
  opens_at time not null,
  closes_at time not null,
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 15 and 120),
  default_capacity integer not null default 8 check (default_capacity between 1 and 200),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (service_type, iso_weekday),
  check (closes_at > opens_at)
);

insert into public.fulfillment_hours (service_type, iso_weekday, opens_at, closes_at, default_capacity, enabled)
select service_type, iso_weekday, opens_at, closes_at,
       case when service_type = 'pickup' then 8 else 6 end,
       iso_weekday <> 6
from (values
  (1, time '05:00', time '21:00'),
  (2, time '05:00', time '21:00'),
  (3, time '05:00', time '21:00'),
  (4, time '05:00', time '21:00'),
  (5, time '05:00', time '16:00'),
  (6, time '05:00', time '16:00'),
  (7, time '05:00', time '21:00')
) as hours(iso_weekday, opens_at, closes_at)
cross join (values ('pickup'), ('delivery')) as services(service_type);

create table public.fulfillment_slot_overrides (
  id uuid primary key default gen_random_uuid(),
  service_type text not null check (service_type in ('pickup', 'delivery')),
  starts_at timestamptz not null,
  enabled boolean not null default true,
  capacity integer check (capacity between 1 and 200),
  updated_at timestamptz not null default now(),
  unique (service_type, starts_at)
);

create sequence public.bakery_order_number_seq start 1001;
revoke all on sequence public.bakery_order_number_seq from public, anon, authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint not null unique default nextval('public.bakery_order_number_seq'),
  idempotency_key uuid not null unique,
  request_fingerprint bytea not null,
  tracking_token_hash bytea not null unique,
  status text not null default 'pending_approval' check (status in (
    'pending_approval', 'approved', 'preparing', 'ready_for_pickup',
    'out_for_delivery', 'completed', 'rejected', 'cancelled'
  )),
  payment_status text not null default 'not_configured' check (payment_status in (
    'not_configured', 'authorization_pending', 'authorized', 'capture_pending',
    'captured', 'void_pending', 'voided', 'failed', 'expired', 'refunded'
  )),
  fulfillment_type text not null check (fulfillment_type in ('pickup', 'delivery')),
  requested_pickup_at timestamptz,
  promised_by timestamptz,
  customer_name text not null check (length(btrim(customer_name)) between 2 and 100),
  phone_e164 text not null check (phone_e164 ~ '^972[0-9]{8,9}$'),
  delivery_address jsonb,
  customer_notes text not null default '' check (length(customer_notes) <= 1000),
  subtotal_agorot integer not null check (subtotal_agorot >= 0),
  fulfillment_fee_agorot integer not null check (fulfillment_fee_agorot >= 0),
  total_agorot integer not null check (total_agorot = subtotal_agorot + fulfillment_fee_agorot),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  check ((fulfillment_type = 'pickup' and requested_pickup_at is not null and promised_by is null)
      or (fulfillment_type = 'delivery' and requested_pickup_at is null and promised_by is null)),
  check (delivery_address is null or jsonb_typeof(delivery_address) = 'object')
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on update cascade on delete set null,
  product_name_he text not null,
  quantity integer not null check (quantity between 1 and 999),
  unit_base_price_agorot integer not null check (unit_base_price_agorot >= 0),
  unit_total_agorot integer not null check (unit_total_agorot >= 0),
  line_total_agorot integer not null check (line_total_agorot = unit_total_agorot * quantity),
  created_at timestamptz not null default now()
);

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  group_id uuid references public.product_option_groups(id) on delete set null,
  option_id uuid references public.product_options(id) on delete set null,
  group_name_he text not null,
  option_name_he text not null,
  price_delta_agorot integer not null check (price_delta_agorot >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null check (actor_type in ('customer', 'admin', 'system')),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);
create index orders_pickup_slot_idx on public.orders (requested_pickup_at) where fulfillment_type = 'pickup';
create index order_items_order_id_idx on public.order_items (order_id);
create index order_item_options_item_id_idx on public.order_item_options (order_item_id);
create index order_status_history_order_id_idx on public.order_status_history (order_id, created_at);

create trigger fulfillment_hours_set_updated_at before update on public.fulfillment_hours
for each row execute function private.set_updated_at();
create trigger fulfillment_slot_overrides_set_updated_at before update on public.fulfillment_slot_overrides
for each row execute function private.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function private.set_updated_at();

alter table public.fulfillment_hours enable row level security;
alter table public.fulfillment_slot_overrides enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.order_status_history enable row level security;

revoke all on table public.fulfillment_hours, public.fulfillment_slot_overrides,
  public.orders, public.order_items, public.order_item_options, public.order_status_history
from public, anon, authenticated;

grant select, update on table public.fulfillment_hours to authenticated;
grant select, insert, update, delete on table public.fulfillment_slot_overrides to authenticated;
grant select on table public.orders, public.order_items, public.order_item_options, public.order_status_history to authenticated;

create policy "bakery admins manage fulfillment hours" on public.fulfillment_hours
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));

create policy "bakery admins manage slot overrides" on public.fulfillment_slot_overrides
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')))
with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));

create policy "bakery admins read orders" on public.orders for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));
create policy "bakery admins read order items" on public.order_items for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));
create policy "bakery admins read order item options" on public.order_item_options for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));
create policy "bakery admins read order history" on public.order_status_history for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()) and a.active and a.role in ('owner','manager')));

create or replace function private.get_bakery_pickup_slots(p_days integer default 14)
returns table(starts_at timestamptz, remaining_capacity integer)
language sql
security definer
set search_path = ''
as $$
  with dates as (
    select generate_series(
      (now() at time zone 'Asia/Jerusalem')::date,
      (now() at time zone 'Asia/Jerusalem')::date + least(greatest(p_days, 1), 30),
      interval '1 day'
    )::date as local_date
  ), generated as (
    select (slot_local at time zone 'Asia/Jerusalem') as slot_start, h.default_capacity
    from dates d
    join public.fulfillment_hours h
      on h.service_type = 'pickup'
     and h.iso_weekday = extract(isodow from d.local_date)::smallint
     and h.enabled
    cross join lateral generate_series(
      d.local_date + h.opens_at,
      d.local_date + h.closes_at - make_interval(mins => h.slot_interval_minutes),
      make_interval(mins => h.slot_interval_minutes)
    ) slot_local
  ), availability as (
    select g.slot_start,
           coalesce(o.enabled, true) as slot_enabled,
           coalesce(o.capacity, g.default_capacity) as slot_capacity,
           (select count(*)::integer from public.orders ord
             where ord.fulfillment_type = 'pickup'
               and ord.requested_pickup_at = g.slot_start
               and ord.status not in ('rejected','cancelled','completed')) as reserved
    from generated g
    left join public.fulfillment_slot_overrides o
      on o.service_type = 'pickup' and o.starts_at = g.slot_start
  )
  select slot_start, greatest(slot_capacity - reserved, 0)
  from availability
  where slot_enabled
    and slot_start >= now() + interval '60 minutes'
    and reserved < slot_capacity
  order by slot_start;
$$;

create or replace function private.create_bakery_order(
  p_idempotency_key uuid,
  p_tracking_token text,
  p_fulfillment_type text,
  p_requested_pickup_at timestamptz,
  p_customer_name text,
  p_phone text,
  p_delivery_address jsonb,
  p_customer_notes text,
  p_items jsonb,
  p_expected_total_agorot integer
)
returns table(order_number bigint, tracking_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_fingerprint bytea;
  v_tracking_hash bytea;
  v_phone text;
  v_existing public.orders%rowtype;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_quantity integer;
  v_selected_ids uuid[];
  v_selected_count integer;
  v_valid_count integer;
  v_unit_total integer;
  v_item_id uuid;
  v_subtotal integer := 0;
  v_fee integer;
  v_settings public.store_settings%rowtype;
  v_hours public.fulfillment_hours%rowtype;
  v_override public.fulfillment_slot_overrides%rowtype;
  v_capacity integer;
  v_reserved integer;
  v_local_start timestamp;
  v_group record;
begin
  if p_idempotency_key is null then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  if p_tracking_token is null or p_tracking_token !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_TRACKING_TOKEN'; end if;
  if p_fulfillment_type is null or p_fulfillment_type not in ('pickup','delivery') then raise exception 'INVALID_FULFILLMENT'; end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_ITEMS'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 200 then
    raise exception 'INVALID_ITEMS';
  end if;
  if p_expected_total_agorot is null or p_expected_total_agorot < 0 then raise exception 'INVALID_EXPECTED_TOTAL'; end if;

  v_phone := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  if v_phone ~ '^0' then v_phone := '972' || substring(v_phone from 2); end if;
  if coalesce(p_phone,'') ~ '[^0-9+(). -]' or v_phone !~ '^972(5[0-9]{8}|7[0-9]{8}|[23489][0-9]{7})$' then raise exception 'INVALID_PHONE'; end if;
  if length(btrim(coalesce(p_customer_name,''))) not between 2 and 100 then raise exception 'INVALID_CUSTOMER_NAME'; end if;
  if length(coalesce(p_customer_notes,'')) > 1000 then raise exception 'NOTES_TOO_LONG'; end if;

  v_tracking_hash := extensions.digest(p_tracking_token, 'sha256');
  v_fingerprint := extensions.digest(convert_to(jsonb_build_object(
    'fulfillment', p_fulfillment_type, 'pickup_at', p_requested_pickup_at,
    'name', btrim(p_customer_name), 'phone', v_phone,
    'address', p_delivery_address, 'notes', coalesce(p_customer_notes,''), 'items', p_items,
    'expected_total', p_expected_total_agorot
  )::text, 'utf8'), 'sha256');

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('idempotency:' || p_idempotency_key::text, 0));
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> v_fingerprint or v_existing.tracking_token_hash <> v_tracking_hash then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_existing.order_number, p_tracking_token;
    return;
  end if;

  select * into strict v_settings from public.store_settings where id = 'default' for share;
  if not v_settings.ordering_enabled then raise exception 'ORDERING_CLOSED'; end if;
  if p_fulfillment_type = 'pickup' and not v_settings.pickup_enabled then raise exception 'PICKUP_CLOSED'; end if;
  if p_fulfillment_type = 'delivery' and not v_settings.delivery_enabled then raise exception 'DELIVERY_CLOSED'; end if;

  -- Replay above remains possible after closure; new requests are bounded per phone.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('phone:' || v_phone, 0));
  if (select count(*) from public.orders where phone_e164 = v_phone and created_at > v_now - interval '10 minutes') >= 5 then
    raise exception 'TOO_MANY_ORDERS';
  end if;

  if p_fulfillment_type = 'pickup' then
    if p_requested_pickup_at is null or p_requested_pickup_at < v_now + interval '60 minutes' or p_requested_pickup_at > v_now + interval '30 days' then
      raise exception 'INVALID_PICKUP_TIME';
    end if;
    v_local_start := p_requested_pickup_at at time zone 'Asia/Jerusalem';
    select * into v_hours from public.fulfillment_hours
      where service_type = 'pickup' and iso_weekday = extract(isodow from v_local_start)::smallint;
    if not found or not v_hours.enabled
       or v_local_start::time < v_hours.opens_at or v_local_start::time >= v_hours.closes_at
       or mod(extract(epoch from (v_local_start - (v_local_start::date + v_hours.opens_at)))::numeric, v_hours.slot_interval_minutes * 60) <> 0
       or v_local_start + make_interval(mins => v_hours.slot_interval_minutes) > v_local_start::date + v_hours.closes_at then
      raise exception 'INVALID_PICKUP_TIME';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pickup:' || p_requested_pickup_at::text, 0));
    select * into v_override from public.fulfillment_slot_overrides
      where service_type = 'pickup' and starts_at = p_requested_pickup_at;
    if found and not v_override.enabled then raise exception 'PICKUP_SLOT_BLOCKED'; end if;
    v_capacity := coalesce(v_override.capacity, v_hours.default_capacity);
    select count(*)::integer into v_reserved from public.orders
      where fulfillment_type = 'pickup' and requested_pickup_at = p_requested_pickup_at
        and status not in ('rejected','cancelled','completed');
    if v_reserved >= v_capacity then raise exception 'PICKUP_SLOT_FULL'; end if;
  else
    if p_requested_pickup_at is not null then raise exception 'DELIVERY_HAS_PICKUP_TIME'; end if;
    if p_delivery_address is null
       or jsonb_typeof(p_delivery_address) is distinct from 'object'
       or coalesce(p_delivery_address->>'city_id','') not in ('kfar-saba','hod-hasharon','raanana','other')
       or (p_delivery_address->>'city_id' = 'other' and length(btrim(coalesce(p_delivery_address->>'city',''))) not between 2 and 100)
       or coalesce(p_delivery_address->>'residence_type','') not in ('building','private-house')
       or (p_delivery_address->>'residence_type' = 'building' and (length(btrim(coalesce(p_delivery_address->>'floor',''))) < 1 or length(btrim(coalesce(p_delivery_address->>'apartment',''))) < 1))
       or length(btrim(coalesce(p_delivery_address->>'street',''))) < 2
       or length(btrim(coalesce(p_delivery_address->>'house_number',''))) < 1
       or octet_length(p_delivery_address::text) > 4000 then
      raise exception 'INVALID_DELIVERY_ADDRESS';
    end if;
    select * into v_hours from public.fulfillment_hours where service_type = 'delivery'
      and iso_weekday = extract(isodow from (v_now at time zone 'Asia/Jerusalem'))::smallint for share;
    if not found or not v_hours.enabled or (v_now at time zone 'Asia/Jerusalem')::time < v_hours.opens_at
      or (v_now at time zone 'Asia/Jerusalem')::time >= v_hours.closes_at then raise exception 'DELIVERY_HOURS_CLOSED'; end if;
  end if;

  insert into public.orders (
    idempotency_key, request_fingerprint, tracking_token_hash, fulfillment_type,
    requested_pickup_at, promised_by, customer_name, phone_e164, delivery_address,
    customer_notes, subtotal_agorot, fulfillment_fee_agorot, total_agorot
  ) values (
    p_idempotency_key, v_fingerprint, v_tracking_hash, p_fulfillment_type,
    case when p_fulfillment_type = 'pickup' then p_requested_pickup_at end,
    null,
    btrim(p_customer_name), v_phone,
    case when p_fulfillment_type = 'delivery' then
      (p_delivery_address - 'floor' - 'apartment' - 'entrance') || case when p_delivery_address->>'residence_type' = 'building'
        then jsonb_build_object('floor',p_delivery_address->>'floor','apartment',p_delivery_address->>'apartment','entrance',coalesce(p_delivery_address->>'entrance','')) else '{}'::jsonb end end,
    btrim(coalesce(p_customer_notes,'')), 0, 0, 0
  ) returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) is distinct from 'object' or jsonb_typeof(v_item->'quantity') is distinct from 'number'
      or coalesce(v_item->>'quantity','') !~ '^[0-9]{1,3}$' then raise exception 'INVALID_QUANTITY'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity not between 1 and 999 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products
      where id = v_item->>'product_id' and active and available_today
        and exists (select 1 from public.categories c where c.id = category_id and c.active)
        and case when p_fulfillment_type = 'pickup' then available_for_pickup else available_for_delivery end for share;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    if not exists (select 1 from public.product_option_groups where product_id = v_product.id and active)
      and (v_product.has_options or v_product.name_he in ('פיצה אישית','פיצה פסטו אישית') or v_product.name_he ~ 'בהרכבה|\+\s*תוספת') then raise exception 'PRODUCT_CHOICES_UNAVAILABLE'; end if;
    if jsonb_typeof(v_item->'option_ids') is distinct from 'array' or jsonb_array_length(v_item->'option_ids') > 100 then raise exception 'INVALID_OPTION'; end if;

    select coalesce(array_agg(value::uuid), array[]::uuid[]) into v_selected_ids
      from jsonb_array_elements_text(coalesce(v_item->'option_ids', '[]'::jsonb));
    if cardinality(v_selected_ids) <> (select count(distinct x) from unnest(v_selected_ids) x) then
      raise exception 'DUPLICATE_OPTION';
    end if;
    select count(*) into v_valid_count
      from public.product_options o join public.product_option_groups g on g.id = o.group_id
      where o.id = any(v_selected_ids) and o.active and g.active and g.product_id = v_product.id;
    if v_valid_count <> cardinality(v_selected_ids) then raise exception 'INVALID_OPTION'; end if;
    for v_group in select * from public.product_option_groups where product_id = v_product.id and active loop
      if v_group.required and v_group.min_select < 1 then raise exception 'PRODUCT_CHOICES_UNAVAILABLE'; end if;
      select count(*) into v_selected_count from public.product_options
        where group_id = v_group.id and id = any(v_selected_ids);
      if v_selected_count < v_group.min_select or (v_group.max_select is not null and v_selected_count > v_group.max_select) then
        raise exception 'INVALID_OPTION_SELECTION';
      end if;
    end loop;

    if v_product.id in ('pizza-sambusak-01','pizza-sambusak-02','pizza-sambusak-03') then
      select v_product.price_agorot
        + greatest(count(*) filter (where g.code in ('included-topping','group-01')) - 1, 0) * 500
        + coalesce(sum(o.price_delta_agorot) filter (where g.code not in ('included-topping','group-01')), 0)
      into v_unit_total
      from public.product_options o join public.product_option_groups g on g.id = o.group_id
      where o.id = any(v_selected_ids);
    else
      select v_product.price_agorot + coalesce(sum(o.price_delta_agorot), 0)
      into v_unit_total from public.product_options o where o.id = any(v_selected_ids);
    end if;
    v_unit_total := coalesce(v_unit_total, v_product.price_agorot);
    if v_unit_total::bigint * v_quantity + v_subtotal::bigint > 2147483647 then raise exception 'TOTAL_TOO_LARGE'; end if;
    insert into public.order_items(order_id, product_id, product_name_he, quantity, unit_base_price_agorot, unit_total_agorot, line_total_agorot)
      values(v_order.id, v_product.id, v_product.name_he, v_quantity, v_product.price_agorot, v_unit_total, v_unit_total * v_quantity)
      returning id into v_item_id;
    insert into public.order_item_options(order_item_id, group_id, option_id, group_name_he, option_name_he, price_delta_agorot, sort_order)
      select v_item_id, g.id, o.id, g.name_he, o.name_he,
        case when v_product.id in ('pizza-sambusak-01','pizza-sambusak-02','pizza-sambusak-03') and g.code in ('included-topping','group-01')
             then case when row_number() over (partition by g.id order by array_position(v_selected_ids, o.id)) = 1 then 0 else 500 end
             else o.price_delta_agorot end,
        array_position(v_selected_ids, o.id)
      from public.product_options o join public.product_option_groups g on g.id = o.group_id
      where o.id = any(v_selected_ids);
    v_subtotal := v_subtotal + v_unit_total * v_quantity;
  end loop;

  if p_fulfillment_type = 'delivery' and v_subtotal < v_settings.minimum_delivery_subtotal_agorot then
    raise exception 'DELIVERY_MINIMUM_NOT_MET';
  end if;
  v_fee := case when p_fulfillment_type = 'delivery' then v_settings.delivery_fee_agorot else v_settings.pickup_fee_agorot end;
  if v_subtotal::bigint + v_fee > 2147483647 then raise exception 'TOTAL_TOO_LARGE'; end if;
  if v_subtotal + v_fee <> p_expected_total_agorot then raise exception 'PRICE_CHANGED'; end if;
  update public.orders set subtotal_agorot = v_subtotal, fulfillment_fee_agorot = v_fee, total_agorot = v_subtotal + v_fee
    where id = v_order.id returning * into v_order;
  insert into public.order_status_history(order_id, from_status, to_status, actor_type)
    values(v_order.id, null, 'pending_approval', 'customer');
  return query select v_order.order_number, p_tracking_token;
end;
$$;

create or replace function private.get_bakery_order_status(p_tracking_token text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'orderId', o.id,
    'orderNumber', o.order_number,
    'status', o.status,
    'paymentStatus', o.payment_status,
    'fulfillmentType', o.fulfillment_type,
    'requestedPickupAt', o.requested_pickup_at,
    'totalAgorot', o.total_agorot,
    'rejectionReason', o.rejection_reason,
    'createdAt', o.created_at,
    'updatedAt', o.updated_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('productName',i.product_name_he,'quantity',i.quantity,'unitTotalAgorot',i.unit_total_agorot,'lineTotalAgorot',i.line_total_agorot,
      'options',coalesce((select jsonb_agg(jsonb_build_object('groupName',x.group_name_he,'optionName',x.option_name_he,'priceDeltaAgorot',x.price_delta_agorot) order by x.sort_order) from public.order_item_options x where x.order_item_id=i.id),'[]'::jsonb)) order by i.created_at,i.id) from public.order_items i where i.order_id=o.id),'[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('status', h.to_status, 'reason', h.reason, 'createdAt', h.created_at) order by h.created_at)
      from public.order_status_history h where h.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where p_tracking_token ~ '^[a-f0-9]{64}$' and o.tracking_token_hash = extensions.digest(p_tracking_token, 'sha256');
$$;

create or replace function private.transition_bakery_order(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_to_status text,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_from text;
begin
  if not exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.active and a.role in ('owner','manager')) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.updated_at is distinct from p_expected_updated_at then raise exception 'ORDER_CHANGED'; end if;
  v_from := v_order.status;
  if p_to_status is null or not (
    (v_from = 'pending_approval' and p_to_status in ('approved','rejected','cancelled')) or
    (v_from = 'approved' and p_to_status in ('preparing','cancelled')) or
    (v_from = 'preparing' and ((v_order.fulfillment_type = 'pickup' and p_to_status = 'ready_for_pickup') or (v_order.fulfillment_type = 'delivery' and p_to_status = 'out_for_delivery') or p_to_status = 'cancelled')) or
    (v_from in ('ready_for_pickup','out_for_delivery') and p_to_status in ('completed','cancelled'))
  ) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if p_to_status in ('rejected','cancelled') and length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'REASON_REQUIRED'; end if;
  update public.orders set
    status = p_to_status,
    rejection_reason = case when p_to_status in ('rejected','cancelled') then btrim(p_reason) else rejection_reason end,
    approved_at = case when p_to_status = 'approved' then now() else approved_at end,
    completed_at = case when p_to_status = 'completed' then now() else completed_at end,
    cancelled_at = case when p_to_status in ('rejected','cancelled') then now() else cancelled_at end
  where id = p_order_id returning * into v_order;
  insert into public.order_status_history(order_id, from_status, to_status, actor_type, actor_user_id, reason)
    values(p_order_id, v_from, p_to_status, 'admin', auth.uid(), nullif(btrim(coalesce(p_reason,'')),''));
  return v_order;
end;
$$;

create or replace function private.get_admin_pickup_slots(p_days integer default 7)
returns table(starts_at timestamptz, capacity integer, reserved integer, enabled boolean)
language sql
security definer
set search_path = ''
as $$
  with guard as (
    select 1 where exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.active and a.role in ('owner','manager'))
  ), dates as (
    select generate_series((now() at time zone 'Asia/Jerusalem')::date,
      (now() at time zone 'Asia/Jerusalem')::date + least(greatest(p_days,1),30), interval '1 day')::date local_date from guard
  ), generated as (
    select (slot_local at time zone 'Asia/Jerusalem') slot_start, h.default_capacity
    from dates d join public.fulfillment_hours h on h.service_type='pickup' and h.iso_weekday=extract(isodow from d.local_date)::smallint and h.enabled
    cross join lateral generate_series(d.local_date+h.opens_at, d.local_date+h.closes_at-make_interval(mins=>h.slot_interval_minutes), make_interval(mins=>h.slot_interval_minutes)) slot_local
  )
  select g.slot_start, coalesce(o.capacity,g.default_capacity),
    (select count(*)::integer from public.orders ord where ord.fulfillment_type='pickup' and ord.requested_pickup_at=g.slot_start and ord.status not in ('rejected','cancelled','completed')),
    coalesce(o.enabled,true)
  from generated g left join public.fulfillment_slot_overrides o on o.service_type='pickup' and o.starts_at=g.slot_start
  where g.slot_start >= now() order by g.slot_start;
$$;

create or replace function public.set_pickup_slot_override(p_starts_at timestamptz, p_enabled boolean, p_capacity integer default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_capacity is not null and p_capacity not between 1 and 200 then raise exception 'INVALID_CAPACITY'; end if;
  if p_starts_at is null or p_enabled is null then raise exception 'INVALID_SLOT'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pickup:' || p_starts_at::text, 0));
  insert into public.fulfillment_slot_overrides(service_type, starts_at, enabled, capacity)
    values('pickup', p_starts_at, p_enabled, p_capacity)
  on conflict(service_type, starts_at) do update set enabled=excluded.enabled, capacity=excluded.capacity;
end;
$$;


-- Keep privileged implementation outside the Data API schema. Public facades are invokers.
grant usage on schema private to anon, authenticated;
revoke all on function private.get_bakery_pickup_slots(integer) from public,anon,authenticated;
grant execute on function private.get_bakery_pickup_slots(integer) to anon, authenticated;
create function public.get_bakery_pickup_slots(p_days integer default 14) returns table(starts_at timestamptz, remaining_capacity integer)
language sql security invoker set search_path = '' as $$ select * from private.get_bakery_pickup_slots(p_days); $$;
revoke all on function private.create_bakery_order(uuid,text,text,timestamptz,text,text,jsonb,text,jsonb,integer) from public,anon,authenticated;
grant execute on function private.create_bakery_order(uuid,text,text,timestamptz,text,text,jsonb,text,jsonb,integer) to anon,authenticated;
create function public.create_bakery_order(p_idempotency_key uuid,p_tracking_token text,p_fulfillment_type text,p_requested_pickup_at timestamptz,p_customer_name text,p_phone text,p_delivery_address jsonb,p_customer_notes text,p_items jsonb,p_expected_total_agorot integer)
returns table(order_number bigint,tracking_token text) language sql security invoker set search_path = '' as $$
select * from private.create_bakery_order(p_idempotency_key,p_tracking_token,p_fulfillment_type,p_requested_pickup_at,p_customer_name,p_phone,p_delivery_address,p_customer_notes,p_items,p_expected_total_agorot); $$;
revoke all on function private.get_bakery_order_status(text) from public,anon,authenticated;
grant execute on function private.get_bakery_order_status(text) to anon,authenticated;
create function public.get_bakery_order_status(p_tracking_token text) returns jsonb language sql security invoker set search_path = '' as $$ select private.get_bakery_order_status(p_tracking_token); $$;
revoke all on function private.transition_bakery_order(uuid,timestamptz,text,text) from public,anon,authenticated;
grant execute on function private.transition_bakery_order(uuid,timestamptz,text,text) to authenticated;
create function public.transition_bakery_order(p_order_id uuid,p_expected_updated_at timestamptz,p_to_status text,p_reason text default null) returns public.orders
language sql security invoker set search_path = '' as $$ select * from private.transition_bakery_order(p_order_id,p_expected_updated_at,p_to_status,p_reason); $$;
revoke all on function private.get_admin_pickup_slots(integer) from public,anon,authenticated;
grant execute on function private.get_admin_pickup_slots(integer) to authenticated;
create function public.get_admin_pickup_slots(p_days integer default 7) returns table(starts_at timestamptz,capacity integer,reserved integer,enabled boolean)
language sql security invoker set search_path = '' as $$ select * from private.get_admin_pickup_slots(p_days); $$;

revoke all on function public.get_bakery_pickup_slots(integer) from public, anon, authenticated;
revoke all on function public.create_bakery_order(uuid,text,text,timestamptz,text,text,jsonb,text,jsonb,integer) from public, anon, authenticated;
revoke all on function public.get_bakery_order_status(text) from public, anon, authenticated;
revoke all on function public.transition_bakery_order(uuid,timestamptz,text,text) from public, anon, authenticated;
revoke all on function public.get_admin_pickup_slots(integer) from public, anon, authenticated;
revoke all on function public.set_pickup_slot_override(timestamptz,boolean,integer) from public, anon, authenticated;
grant execute on function public.get_bakery_pickup_slots(integer) to anon, authenticated;
grant execute on function public.create_bakery_order(uuid,text,text,timestamptz,text,text,jsonb,text,jsonb,integer) to anon, authenticated;
grant execute on function public.get_bakery_order_status(text) to anon, authenticated;
grant execute on function public.transition_bakery_order(uuid,timestamptz,text,text) to authenticated;
grant execute on function public.get_admin_pickup_slots(integer) to authenticated;
grant execute on function public.set_pickup_slot_override(timestamptz,boolean,integer) to authenticated;

comment on table public.orders is 'Customer orders. PII is admin-only; public access is limited to RPCs.';
comment on column public.orders.payment_status is 'Provider-independent payment lifecycle. No payment provider is configured yet.';

commit;
