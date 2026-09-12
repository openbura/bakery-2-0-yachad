begin;

alter table public.admin_users
  add column role text not null default 'manager',
  add constraint admin_users_role_known check (role in ('owner', 'manager'));

drop policy if exists "bakery admins can manage categories" on public.categories;
drop policy if exists "bakery admins can manage products" on public.products;
drop policy if exists "bakery admins can manage option groups" on public.product_option_groups;
drop policy if exists "bakery admins can manage options" on public.product_options;
drop policy if exists "bakery admins can manage source metadata" on public.product_source_metadata;
drop policy if exists "bakery admins can update store settings" on public.store_settings;
drop policy if exists "active bakery admins can read audit history" on public.audit_log;

revoke all privileges on table public.admin_users from authenticated;
revoke all privileges on table public.categories from authenticated;
revoke all privileges on table public.products from authenticated;
revoke all privileges on table public.product_option_groups from authenticated;
revoke all privileges on table public.product_options from authenticated;
revoke all privileges on table public.store_settings from authenticated;
revoke all privileges on table public.product_source_metadata from authenticated;
revoke all privileges on table public.audit_log from authenticated;

grant select on table public.admin_users to authenticated;
grant select on table public.categories to authenticated;
grant select on table public.products to authenticated;
grant select on table public.product_option_groups to authenticated;
grant select on table public.product_options to authenticated;
grant select on table public.store_settings to authenticated;
grant select on table public.audit_log to authenticated;

grant update (price_agorot, available_today)
on table public.products
to authenticated;

grant update (
  ordering_enabled,
  delivery_enabled,
  pickup_enabled,
  customer_notice_active,
  customer_notice_type,
  customer_notice_text,
  customer_notice_start_at,
  customer_notice_end_at
)
on table public.store_settings
to authenticated;

create policy "active bakery operators can update product operations"
on public.products
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
      and admin_user.role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
      and admin_user.role in ('owner', 'manager')
  )
);

create policy "active bakery operators can update store operations"
on public.store_settings
for update
to authenticated
using (
  id = 'default'
  and exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
      and admin_user.role in ('owner', 'manager')
  )
)
with check (
  id = 'default'
  and exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
      and admin_user.role in ('owner', 'manager')
  )
);

create policy "active bakery operators can read audit history"
on public.audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
      and admin_user.role in ('owner', 'manager')
  )
);

comment on column public.admin_users.role is
  'Bakery operational role. Browser clients cannot create or modify allowlist rows or roles.';

commit;
