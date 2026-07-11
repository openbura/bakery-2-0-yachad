begin;

select plan(10);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-test@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'user-test@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.admin_users (user_id, display_name, active)
values ('10000000-0000-0000-0000-000000000001', 'Test Bakery Admin', true);

set local role anon;
select is((select count(*) from public.products), 78::bigint, 'anon can read active products');
select is((select count(*) from public.categories), 10::bigint, 'anon can read active categories');
select is((select count(*) from public.store_settings), 1::bigint, 'anon can read store settings');
select throws_ok('select * from public.admin_users', 'permission denied for table admin_users', 'anon cannot read admin authorization');
select throws_ok('update public.products set price_agorot = 1 where id = ''bourekas-01''', 'permission denied for table products', 'anon cannot update products');
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is((select count(*) from public.admin_users), 0::bigint, 'non-admin cannot see another authorization row');
select is((select count(*) from public.product_source_metadata), 0::bigint, 'non-admin cannot read source metadata');
select results_eq(
  $$with changed as (
    update public.products set price_agorot = price_agorot where id = 'bourekas-01' returning id
  ) select count(*) from changed$$,
  $$values (0::bigint)$$,
  'non-admin cannot update products'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.product_source_metadata), 78::bigint, 'active Bakery admin can read source metadata');
select results_eq(
  $$with changed as (
    update public.products set price_agorot = price_agorot where id = 'bourekas-01' returning id
  ) select count(*) from changed$$,
  $$values (1::bigint)$$,
  'active Bakery admin can update products'
);
reset role;

select * from finish();
rollback;
