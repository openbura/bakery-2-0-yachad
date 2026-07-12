\set ON_ERROR_STOP on

select test_validation.assert_true(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_users'
      and column_name = 'role'
      and is_nullable = 'NO'
      and column_default = '''manager''::text'
  ),
  'admin_users.role is required and defaults to manager'
);

select test_validation.assert_true(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admin_users'::regclass
      and conname = 'admin_users_role_known'
      and pg_get_constraintdef(oid) like '%owner%manager%'
  ),
  'admin role check allows only owner and manager'
);

select test_validation.assert_true(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'categories', 'products', 'product_option_groups', 'product_options',
        'product_source_metadata', 'store_settings'
      )
      and cmd = 'ALL'
  ),
  'all broad FOR ALL management policies are removed'
);

select test_validation.assert_true(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'products'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) = array['available_today', 'price_agorot']::text[],
  'product update grants contain exactly price and daily availability'
);

select test_validation.assert_true(
  (
    select array_agg(column_name::text order by column_name)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'store_settings'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  ) = array[
    'customer_notice_active', 'customer_notice_end_at', 'customer_notice_start_at',
    'customer_notice_text', 'customer_notice_type', 'delivery_enabled',
    'ordering_enabled', 'pickup_enabled'
  ]::text[],
  'store settings update grants contain exactly the approved operational fields'
);

select test_validation.assert_true(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and table_name in (
        'admin_users', 'categories', 'products', 'product_option_groups',
        'product_options', 'product_source_metadata', 'store_settings', 'audit_log'
      )
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  'authenticated has no table-level mutation grants'
);

select test_validation.assert_true(
  not has_table_privilege('authenticated', 'public.product_source_metadata', 'select')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'insert')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'update')
    and not has_table_privilege('authenticated', 'public.product_source_metadata', 'delete'),
  'source metadata is inaccessible to browser roles'
);

begin;

insert into auth.users (id)
values
  ('40000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000099');

select test_validation.expect_check_violation(
  $$insert into public.admin_users (user_id, role) values ('40000000-0000-0000-0000-000000000099', 'administrator')$$,
  'unknown admin role'
);

insert into public.admin_users (user_id, display_name, active, role)
values
  ('40000000-0000-0000-0000-000000000001', 'Security Owner', true, 'owner'),
  ('40000000-0000-0000-0000-000000000002', 'Security Manager', true, 'manager'),
  ('40000000-0000-0000-0000-000000000003', 'Security Inactive', false, 'manager');

set local role anon;
select test_validation.expect_denied('update public.products set price_agorot = 1', 'anon price update');
select test_validation.expect_denied('update public.products set available_today = false', 'anon availability update');
select test_validation.expect_denied('insert into public.products (id, category_id, name_he, price_agorot) values (''forbidden'', ''breads'', ''x'', 1)', 'anon product insert');
select test_validation.expect_denied('delete from public.products', 'anon product delete');
select test_validation.expect_denied('update public.store_settings set ordering_enabled = false', 'anon store settings update');
select test_validation.expect_denied('insert into public.categories (id, name_he) values (''forbidden'', ''x'')', 'anon structural write');
select test_validation.expect_denied('select * from public.admin_users', 'anon admin profile read');
select test_validation.expect_denied('select * from public.audit_log', 'anon audit read');
reset role;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 0 from public.admin_users), 'non-admin sees no admin profile');
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'non-admin sees no audit history');
update public.products set price_agorot = 7100 where id = 'bourekas-01';
update public.store_settings set ordering_enabled = false where id = 'default';
select test_validation.assert_true((select price_agorot = 7000 from public.products where id = 'bourekas-01'), 'non-admin product update affects no row');
select test_validation.assert_true((select ordering_enabled from public.store_settings where id = 'default'), 'non-admin settings update affects no row');
select test_validation.expect_denied(
  $$insert into public.admin_users (user_id, display_name, active, role) values ('40000000-0000-0000-0000-000000000004', 'Self', true, 'owner')$$,
  'non-admin cannot create an allowlist row'
);
reset role;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 1 from public.admin_users where user_id = auth.uid()), 'inactive admin can read only their own profile');
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'inactive admin sees no audit history');
update public.products set available_today = false where id = 'bourekas-01';
update public.store_settings set delivery_enabled = false where id = 'default';
select test_validation.assert_true((select available_today from public.products where id = 'bourekas-01'), 'inactive admin product update affects no row');
select test_validation.assert_true((select delivery_enabled from public.store_settings where id = 'default'), 'inactive admin settings update affects no row');
reset role;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select test_validation.assert_true(
  (select count(*) = 1 and min(role) = 'owner' from public.admin_users),
  'owner reads only their own safe profile'
);
select test_validation.expect_denied('select * from public.product_source_metadata', 'owner source metadata read');

update public.products set price_agorot = 7100, available_today = false where id = 'bourekas-01';
update public.store_settings
set ordering_enabled = false,
    delivery_enabled = false,
    pickup_enabled = false,
    customer_notice_active = true,
    customer_notice_type = 'warning',
    customer_notice_text = 'Security test',
    customer_notice_start_at = statement_timestamp(),
    customer_notice_end_at = statement_timestamp() + interval '1 hour'
where id = 'default';
select test_validation.assert_true(
  (select price_agorot = 7100 and not available_today from public.products where id = 'bourekas-01'),
  'owner can update price and daily availability'
);
select test_validation.assert_true(
  (
    select not ordering_enabled
      and not delivery_enabled
      and not pickup_enabled
      and customer_notice_active
      and customer_notice_type = 'warning'
      and customer_notice_text = 'Security test'
      and customer_notice_start_at is not null
      and customer_notice_end_at is not null
    from public.store_settings
    where id = 'default'
  ),
  'owner can update all approved operational store fields'
);

select test_validation.expect_denied('insert into public.products (id, category_id, name_he, price_agorot) values (''forbidden'', ''breads'', ''x'', 1)', 'owner product insert');
select test_validation.expect_denied('delete from public.products where id = ''bourekas-01''', 'owner product delete');
select test_validation.expect_denied('update public.products set name_he = name_he where id = ''bourekas-01''', 'owner product name update');
select test_validation.expect_denied('update public.products set category_id = category_id where id = ''bourekas-01''', 'owner product category update');
select test_validation.expect_denied('update public.products set image_url = image_url where id = ''bourekas-01''', 'owner product image update');
select test_validation.expect_denied('update public.products set active = active where id = ''bourekas-01''', 'owner product active update');
select test_validation.expect_denied('update public.products set available_for_delivery = available_for_delivery where id = ''bourekas-01''', 'owner product delivery availability update');
select test_validation.expect_denied('update public.products set available_for_pickup = available_for_pickup where id = ''bourekas-01''', 'owner product pickup availability update');
select test_validation.expect_denied('update public.products set price_agorot = 7200, name_he = name_he where id = ''bourekas-01''', 'owner mixed allowed and forbidden product update');
select test_validation.expect_denied('insert into public.categories (id, name_he) values (''forbidden'', ''x'')', 'owner category insert');
select test_validation.expect_denied('update public.categories set name_he = name_he', 'owner category update');
select test_validation.expect_denied('delete from public.categories', 'owner category delete');
select test_validation.expect_denied('update public.product_option_groups set active = active', 'owner option group update');
select test_validation.expect_denied('update public.product_options set active = active', 'owner option update');
select test_validation.expect_denied('update public.store_settings set delivery_fee_agorot = delivery_fee_agorot', 'owner delivery fee update');
select test_validation.expect_denied('update public.store_settings set minimum_delivery_subtotal_agorot = minimum_delivery_subtotal_agorot', 'owner delivery minimum update');
select test_validation.expect_denied('update public.store_settings set pickup_fee_agorot = pickup_fee_agorot', 'owner pickup fee update');
select test_validation.expect_denied('insert into public.store_settings (id) values (''other'')', 'owner store settings insert');
select test_validation.expect_denied('delete from public.store_settings', 'owner store settings delete');
select test_validation.expect_denied('update public.admin_users set role = ''manager'' where user_id = auth.uid()', 'owner own role update');
select test_validation.expect_denied('update public.admin_users set active = false where user_id = auth.uid()', 'owner own active update');
select test_validation.expect_denied('delete from public.admin_users where user_id = auth.uid()', 'owner own profile delete');
select test_validation.expect_denied(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'owner direct audit insert'
);
select test_validation.expect_denied('update public.audit_log set action = action', 'owner audit update');
select test_validation.expect_denied('delete from public.audit_log', 'owner audit delete');
reset role;

select test_validation.assert_true((select count(*) = 6 from public.audit_log), 'owner approved changes emitted six audit events');
select test_validation.assert_true(
  (select count(*) = 6 from public.audit_log where actor_user_id = '40000000-0000-0000-0000-000000000001' and actor_role = 'bakery_admin'),
  'owner audit events capture the authenticated actor'
);
select test_validation.assert_true(
  (select previous_value = '{"price_agorot": 7000}'::jsonb and new_value = '{"price_agorot": 7100}'::jsonb from public.audit_log where action = 'product.price_changed'),
  'allowed price change audit values are trusted and correct'
);

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select test_validation.assert_true(
  (select count(*) = 1 and min(role) = 'manager' from public.admin_users),
  'manager reads only their own safe profile'
);
update public.products set price_agorot = 7000, available_today = true where id = 'bourekas-01';
update public.store_settings
set ordering_enabled = true,
    delivery_enabled = true,
    pickup_enabled = true,
    customer_notice_active = false,
    customer_notice_type = 'info',
    customer_notice_text = '',
    customer_notice_start_at = null,
    customer_notice_end_at = null
where id = 'default';
select test_validation.assert_true(
  (select price_agorot = 7000 and available_today from public.products where id = 'bourekas-01'),
  'manager can update approved product fields'
);
select test_validation.assert_true(
  (
    select ordering_enabled
      and delivery_enabled
      and pickup_enabled
      and not customer_notice_active
      and customer_notice_type = 'info'
      and customer_notice_text = ''
      and customer_notice_start_at is null
      and customer_notice_end_at is null
    from public.store_settings
    where id = 'default'
  ),
  'manager can restore approved store fields'
);
select test_validation.assert_true((select count(*) = 12 from public.audit_log), 'manager restoration emitted six more audit events');
select test_validation.assert_true(
  (select count(*) = 6 from public.audit_log where actor_user_id = '40000000-0000-0000-0000-000000000002'),
  'manager audit events capture the authenticated actor'
);
update public.products set price_agorot = price_agorot where id = 'bourekas-01';
update public.store_settings set ordering_enabled = ordering_enabled where id = 'default';
select test_validation.assert_true((select count(*) = 12 from public.audit_log), 'no-op approved updates create no audit events');
select test_validation.assert_true((select count(*) = 12 from public.audit_log), 'active manager can read audit history');
reset role;

select test_validation.assert_true(
  (select count(*) = 78 from public.products)
    and (select count(*) = 10 from public.categories)
    and (select count(*) = 78 from public.product_source_metadata),
  'transactional security tests preserve catalog counts'
);

rollback;

select 'BAKERY_SECURITY_CORRECTION_SQL_ASSERTIONS_OK' as result;
