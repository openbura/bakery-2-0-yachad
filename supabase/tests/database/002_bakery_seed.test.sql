begin;

select plan(26);

select is((select count(*) from public.categories), 10::bigint, 'seed contains 10 categories');
select is((select count(*) from public.products), 78::bigint, 'seed contains 78 products');
select is((select count(*) from public.product_source_metadata), 78::bigint, 'seed contains 78 source snapshots');
select is((select count(*) from public.store_settings), 1::bigint, 'seed contains singleton store settings');
select is((select count(*) from public.products where active and available_today), 78::bigint, 'all products are initially available today');
select is((select count(*) from public.products where available_for_delivery), 78::bigint, 'all products remain available for delivery');
select is((select count(*) from public.products where available_for_pickup), 78::bigint, 'all products remain available for pickup');
select is((select delivery_fee_agorot from public.store_settings where id = 'default'), 1500, 'delivery fee remains 1500 agorot');
select is((select minimum_delivery_subtotal_agorot from public.store_settings where id = 'default'), 7000, 'delivery minimum remains 7000 agorot');
select is((select pickup_fee_agorot from public.store_settings where id = 'default'), 0, 'pickup fee remains zero');
select is((select customer_notice_active from public.store_settings where id = 'default'), false, 'customer notice starts inactive');
select is((select customer_notice_type from public.store_settings where id = 'default'), 'info', 'customer notice starts with the info type');
select is((select customer_notice_text from public.store_settings where id = 'default'), '', 'customer notice starts empty');
select is((select customer_notice_start_at from public.store_settings where id = 'default'), null::timestamptz, 'customer notice start time is initially null');
select is((select customer_notice_end_at from public.store_settings where id = 'default'), null::timestamptz, 'customer notice end time is initially null');
select is((select count(distinct catalog_sha256) from public.product_source_metadata), 1::bigint, 'all source snapshots share one catalog hash');
select is((select count(*) from public.audit_log), 0::bigint, 'initial seed creates no audit noise');
select is((select count(*) from public.product_option_groups), 2::bigint, 'seed contains two approved option groups');
select is((select count(*) from public.product_options), 24::bigint, 'seed contains 24 approved options');
select is((select count(*) from public.products where has_options), 1::bigint, 'only one product has executable options');
select ok((select has_options from public.products where id = 'salads-01'), 'salads-01 has executable options');
select is((select count(*) from public.product_option_groups where product_id = 'salads-01'), 2::bigint, 'both option groups belong to salads-01');
select is((select count(*) from public.product_options where price_delta_agorot = 0), 16::bigint, '16 salad ingredients are free');
select is((select count(*) from public.product_options where price_delta_agorot = 300), 4::bigint, 'four salad additions cost 300 agorot');
select is((select count(*) from public.product_options where price_delta_agorot = 200), 4::bigint, 'four sauces cost 200 agorot');
select is((select count(*) from public.products where display_price_text is not null), 78::bigint, 'all products preserve display price text');

select * from finish();
rollback;
