begin;

select no_plan();

select has_column('public', 'products', 'display_price_text', 'public display price text exists');
select has_column('public', 'products', 'price_unit_note', 'public unit note exists');
select has_column('public', 'product_options', 'price_delta_agorot', 'option delta uses agorot');
select col_is_null('public', 'product_option_groups', 'max_select', 'unlimited max is represented by NULL');

select is((select count(*) from public.product_option_groups), 5::bigint, 'five approved option groups are seeded');
select is((select count(*) from public.product_options), 48::bigint, '48 approved options are seeded');
select is((select count(*) from public.products where has_options), 4::bigint, 'three pizzas and salad have executable choices');
select ok((select has_options from public.products where id = 'salads-01'), 'salads-01 is executable');

select is(
  (
    select array_agg(tablename::text order by tablename)
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
  ),
  array['order_attention', 'orders', 'products', 'store_settings']::text[],
  'Realtime exposes only operational Bakery tables'
);

select ok(
  not has_column_privilege('authenticated', 'public.products', 'display_price_text', 'update')
  and not has_column_privilege('authenticated', 'public.products', 'price_unit_note', 'update'),
  'dashboard users cannot update public-safe catalog text'
);

select * from finish();
rollback;
