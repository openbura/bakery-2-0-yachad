begin;

do $preflight$
declare
  product_count bigint;
  metadata_count bigint;
  option_group_count bigint;
  option_count bigint;
begin
  select count(*) into product_count from public.products;
  select count(*) into metadata_count from public.product_source_metadata;
  select count(*) into option_group_count from public.product_option_groups;
  select count(*) into option_count from public.product_options;

  -- A clean local reset applies migrations before seed.sql, so an empty catalog
  -- is valid here. A populated database must match the approved Bakery source.
  if product_count = 0 and metadata_count = 0 then
    return;
  end if;

  if product_count <> 78 or metadata_count <> 78 then
    raise exception 'Expected 78 Bakery products and 78 source records, found % and %',
      product_count, metadata_count;
  end if;

  if exists (
    select 1
    from public.product_source_metadata
    where catalog_sha256 <> '240c6d3d00a64c35699caba9c53d0cc9ed142a074c14140c52fe307f24b292dc'
  ) then
    raise exception 'Bakery catalog source hash does not match the approved source';
  end if;

  if (option_group_count, option_count) not in ((0, 0), (2, 24)) then
    raise exception 'Unexpected existing option contract: % groups and % options',
      option_group_count, option_count;
  end if;
end
$preflight$;

update public.products as product
set
  display_price_text = nullif(metadata.source_payload ->> 'display_price_text', ''),
  price_unit_note = nullif(metadata.source_payload ->> 'price_unit_note', '')
from public.product_source_metadata as metadata
where metadata.product_id = product.id
  and (
    product.display_price_text is distinct from nullif(metadata.source_payload ->> 'display_price_text', '')
    or product.price_unit_note is distinct from nullif(metadata.source_payload ->> 'price_unit_note', '')
  );

with source_groups as (
  select
    metadata.product_id,
    option_group.value as group_payload,
    option_group.ordinality::integer as group_order,
    'group-' || lpad(option_group.ordinality::text, 2, '0') as group_code
  from public.product_source_metadata as metadata
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(metadata.source_payload -> 'option_groups') = 'array'
        then metadata.source_payload -> 'option_groups'
      else '[]'::jsonb
    end
  ) with ordinality as option_group(value, ordinality)
)
insert into public.product_option_groups (
  product_id,
  code,
  name_he,
  sort_order,
  required,
  min_select,
  max_select,
  active
)
select
  product_id,
  group_code,
  group_payload ->> 'name',
  group_order,
  coalesce((group_payload ->> 'required')::boolean, false),
  coalesce(
    (group_payload ->> 'min')::integer,
    case when coalesce((group_payload ->> 'required')::boolean, false) then 1 else 0 end
  ),
  case
    when jsonb_typeof(group_payload -> 'max') = 'number'
      then (group_payload ->> 'max')::integer
    else null
  end,
  true
from source_groups
on conflict (product_id, code) do update set
  name_he = excluded.name_he,
  sort_order = excluded.sort_order,
  required = excluded.required,
  min_select = excluded.min_select,
  max_select = excluded.max_select,
  active = excluded.active
where (
  product_option_groups.name_he,
  product_option_groups.sort_order,
  product_option_groups.required,
  product_option_groups.min_select,
  product_option_groups.max_select,
  product_option_groups.active
) is distinct from (
  excluded.name_he,
  excluded.sort_order,
  excluded.required,
  excluded.min_select,
  excluded.max_select,
  excluded.active
);

with source_options as (
  select
    metadata.product_id,
    'group-' || lpad(option_group.ordinality::text, 2, '0') as group_code,
    'option-' || lpad(option_item.ordinality::text, 2, '0') as option_code,
    option_item.value as option_payload,
    option_item.ordinality::integer as option_order
  from public.product_source_metadata as metadata
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(metadata.source_payload -> 'option_groups') = 'array'
        then metadata.source_payload -> 'option_groups'
      else '[]'::jsonb
    end
  ) with ordinality as option_group(value, ordinality)
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(option_group.value -> 'options') = 'array'
        then option_group.value -> 'options'
      else '[]'::jsonb
    end
  ) with ordinality as option_item(value, ordinality)
)
insert into public.product_options (
  group_id,
  code,
  name_he,
  price_delta_agorot,
  sort_order,
  active
)
select
  option_group.id,
  source_option.option_code,
  source_option.option_payload ->> 'name',
  round(
    coalesce(nullif(source_option.option_payload ->> 'price_delta', ''), '0')::numeric * 100
  )::integer,
  source_option.option_order,
  coalesce((source_option.option_payload ->> 'active')::boolean, true)
from source_options as source_option
join public.product_option_groups as option_group
  on option_group.product_id = source_option.product_id
 and option_group.code = source_option.group_code
on conflict (group_id, code) do update set
  name_he = excluded.name_he,
  price_delta_agorot = excluded.price_delta_agorot,
  sort_order = excluded.sort_order,
  active = excluded.active
where (
  product_options.name_he,
  product_options.price_delta_agorot,
  product_options.sort_order,
  product_options.active
) is distinct from (
  excluded.name_he,
  excluded.price_delta_agorot,
  excluded.sort_order,
  excluded.active
);

with desired as (
  select
    product.id,
    exists (
      select 1
      from public.product_option_groups as option_group
      where option_group.product_id = product.id
        and option_group.active
        and exists (
          select 1
          from public.product_options as option_item
          where option_item.group_id = option_group.id
            and option_item.active
        )
    ) as has_structured_options
  from public.products as product
)
update public.products as product
set has_options = desired.has_structured_options
from desired
where desired.id = product.id
  and product.has_options is distinct from desired.has_structured_options;

do $verify$
begin
  if (select count(*) from public.products) = 0 then
    return;
  end if;

  if (select count(*) from public.product_option_groups) <> 2
    or (select count(*) from public.product_options) <> 24 then
    raise exception 'Approved Bakery option contract must contain exactly 2 groups and 24 options';
  end if;

  if (select count(*) from public.products where has_options) <> 1
    or not (select has_options from public.products where id = 'salads-01') then
    raise exception 'Only salads-01 may have an executable option contract';
  end if;

  if exists (
    select 1
    from public.product_option_groups as option_group
    where option_group.product_id <> 'salads-01'
      or not exists (
        select 1 from public.product_options as option_item
        where option_item.group_id = option_group.id and option_item.active
      )
  ) then
    raise exception 'Unexpected or empty Bakery option group';
  end if;

  if (select count(*) from public.products where display_price_text is not null) <> 78
    or (select count(*) from public.products where price_unit_note is not null) <> 49 then
    raise exception 'Public-safe display fields do not match the approved Bakery source';
  end if;
end
$verify$;

comment on column public.products.has_options is
  'True only when the product has at least one active normalized option group with active options.';

commit;
