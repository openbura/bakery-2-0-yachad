\set ON_ERROR_STOP on

create schema if not exists test_validation;

create or replace function test_validation.assert_true(result boolean, message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if result is not true then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

create or replace function test_validation.expect_denied(statement text, message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  begin
    execute statement;
  exception
    when insufficient_privilege then
      return;
  end;
  raise exception 'ASSERTION FAILED: expected permission denial: %', message;
end;
$$;

create or replace function test_validation.expect_check_violation(statement text, message text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  begin
    execute statement;
  exception
    when check_violation then
      return;
  end;
  raise exception 'ASSERTION FAILED: expected check violation: %', message;
end;
$$;

grant usage on schema test_validation to anon, authenticated;
grant execute on all functions in schema test_validation to anon, authenticated;

select test_validation.assert_true(to_regclass('public.audit_log') is not null, 'audit_log exists');
select test_validation.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass),
  'audit_log RLS is enabled'
);
select test_validation.assert_true(
  (
    select count(*) = 9
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_log'
      and column_name in (
        'id', 'actor_user_id', 'actor_role', 'entity_type', 'entity_id',
        'action', 'previous_value', 'new_value', 'created_at'
      )
  ),
  'audit_log required columns exist'
);
select test_validation.assert_true(
  pg_get_expr((select adbin from pg_attrdef where adrelid = 'public.audit_log'::regclass and adnum = 1), 'public.audit_log'::regclass) like '%gen_random_uuid%',
  'audit_log id is database-generated'
);
select test_validation.assert_true(
  pg_get_expr((select adbin from pg_attrdef where adrelid = 'public.audit_log'::regclass and adnum = 9), 'public.audit_log'::regclass) like '%statement_timestamp%',
  'audit_log timestamp is database-generated'
);
select test_validation.assert_true(
  (select count(*) = 4 from pg_indexes where schemaname = 'public' and tablename = 'audit_log' and indexname <> 'audit_log_pkey'),
  'audit_log has exactly four requested secondary indexes'
);
select test_validation.assert_true(
  (select count(*) = 2 from pg_trigger where tgname in ('products_write_audit_log', 'store_settings_write_audit_log') and not tgisinternal),
  'both audit triggers exist'
);
select test_validation.assert_true(
  (
    select count(*) = 2
    from pg_proc
    where oid in (
      'private.audit_product_changes()'::regprocedure,
      'private.audit_store_settings_changes()'::regprocedure
    )
      and prosecdef
      and coalesce(array_to_string(proconfig, ','), '') like '%search_path=""%'
  ),
  'audit functions are SECURITY DEFINER with an empty search_path'
);
select test_validation.assert_true(
  not has_function_privilege('anon', 'private.audit_product_changes()', 'execute')
  and not has_function_privilege('authenticated', 'private.audit_product_changes()', 'execute')
  and not has_function_privilege('anon', 'private.audit_store_settings_changes()', 'execute')
  and not has_function_privilege('authenticated', 'private.audit_store_settings_changes()', 'execute'),
  'browser roles cannot execute audit functions'
);
select test_validation.assert_true(
  (select count(*) >= 6 from pg_constraint where conrelid = 'public.audit_log'::regclass),
  'audit_log validation constraints exist'
);

select test_validation.expect_check_violation(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('', 'x', 'product.price_changed')$$,
  'blank entity type is rejected'
);
select test_validation.expect_check_violation(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', ' ', 'product.price_changed')$$,
  'blank entity id is rejected'
);
select test_validation.expect_check_violation(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('unknown', 'x', 'product.price_changed')$$,
  'unknown entity type is rejected'
);
select test_validation.expect_check_violation(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'unknown.action')$$,
  'unknown action is rejected'
);
select test_validation.expect_check_violation(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'store.ordering_changed')$$,
  'action and entity type must match'
);

select test_validation.assert_true((select count(*) = 78 from public.products), 'seed has 78 products');
select test_validation.assert_true((select count(*) = 10 from public.categories), 'seed has 10 categories');
select test_validation.assert_true((select count(*) = 78 from public.product_source_metadata), 'seed has 78 source snapshots');
select test_validation.assert_true((select count(*) = 78 from public.products where active and available_today), 'all products are initially available today');
select test_validation.assert_true((select count(*) = 78 from public.products where available_for_delivery), 'all products are initially available for delivery');
select test_validation.assert_true((select count(*) = 78 from public.products where available_for_pickup), 'all products are initially available for pickup');
select test_validation.assert_true(
  (
    select delivery_fee_agorot = 1500
      and minimum_delivery_subtotal_agorot = 7000
      and pickup_fee_agorot = 0
    from public.store_settings
    where id = 'default'
  ),
  'store fees remain 1500/7000/0 agorot'
);
select test_validation.assert_true(
  (select count(distinct catalog_sha256) = 1 and min(catalog_sha256) = '240c6d3d00a64c35699caba9c53d0cc9ed142a074c14140c52fe307f24b292dc' from public.product_source_metadata),
  'catalog hash is unchanged'
);
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'initial seed creates no audit noise');

\i /work/supabase/seed.sql

select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'idempotent seed rerun creates no audit noise');

begin;

insert into auth.users (id)
values
  ('30000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003');

insert into public.admin_users (user_id, display_name, active)
values
  ('30000000-0000-0000-0000-000000000001', 'Local Validation Admin', true),
  ('30000000-0000-0000-0000-000000000003', 'Inactive Local Validation Admin', false);

set local role anon;
select test_validation.expect_denied('select * from public.audit_log', 'anon select');
select test_validation.expect_denied(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'anon insert'
);
select test_validation.expect_denied('update public.audit_log set action = action', 'anon update');
select test_validation.expect_denied('delete from public.audit_log', 'anon delete');
reset role;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'non-admin cannot read audit history');
select test_validation.expect_denied(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'non-admin insert'
);
select test_validation.expect_denied('update public.audit_log set action = action', 'non-admin update');
select test_validation.expect_denied('delete from public.audit_log', 'non-admin delete');
reset role;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'inactive admin cannot read audit history');
select test_validation.expect_denied(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'inactive admin insert'
);
select test_validation.expect_denied('update public.audit_log set action = action', 'inactive admin update');
select test_validation.expect_denied('delete from public.audit_log', 'inactive admin delete');
reset role;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 0 from public.audit_log), 'active admin can read empty audit history');
select test_validation.expect_denied(
  $$insert into public.audit_log (entity_type, entity_id, action) values ('product', 'x', 'product.price_changed')$$,
  'active admin direct insert'
);
select test_validation.expect_denied('update public.audit_log set action = action', 'active admin update');
select test_validation.expect_denied('delete from public.audit_log', 'active admin delete');

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
reset role;

select test_validation.assert_true((select count(*) = 12 from public.audit_log), 'only tracked real changes create events');
select test_validation.assert_true((select count(*) = 1 from public.audit_log where action = 'product.price_changed'), 'price event exists');
select test_validation.assert_true(
  (select previous_value = '{"price_agorot": 7000}'::jsonb and new_value = '{"price_agorot": 7100}'::jsonb from public.audit_log where action = 'product.price_changed'),
  'price event has correct before and after values'
);
select test_validation.assert_true(
  (select count(*) = 3 from public.audit_log where action in ('product.available_today_changed', 'product.delivery_availability_changed', 'product.pickup_availability_changed')),
  'all product availability events exist'
);
select test_validation.assert_true(
  (
    select previous_value = '{"available_today": true}'::jsonb
      and new_value = '{"available_today": false}'::jsonb
    from public.audit_log
    where action = 'product.available_today_changed'
  ),
  'availability event has correct before and after values'
);
select test_validation.assert_true((select count(*) = 1 from public.audit_log where action = 'store.ordering_changed'), 'ordering event exists');
select test_validation.assert_true(
  (
    select previous_value = '{"ordering_enabled": true}'::jsonb
      and new_value = '{"ordering_enabled": false}'::jsonb
    from public.audit_log
    where action = 'store.ordering_changed'
  ),
  'ordering event has correct before and after values'
);
select test_validation.assert_true((select count(*) = 1 from public.audit_log where action = 'store.delivery_changed'), 'delivery event exists');
select test_validation.assert_true((select count(*) = 1 from public.audit_log where action = 'store.pickup_changed'), 'pickup event exists');
select test_validation.assert_true((select count(*) = 1 from public.audit_log where action = 'store.notice_published'), 'notice publication event exists');
select test_validation.assert_true(
  (
    select previous_value ->> 'customer_notice_active' = 'false'
      and new_value ->> 'customer_notice_active' = 'true'
    from public.audit_log
    where action = 'store.notice_published'
  ),
  'notice publication has the correct lifecycle transition'
);
select test_validation.assert_true((select count(*) = 2 from public.audit_log where action = 'store.notice_updated'), 'active notice update events exist');
select test_validation.assert_true((select count(*) = 2 from public.audit_log where action = 'store.notice_removed'), 'notice removal events exist');
select test_validation.assert_true(
  (select count(*) = 12 from public.audit_log where actor_user_id = '30000000-0000-0000-0000-000000000001' and actor_role = 'bakery_admin'),
  'authenticated active admin actor and role are captured'
);
select test_validation.assert_true((select count(*) = 12 from public.audit_log where created_at is not null), 'all timestamps are database-generated');
select test_validation.assert_true((select max(created_at) <= statement_timestamp() from public.audit_log), 'audit timestamps use database time');
select test_validation.assert_true((select count(distinct action) = 10 from public.audit_log), 'only stable approved actions are emitted');
select test_validation.assert_true(
  not exists (
    select 1
    from public.audit_log
    where action like 'store.notice_%'
      and (
        (select count(*) from jsonb_object_keys(previous_value)) <> 5
        or (select count(*) from jsonb_object_keys(new_value)) <> 5
      )
  ),
  'notice events contain only five notice-related fields'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select test_validation.assert_true((select count(*) = 12 from public.audit_log), 'active admin can read audit history');
reset role;

delete from auth.users where id = '30000000-0000-0000-0000-000000000001';
select test_validation.assert_true(
  (select count(*) = 12 from public.audit_log where actor_user_id = '30000000-0000-0000-0000-000000000001'),
  'deleting an Auth user does not rewrite historical actor metadata'
);

rollback;

select 'BAKERY_AUDIT_SQL_ASSERTIONS_OK' as result;
