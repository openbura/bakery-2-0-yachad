begin;

select plan(41);

select has_table('public', 'audit_log', 'audit_log table exists');
select has_pk('public', 'audit_log', 'audit_log has a primary key');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass),
  'audit_log has RLS enabled'
);
select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_log'
      and column_name in (
        'id', 'actor_user_id', 'actor_role', 'entity_type', 'entity_id',
        'action', 'previous_value', 'new_value', 'created_at'
      )
  ),
  9::bigint,
  'audit_log has every required column'
);
select cmp_ok(
  (select count(*) from pg_constraint where conrelid = 'public.audit_log'::regclass and contype = 'c'),
  '>=',
  5::bigint,
  'audit_log has practical check constraints'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'audit_log'),
  5::bigint,
  'audit_log has its primary-key index and four history indexes'
);
select is(
  (select count(*) from pg_trigger where tgrelid in ('public.products'::regclass, 'public.store_settings'::regclass) and tgname like '%write_audit_log' and not tgisinternal),
  2::bigint,
  'both audit triggers exist'
);
select is(
  (select count(*) from pg_proc where oid in ('private.audit_product_changes()'::regprocedure, 'private.audit_store_settings_changes()'::regprocedure) and prosecdef),
  2::bigint,
  'both audit trigger functions use definer security'
);
select ok(
  not has_function_privilege('anon', 'private.audit_product_changes()', 'execute')
  and not has_function_privilege('authenticated', 'private.audit_product_changes()', 'execute')
  and not has_function_privilege('anon', 'private.audit_store_settings_changes()', 'execute')
  and not has_function_privilege('authenticated', 'private.audit_store_settings_changes()', 'execute'),
  'browser roles cannot execute audit functions directly'
);
select is((select count(*) from public.audit_log), 0::bigint, 'initial seed creates no audit rows');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'audit-admin@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'audit-user@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'audit-inactive@yachad.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.admin_users (user_id, display_name, active)
values
  ('20000000-0000-0000-0000-000000000001', 'Audit Test Admin', true),
  ('20000000-0000-0000-0000-000000000003', 'Inactive Audit Test Admin', false);

set local role anon;
select throws_ok('select * from public.audit_log', 'permission denied for table audit_log', 'anon cannot read audit rows');
select throws_ok(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'permission denied for table audit_log',
  'anon cannot insert audit rows'
);
select throws_ok('update public.audit_log set action = action', 'permission denied for table audit_log', 'anon cannot update audit rows');
select throws_ok('delete from public.audit_log', 'permission denied for table audit_log', 'anon cannot delete audit rows');
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is((select count(*) from public.audit_log), 0::bigint, 'non-admin cannot read audit rows');
select throws_ok(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'permission denied for table audit_log',
  'non-admin cannot insert audit rows'
);
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select is((select count(*) from public.audit_log), 0::bigint, 'inactive admin cannot read audit rows');
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.audit_log), 0::bigint, 'active admin can read audit history');
select throws_ok(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'permission denied for table audit_log',
  'active admin cannot insert audit rows directly'
);
select throws_ok('update public.audit_log set action = action', 'permission denied for table audit_log', 'active admin cannot update audit rows');
select throws_ok('delete from public.audit_log', 'permission denied for table audit_log', 'active admin cannot delete audit rows');

update public.products set price_agorot = 7100 where id = 'bourekas-01';
update public.products
set available_today = false, available_for_delivery = false, available_for_pickup = false
where id = 'bourekas-01';
update public.products set description_he = description_he where id = 'bourekas-01';
update public.products set price_agorot = price_agorot where id = 'bourekas-01';

update public.store_settings set ordering_enabled = false where id = 'default';
update public.store_settings set delivery_enabled = false where id = 'default';
update public.store_settings set pickup_enabled = false where id = 'default';
update public.store_settings set customer_notice_text = customer_notice_text || ' test' where id = 'default';
update public.store_settings set customer_notice_active = false where id = 'default';
update public.store_settings set customer_notice_text = 'inactive draft' where id = 'default';
update public.store_settings set customer_notice_active = true where id = 'default';
update public.store_settings set customer_notice_type = 'warning' where id = 'default';
update public.store_settings set customer_notice_active = false where id = 'default';
update public.store_settings set ordering_enabled = ordering_enabled where id = 'default';

select is((select count(*) from public.audit_log), 12::bigint, 'only tracked real changes create audit rows');
select is((select count(*) from public.audit_log where action = 'product.price_changed'), 1::bigint, 'price change creates one event');
select is(
  (select previous_value from public.audit_log where action = 'product.price_changed'),
  '{"price_agorot": 7000}'::jsonb,
  'price event stores the trusted previous value'
);
select is(
  (select new_value from public.audit_log where action = 'product.price_changed'),
  '{"price_agorot": 7100}'::jsonb,
  'price event stores the trusted new value'
);
select is((select count(*) from public.audit_log where action like 'product.%availability_changed' or action = 'product.available_today_changed'), 3::bigint, 'product availability changes create three stable events');
select ok(
  (
    select previous_value = '{"available_today": true}'::jsonb
      and new_value = '{"available_today": false}'::jsonb
    from public.audit_log
    where action = 'product.available_today_changed'
  ),
  'availability event stores the correct before and after values'
);
select is((select count(*) from public.audit_log where action = 'store.ordering_changed'), 1::bigint, 'ordering change creates an event');
select ok(
  (
    select previous_value = '{"ordering_enabled": true}'::jsonb
      and new_value = '{"ordering_enabled": false}'::jsonb
    from public.audit_log
    where action = 'store.ordering_changed'
  ),
  'ordering event stores the correct before and after values'
);
select is((select count(*) from public.audit_log where action = 'store.delivery_changed'), 1::bigint, 'delivery change creates an event');
select is((select count(*) from public.audit_log where action = 'store.pickup_changed'), 1::bigint, 'pickup change creates an event');
select is((select count(*) from public.audit_log where action = 'store.notice_published'), 1::bigint, 'notice publication creates an event');
select ok(
  (
    select previous_value ->> 'customer_notice_active' = 'false'
      and new_value ->> 'customer_notice_active' = 'true'
    from public.audit_log
    where action = 'store.notice_published'
  ),
  'notice publication stores the correct lifecycle transition'
);
select is((select count(*) from public.audit_log where action = 'store.notice_updated'), 2::bigint, 'active notice edits create events');
select is((select count(*) from public.audit_log where action = 'store.notice_removed'), 2::bigint, 'notice removals create events');
select is((select count(*) from public.audit_log where actor_user_id = '20000000-0000-0000-0000-000000000001'), 12::bigint, 'authenticated admin actor is captured');
select is((select count(*) from public.audit_log where actor_role = 'bakery_admin'), 12::bigint, 'active Bakery admin role is captured');
select is((select count(*) from public.audit_log where created_at is not null), 12::bigint, 'database creates every audit timestamp');
select is((select count(distinct action) from public.audit_log), 10::bigint, 'only the ten approved stable actions are emitted');
select ok(
  not exists (
    select 1
    from public.audit_log
    where action like 'store.notice_%'
      and (
        previous_value - array['customer_notice_active', 'customer_notice_type', 'customer_notice_text', 'customer_notice_start_at', 'customer_notice_end_at']::text[] <> '{}'::jsonb
        or new_value - array['customer_notice_active', 'customer_notice_type', 'customer_notice_text', 'customer_notice_start_at', 'customer_notice_end_at']::text[] <> '{}'::jsonb
      )
  ),
  'notice events contain only notice-related fields'
);
reset role;

delete from auth.users where id = '20000000-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.audit_log where actor_user_id = '20000000-0000-0000-0000-000000000001'),
  12::bigint,
  'deleting an Auth user does not rewrite historical actor metadata'
);

select * from finish();
rollback;
