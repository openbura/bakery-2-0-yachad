begin;

do $realtime$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  elsif exists (
    select 1 from pg_publication
    where pubname = 'supabase_realtime' and puballtables
  ) then
    raise exception 'supabase_realtime must be a scoped publication';
  end if;

  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename in (
        'admin_users',
        'audit_log',
        'product_source_metadata',
        'categories',
        'product_option_groups',
        'product_options'
      )
  ) then
    raise exception 'Protected or structural Bakery tables must not be in supabase_realtime';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'store_settings'
  ) then
    alter publication supabase_realtime add table public.store_settings;
  end if;
end
$realtime$;

comment on publication supabase_realtime is
  'Bakery operational Realtime invalidation surface. Only products and store_settings are added by Stage C.0.';

commit;
