begin;

select no_plan();

select has_column('public', 'admin_users', 'role', 'admin_users has an explicit role');
select col_not_null('public', 'admin_users', 'role', 'admin role is required');
select col_default_is('public', 'admin_users', 'role', 'manager', 'admin role defaults to manager');
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admin_users'::regclass
      and conname = 'admin_users_role_known'
      and pg_get_constraintdef(oid) like '%owner%manager%'
  ),
  'admin role is constrained to owner or manager'
);
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'categories', 'products', 'product_option_groups', 'product_options',
        'product_source_metadata', 'store_settings'
      )
      and cmd = 'ALL'
  ),
  0::bigint,
  'no broad FOR ALL management policy remains'
);
select is(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'products'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ),
  array['available_today', 'price_agorot']::text[],
  'product update grants are limited to two operational columns'
);
select ok(
  not has_column_privilege('authenticated', 'public.products', 'display_price_text', 'update')
  and not has_column_privilege('authenticated', 'public.products', 'price_unit_note', 'update'),
  'admins cannot update public display fields'
);
select is(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'store_settings'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ),
  array[
    'customer_notice_active', 'customer_notice_end_at', 'customer_notice_start_at',
    'customer_notice_text', 'customer_notice_type', 'delivery_enabled',
    'ordering_enabled', 'pickup_enabled'
  ]::text[],
  'store update grants are limited to eight operational columns'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_source_metadata', 'select')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'insert')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'update')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'delete'),
  'browser clients cannot access source metadata'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-security@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'manager-security@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('50000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'inactive-security@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('50000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'nonadmin-security@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.admin_users (user_id, display_name, active, role)
values
  ('50000000-0000-0000-0000-000000000001', 'Owner Security Test', true, 'owner'),
  ('50000000-0000-0000-0000-000000000002', 'Manager Security Test', true, 'manager'),
  ('50000000-0000-0000-0000-000000000003', 'Inactive Security Test', false, 'manager');

set local role anon;
select throws_like('update public.products set price_agorot = 1', '%permission denied%products%', 'anon cannot update price');
select throws_like('update public.store_settings set ordering_enabled = false', '%permission denied%store_settings%', 'anon cannot update store settings');
select throws_like('select * from public.admin_users', '%permission denied%admin_users%', 'anon cannot read admin profiles');
select throws_like('select * from public.audit_log', '%permission denied%audit_log%', 'anon cannot read audit history');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select is((select count(*) from public.admin_users), 0::bigint, 'non-admin sees no admin row');
select is((select count(*) from public.audit_log), 0::bigint, 'non-admin sees no audit rows');
select results_eq(
  $$with changed as (update public.products set price_agorot = 7100 where id = 'bourekas-01' returning id) select count(*) from changed$$,
  $$values (0::bigint)$$,
  'non-admin cannot update an approved product column'
);
select throws_like(
  $$insert into public.admin_users (user_id, display_name, active, role) values ('50000000-0000-0000-0000-000000000004', 'Self', true, 'owner')$$,
  '%permission denied%admin_users%',
  'non-admin cannot create an allowlist row'
);
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select results_eq(
  $$with changed as (update public.products set available_today = false where id = 'bourekas-01' returning id) select count(*) from changed$$,
  $$values (0::bigint)$$,
  'inactive admin cannot update availability'
);
select is((select count(*) from public.audit_log), 0::bigint, 'inactive admin cannot read audit rows');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.admin_users), 1::bigint, 'owner sees only their profile');
select results_eq(
  $$with changed as (update public.products set price_agorot = 7100, available_today = false where id = 'bourekas-01' returning id) select count(*) from changed$$,
  $$values (1::bigint)$$,
  'owner can update price and daily availability'
);
select results_eq(
  $$with changed as (
    update public.store_settings
    set ordering_enabled = false, delivery_enabled = false, pickup_enabled = false,
        customer_notice_active = true, customer_notice_type = 'warning',
        customer_notice_text = 'Security test', customer_notice_start_at = now(),
        customer_notice_end_at = now() + interval '1 hour'
    where id = 'default' returning id
  ) select count(*) from changed$$,
  $$values (1::bigint)$$,
  'owner can update approved operational settings'
);
select throws_like('update public.products set name_he = name_he', '%permission denied%products%', 'owner cannot change product name');
select throws_like('update public.products set category_id = category_id', '%permission denied%products%', 'owner cannot change product category');
select throws_like('update public.products set image_url = image_url', '%permission denied%products%', 'owner cannot change product image');
select throws_like('update public.products set active = active', '%permission denied%products%', 'owner cannot change product active state');
select throws_like('update public.products set display_price_text = display_price_text', '%permission denied%products%', 'owner cannot change display price text');
select throws_like('update public.products set price_unit_note = price_unit_note', '%permission denied%products%', 'owner cannot change unit price note');
select throws_like('update public.products set available_for_delivery = available_for_delivery', '%permission denied%products%', 'owner cannot change delivery availability');
select throws_like('update public.products set available_for_pickup = available_for_pickup', '%permission denied%products%', 'owner cannot change pickup availability');
select throws_like('insert into public.products (id, category_id, name_he, price_agorot) values (''forbidden'', ''breads'', ''x'', 1)', '%permission denied%products%', 'owner cannot insert products');
select throws_like('delete from public.products', '%permission denied%products%', 'owner cannot delete products');
select throws_like('update public.categories set name_he = name_he', '%permission denied%categories%', 'owner cannot modify categories');
select throws_like('update public.product_option_groups set active = active', '%permission denied%product_option_groups%', 'owner cannot modify option groups');
select throws_like('update public.product_options set active = active', '%permission denied%product_options%', 'owner cannot modify options');
select throws_like('select * from public.product_source_metadata', '%permission denied%product_source_metadata%', 'owner cannot read source metadata');
select throws_like('update public.store_settings set delivery_fee_agorot = delivery_fee_agorot', '%permission denied%store_settings%', 'owner cannot change delivery fee');
select throws_like('update public.store_settings set minimum_delivery_subtotal_agorot = minimum_delivery_subtotal_agorot', '%permission denied%store_settings%', 'owner cannot change delivery minimum');
select throws_like('update public.admin_users set role = ''manager'' where user_id = auth.uid()', '%permission denied%admin_users%', 'owner cannot change own role');
select throws_like('update public.admin_users set active = false where user_id = auth.uid()', '%permission denied%admin_users%', 'owner cannot change own active state');
select throws_like(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  '%permission denied%audit_log%',
  'owner cannot insert audit rows'
);
select throws_like('update public.audit_log set action = action', '%permission denied%audit_log%', 'owner cannot update audit rows');
select throws_like('delete from public.audit_log', '%permission denied%audit_log%', 'owner cannot delete audit rows');
reset role;

select is((select count(*) from public.audit_log), 6::bigint, 'owner approved changes create six audit rows');
select is((select count(*) from public.audit_log where actor_user_id = '50000000-0000-0000-0000-000000000001'), 6::bigint, 'audit rows capture owner actor');

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select results_eq(
  $$with changed as (update public.products set price_agorot = 7000, available_today = true where id = 'bourekas-01' returning id) select count(*) from changed$$,
  $$values (1::bigint)$$,
  'manager can update approved product fields'
);
select results_eq(
  $$with changed as (
    update public.store_settings
    set ordering_enabled = true, delivery_enabled = true, pickup_enabled = true,
        customer_notice_active = false, customer_notice_type = 'info',
        customer_notice_text = '', customer_notice_start_at = null,
        customer_notice_end_at = null
    where id = 'default' returning id
  ) select count(*) from changed$$,
  $$values (1::bigint)$$,
  'manager can update approved operational settings'
);
select is((select count(*) from public.audit_log), 12::bigint, 'manager can read audit history after restoration');
update public.products set price_agorot = price_agorot where id = 'bourekas-01';
select is((select count(*) from public.audit_log), 12::bigint, 'no-op approved update creates no audit row');
reset role;

select * from finish();
rollback;
