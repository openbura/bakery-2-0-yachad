begin;

select plan(12);

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
select is((select count(distinct catalog_sha256) from public.product_source_metadata), 1::bigint, 'all source snapshots share one catalog hash');
select is((select count(*) from public.audit_log), 0::bigint, 'initial seed creates no audit noise');

select * from finish();
rollback;
