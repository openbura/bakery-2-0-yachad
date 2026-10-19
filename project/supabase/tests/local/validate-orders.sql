-- Read-only security checks; usable against an isolated database after migrations.
do $$
declare v_table text; v_name text;
begin
  foreach v_table in array array['orders','order_items','order_item_options','order_status_history','order_attention'] loop
    if has_table_privilege('anon','public.'||v_table,'select,insert,update,delete') then
      raise exception 'Anonymous order table grant: %',v_table;
    end if;
    if not (select relrowsecurity from pg_class where oid=('public.'||v_table)::regclass) then
      raise exception 'RLS disabled: %',v_table;
    end if;
  end loop;
  foreach v_name in array array['create_bakery_order','get_bakery_order_status','get_bakery_pickup_slots','transition_bakery_order','get_admin_pickup_slots','set_pickup_slot_override','acknowledge_bakery_order','get_bakery_order_attention'] loop
    if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=v_name and not p.prosecdef) then
      raise exception 'Missing security invoker facade: %',v_name;
    end if;
    if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname=v_name and a.grantee=0 and a.privilege_type='EXECUTE') then
      raise exception 'Unexpected PUBLIC execute: %',v_name;
    end if;
    if v_name in ('transition_bakery_order','get_admin_pickup_slots','set_pickup_slot_override','acknowledge_bakery_order','get_bakery_order_attention') and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname=v_name and has_function_privilege('anon',p.oid,'execute')) then
      raise exception 'Anonymous admin RPC execute: %',v_name;
    end if;
  end loop;
end;
$$;
select 'BAKERY_ORDER_PERMISSIONS_OK' as result;
