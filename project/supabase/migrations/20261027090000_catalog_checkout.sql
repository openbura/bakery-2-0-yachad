-- Local implementation for approved catalog pricing, tray quantities and delivery areas.
-- Not applied to any remote database.
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
  v_priced_options jsonb;
  v_tray_mode text;
  v_mix_count integer;
  v_single_count integer;
  v_pizza_mode text;
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

    -- Multiplicity is meaningful only for tray filling quantities and up to two toast sauces.
    if exists (
      select 1 from unnest(v_selected_ids) selected(id)
      join public.product_options o on o.id=selected.id
      join public.product_option_groups g on g.id=o.group_id
      group by o.id,g.code having count(*)>1 and not (
        (v_product.id='catering-mini-sandwiches-12' and g.code='tray-mix')
        or (v_product.id='sandwiches-toasts-06' and g.code='group-05')
      )
    ) then raise exception 'DUPLICATE_OPTION'; end if;
    select count(*) into v_valid_count
      from unnest(v_selected_ids) selected(id)
      join public.product_options o on o.id=selected.id
      join public.product_option_groups g on g.id=o.group_id
      where o.active and g.active and g.product_id=v_product.id;
    if v_valid_count<>cardinality(v_selected_ids) then raise exception 'INVALID_OPTION'; end if;
    if v_product.id='catering-mini-sandwiches-12' then
      select max(o.code) filter(where g.code='tray-mode'),
        count(*) filter(where g.code='tray-mix'),count(*) filter(where g.code='tray-single')
      into v_tray_mode,v_mix_count,v_single_count
      from unnest(v_selected_ids) selected(id)
      join public.product_options o on o.id=selected.id join public.product_option_groups g on g.id=o.group_id;
      if v_tray_mode is null or v_tray_mode not in('mixed','single')
        or (v_tray_mode='mixed' and (v_mix_count<>12 or v_single_count<>0))
        or (v_tray_mode='single' and (v_single_count<>1 or v_mix_count<>0))
        or exists(select 1 from public.product_options o join public.product_option_groups g on g.id=o.group_id
          where o.id=any(v_selected_ids) and (g.code not in('tray-mode','tray-mix','tray-single') or o.price_delta_agorot<>0))
      then raise exception 'INVALID_OPTION_SELECTION'; end if;
    end if;
    if v_product.id='wolt-5fa974bd69c1de71557e4082' then
      select max(o.code) into v_pizza_mode from public.product_options o
        join public.product_option_groups g on g.id=o.group_id
        where o.id=any(v_selected_ids) and g.code='pizza-mode';
      if v_pizza_mode is null or v_pizza_mode not in('plain','whole','halves') then raise exception 'INVALID_OPTION_SELECTION'; end if;
    end if;
    for v_group in select * from public.product_option_groups where product_id = v_product.id and active loop
      if v_group.required and v_group.min_select < 1 then raise exception 'PRODUCT_CHOICES_UNAVAILABLE'; end if;
      select count(*) into v_selected_count from unnest(v_selected_ids) selected(id)
        join public.product_options o on o.id=selected.id where o.group_id=v_group.id;
      if v_product.id='wolt-5fa974bd69c1de71557e4082' and (
        (v_group.code='pizza-whole' and v_pizza_mode<>'whole') or
        (v_group.code in('pizza-right','pizza-left') and v_pizza_mode<>'halves')
      ) then
        if v_selected_count<>0 then raise exception 'INVALID_OPTION_SELECTION'; end if;
        continue;
      end if;
      if v_selected_count < v_group.min_select or (v_group.max_select is not null and v_selected_count > v_group.max_select) then
        raise exception 'INVALID_OPTION_SELECTION';
      end if;
    end loop;


    -- Price once and use the same immutable option snapshots for the order.
    with picked as (
      select o.id,o.group_id,g.code,g.name_he group_name,o.name_he,o.price_delta_agorot,selected.position,
        row_number() over(partition by g.id order by selected.position) group_position,
        row_number() over(partition by g.id order by o.price_delta_agorot desc,selected.position) premium_position
      from unnest(v_selected_ids) with ordinality selected(id,position)
      join public.product_options o on o.id=selected.id join public.product_option_groups g on g.id=o.group_id
    ), priced as (
      select *,case
        when v_product.id in('pizza-sambusak-01','pizza-sambusak-02','pizza-sambusak-03') and code in('included-topping','group-01')
          then case when group_position=1 then 0 else 500 end
        when v_product.id='salads-01' and code='group-02' then case when group_position<=2 then 0 else 200 end
        when v_product.id='salads-01' and code='group-03' then case when group_position=1 then 0 else 700 end
        when v_product.id='sandwiches-toasts-06' and code='group-04' then case when premium_position=1 then 0 else price_delta_agorot end
        else price_delta_agorot end charged_price from picked
    ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'group_id',group_id,'group_name',group_name,
      'name',name_he,'price',charged_price,'position',position) order by position),'[]'::jsonb)
      into v_priced_options from priced;
    select v_product.price_agorot+coalesce(sum((value->>'price')::integer),0) into v_unit_total
      from jsonb_array_elements(v_priced_options);
    if v_unit_total::bigint * v_quantity + v_subtotal::bigint > 2147483647 then raise exception 'TOTAL_TOO_LARGE'; end if;
    insert into public.order_items(order_id, product_id, product_name_he, quantity, unit_base_price_agorot, unit_total_agorot, line_total_agorot)
      values(v_order.id, v_product.id, v_product.name_he, v_quantity, v_product.price_agorot, v_unit_total, v_unit_total * v_quantity)
      returning id into v_item_id;
    insert into public.order_item_options(order_item_id, group_id, option_id, group_name_he, option_name_he, price_delta_agorot, sort_order)
      select v_item_id,(value->>'group_id')::uuid,(value->>'id')::uuid,value->>'group_name',value->>'name',
        (value->>'price')::integer,(value->>'position')::integer from jsonb_array_elements(v_priced_options);
    v_subtotal := v_subtotal + v_unit_total * v_quantity;
  end loop;

  if p_fulfillment_type = 'delivery' and v_subtotal < v_settings.minimum_delivery_subtotal_agorot then
    raise exception 'DELIVERY_MINIMUM_NOT_MET';
  end if;
  v_fee := case when p_fulfillment_type='pickup' then v_settings.pickup_fee_agorot
    when p_delivery_address->>'city_id'='kfar-saba' then 2000 else 3000 end;
  if v_subtotal::bigint + v_fee > 2147483647 then raise exception 'TOTAL_TOO_LARGE'; end if;
  if v_subtotal + v_fee <> p_expected_total_agorot then raise exception 'PRICE_CHANGED'; end if;
  update public.orders set subtotal_agorot = v_subtotal, fulfillment_fee_agorot = v_fee, total_agorot = v_subtotal + v_fee
    where id = v_order.id returning * into v_order;
  insert into public.order_status_history(order_id, from_status, to_status, actor_type)
    values(v_order.id, null, 'pending_approval', 'customer');
  return query select v_order.order_number, p_tracking_token;
end;
$$;

