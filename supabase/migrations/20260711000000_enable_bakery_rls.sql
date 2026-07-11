begin;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_option_groups enable row level security;
alter table public.product_options enable row level security;
alter table public.store_settings enable row level security;
alter table public.product_source_metadata enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_option_groups from anon, authenticated;
revoke all on table public.product_options from anon, authenticated;
revoke all on table public.store_settings from anon, authenticated;
revoke all on table public.product_source_metadata from anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.product_option_groups to anon, authenticated;
grant select on table public.product_options to anon, authenticated;
grant select on table public.store_settings to anon, authenticated;

grant select on table public.admin_users to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.product_option_groups to authenticated;
grant select, insert, update, delete on table public.product_options to authenticated;
grant update on table public.store_settings to authenticated;
grant select, insert, update, delete on table public.product_source_metadata to authenticated;

create policy "users can read their own bakery admin authorization"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "public can read active bakery categories"
on public.categories
for select
to anon, authenticated
using (active);

create policy "bakery admins can manage categories"
on public.categories
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create policy "public can read active bakery products"
on public.products
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.categories as category
    where category.id = products.category_id
      and category.active
  )
);

create policy "bakery admins can manage products"
on public.products
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create policy "public can read active bakery option groups"
on public.product_option_groups
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.products as product
    where product.id = product_option_groups.product_id
      and product.active
  )
);

create policy "bakery admins can manage option groups"
on public.product_option_groups
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create policy "public can read active bakery options"
on public.product_options
for select
to anon, authenticated
using (
  active
  and exists (
    select 1
    from public.product_option_groups as option_group
    join public.products as product on product.id = option_group.product_id
    where option_group.id = product_options.group_id
      and option_group.active
      and product.active
  )
);

create policy "bakery admins can manage options"
on public.product_options
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create policy "public can read bakery store settings"
on public.store_settings
for select
to anon, authenticated
using (id = 'default');

create policy "bakery admins can update store settings"
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
  )
)
with check (
  id = 'default'
  and exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create policy "bakery admins can manage source metadata"
on public.product_source_metadata
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

commit;
