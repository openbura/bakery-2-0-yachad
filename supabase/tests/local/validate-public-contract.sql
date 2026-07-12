\set ON_ERROR_STOP on

select test_validation.assert_true(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'display_price_text' and data_type = 'text')
  and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'price_unit_note' and data_type = 'text'),
  'public-safe product display fields exist'
);

select test_validation.assert_true(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_option_groups' and column_name = 'max_select' and is_nullable = 'YES'),
  'max_select supports NULL as unlimited'
);

select test_validation.assert_true(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_options' and column_name = 'price_delta_agorot' and data_type = 'integer')
  and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'product_options' and column_name = 'price_delta_ils'),
  'option prices use integer agorot only'
);

select test_validation.assert_true(
  (select count(*) = 78 from public.products)
  and (select count(*) = 10 from public.categories)
  and (select count(*) = 2 from public.product_option_groups)
  and (select count(*) = 24 from public.product_options),
  'public catalog has exact product, category, group and option counts'
);

select test_validation.assert_true(
  (select count(*) = 1 from public.products where has_options)
  and (select has_options from public.products where id = 'salads-01')
  and not exists (select 1 from public.product_option_groups where product_id <> 'salads-01'),
  'salads-01 is the only executable option product'
);

select test_validation.assert_true(
  exists (
    select 1 from public.product_option_groups
    where product_id = 'salads-01' and code = 'group-01'
      and name_he = 'בחרו מרכיבים לסלט' and sort_order = 1
      and required and min_select = 1 and max_select is null and active
  )
  and exists (
    select 1 from public.product_option_groups
    where product_id = 'salads-01' and code = 'group-02'
      and name_he = 'תרצו רטבים בתשלום?' and sort_order = 2
      and not required and min_select = 0 and max_select is null and active
  ),
  'salad option group bounds and unlimited maximums match the source'
);

select test_validation.assert_true(
  not exists (
    select 1 from public.product_option_groups as option_group
    left join public.products as product on product.id = option_group.product_id
    where product.id is null
  )
  and not exists (
    select 1 from public.product_options as option_item
    left join public.product_option_groups as option_group on option_group.id = option_item.group_id
    where option_group.id is null
  )
  and not exists (
    select 1 from public.product_option_groups as option_group
    where not exists (select 1 from public.product_options as option_item where option_item.group_id = option_group.id and option_item.active)
  ),
  'option relationships have no orphan or empty group'
);

select test_validation.assert_true(
  (select count(*) = 16 from public.product_options where price_delta_agorot = 0)
  and (select count(*) = 4 from public.product_options where price_delta_agorot = 300)
  and (select count(*) = 4 from public.product_options where price_delta_agorot = 200)
  and not exists (select 1 from public.product_options where price_delta_agorot < 0),
  'option price deltas match the approved 16/4/4 agorot distribution'
);

select test_validation.assert_true(
  (select count(*) = 78 from public.products where display_price_text is not null)
  and (select count(*) = 49 from public.products where price_unit_note is not null)
  and not exists (
    select 1
    from public.products as product
    join public.product_source_metadata as metadata on metadata.product_id = product.id
    where product.display_price_text is distinct from nullif(metadata.source_payload ->> 'display_price_text', '')
       or product.price_unit_note is distinct from nullif(metadata.source_payload ->> 'price_unit_note', '')
  ),
  'public-safe product text exactly matches the approved source payload'
);

select test_validation.assert_true(
  (
    select array_agg(tablename::text order by tablename)
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('admin_users', 'audit_log', 'categories', 'products', 'product_option_groups', 'product_options', 'product_source_metadata', 'store_settings')
  ) = array['products', 'store_settings']::text[],
  'Realtime publication includes only Bakery products and store settings'
);

begin;
set local role anon;
select test_validation.assert_true((select count(*) = 78 from public.products), 'anon reads active products with public fields');
select test_validation.assert_true((select count(*) = 2 from public.product_option_groups), 'anon reads active option groups');
select test_validation.assert_true((select count(*) = 24 from public.product_options), 'anon reads active options');
select test_validation.expect_denied('update public.products set display_price_text = display_price_text', 'anon display text update');
select test_validation.expect_denied('update public.product_option_groups set active = active', 'anon option group update');
select test_validation.expect_denied('update public.product_options set active = active', 'anon option update');
select test_validation.expect_denied('select * from public.product_source_metadata', 'anon source metadata read');
reset role;
rollback;

select test_validation.assert_true(
  not has_column_privilege('authenticated', 'public.products', 'display_price_text', 'update')
  and not has_column_privilege('authenticated', 'public.products', 'price_unit_note', 'update')
  and not has_table_privilege('authenticated', 'public.product_option_groups', 'insert')
  and not has_table_privilege('authenticated', 'public.product_option_groups', 'update')
  and not has_table_privilege('authenticated', 'public.product_option_groups', 'delete')
  and not has_table_privilege('authenticated', 'public.product_options', 'insert')
  and not has_table_privilege('authenticated', 'public.product_options', 'update')
  and not has_table_privilege('authenticated', 'public.product_options', 'delete'),
  'dashboard roles cannot change public display or option structure'
);

select jsonb_build_object(
  'products', (select count(*) from public.products),
  'categories', (select count(*) from public.categories),
  'option_groups', (select count(*) from public.product_option_groups),
  'options', (select count(*) from public.product_options),
  'option_product', (
    select jsonb_build_object(
      'id', product.id,
      'name', product.name_he,
      'groups', (
        select jsonb_agg(
          jsonb_build_object(
            'code', option_group.code,
            'name', option_group.name_he,
            'min_select', option_group.min_select,
            'max_select', option_group.max_select,
            'options', (
              select jsonb_agg(jsonb_build_object('code', option_item.code, 'name', option_item.name_he, 'price_delta_agorot', option_item.price_delta_agorot) order by option_item.sort_order)
              from public.product_options as option_item
              where option_item.group_id = option_group.id and option_item.active
            )
          ) order by option_group.sort_order
        )
        from public.product_option_groups as option_group
        where option_group.product_id = product.id and option_group.active
      )
    )
    from public.products as product where product.id = 'salads-01'
  ),
  'settings', (
    select to_jsonb(setting) - array['created_at', 'updated_at']::text[]
    from public.store_settings as setting where id = 'default'
  )
) as public_shop_contract_preview;

select 'BAKERY_PUBLIC_CATALOG_CONTRACT_OK' as result;
