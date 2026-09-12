begin;

select plan(35);

select has_table('public', 'admin_users', 'admin_users table exists');
select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'product_option_groups', 'product_option_groups table exists');
select has_table('public', 'product_options', 'product_options table exists');
select has_table('public', 'store_settings', 'store_settings table exists');
select has_table('public', 'product_source_metadata', 'product_source_metadata table exists');
select has_table('public', 'audit_log', 'audit_log table exists');

select has_pk('public', 'admin_users', 'admin_users has a primary key');
select has_pk('public', 'categories', 'categories has a primary key');
select has_pk('public', 'products', 'products has a primary key');
select has_pk('public', 'store_settings', 'store_settings has a primary key');
select has_pk('public', 'audit_log', 'audit_log has a primary key');

select has_column('public', 'products', 'price_agorot', 'products includes price_agorot');
select has_column('public', 'products', 'available_today', 'products includes same-day availability');
select has_column('public', 'products', 'available_for_delivery', 'products includes delivery availability');
select has_column('public', 'products', 'available_for_pickup', 'products includes pickup availability');
select has_column('public', 'products', 'display_price_text', 'products includes public display price text');
select has_column('public', 'products', 'price_unit_note', 'products includes public unit price note');
select has_column('public', 'product_options', 'price_delta_agorot', 'product options use integer agorot');
select hasnt_column('public', 'product_options', 'price_delta_ils', 'legacy decimal option price is removed');
select col_is_null('public', 'product_option_groups', 'max_select', 'max_select is nullable for unlimited selection');
select has_column('public', 'store_settings', 'ordering_enabled', 'store settings includes ordering state');
select has_column('public', 'store_settings', 'customer_notice_text', 'store settings includes customer notice');
select has_column('public', 'store_settings', 'customer_notice_start_at', 'store settings includes notice start time');
select has_column('public', 'store_settings', 'customer_notice_end_at', 'store settings includes notice end time');
select has_column('public', 'store_settings', 'delivery_fee_agorot', 'store settings uses agorot for delivery fee');
select has_column('public', 'store_settings', 'pickup_fee_agorot', 'store settings includes pickup fee');
select has_column('public', 'audit_log', 'previous_value', 'audit log includes previous JSON');
select has_column('public', 'audit_log', 'new_value', 'audit log includes new JSON');

select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), 'categories has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.products'::regclass), 'products has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.store_settings'::regclass), 'store_settings has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.product_source_metadata'::regclass), 'source metadata has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'audit log has RLS enabled');

select * from finish();
rollback;
