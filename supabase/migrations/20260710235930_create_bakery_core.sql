begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  name_he text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_id_format check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_name_not_blank check (length(btrim(name_he)) > 0),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table public.products (
  id text primary key,
  category_id text not null references public.categories (id) on update cascade on delete restrict,
  name_he text not null,
  description_he text not null default '',
  price_ils numeric(10, 2) not null,
  image_url text not null default '',
  image_filename text not null default '',
  active boolean not null default true,
  available_for_delivery boolean not null default true,
  available_for_pickup boolean not null default true,
  sort_order integer not null default 0,
  has_options boolean not null default false,
  options_summary text not null default '',
  owner_needs_to_confirm boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_id_format check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint products_name_not_blank check (length(btrim(name_he)) > 0),
  constraint products_price_nonnegative check (price_ils >= 0),
  constraint products_sort_order_nonnegative check (sort_order >= 0)
);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on update cascade on delete cascade,
  code text not null,
  name_he text not null,
  sort_order integer not null default 0,
  required boolean not null default false,
  min_select integer not null default 0,
  max_select integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_option_groups_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint product_option_groups_name_not_blank check (length(btrim(name_he)) > 0),
  constraint product_option_groups_sort_order_nonnegative check (sort_order >= 0),
  constraint product_option_groups_selection_bounds check (
    min_select >= 0 and max_select >= 1 and max_select >= min_select
  ),
  unique (product_id, code)
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.product_option_groups (id) on delete cascade,
  code text not null,
  name_he text not null,
  price_delta_ils numeric(10, 2) not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint product_options_name_not_blank check (length(btrim(name_he)) > 0),
  constraint product_options_sort_order_nonnegative check (sort_order >= 0),
  unique (group_id, code)
);

create table public.store_settings (
  id text primary key default 'default',
  ordering_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  notice_active boolean not null default false,
  notice_type text not null default 'information',
  notice_text text not null default '',
  delivery_fee_ils numeric(10, 2) not null default 15,
  minimum_delivery_subtotal_ils numeric(10, 2) not null default 70,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id = 'default'),
  constraint store_settings_notice_type check (notice_type in ('information', 'warning', 'closed')),
  constraint store_settings_notice_length check (length(notice_text) <= 500),
  constraint store_settings_delivery_fee_nonnegative check (delivery_fee_ils >= 0),
  constraint store_settings_delivery_minimum_nonnegative check (minimum_delivery_subtotal_ils >= 0)
);

create table public.product_source_metadata (
  product_id text primary key references public.products (id) on update cascade on delete cascade,
  catalog_sha256 text not null,
  source_payload jsonb not null,
  imported_at timestamptz not null default now(),
  constraint product_source_metadata_hash_format check (catalog_sha256 ~ '^[a-f0-9]{64}$'),
  constraint product_source_metadata_payload_object check (jsonb_typeof(source_payload) = 'object')
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger admin_users_set_updated_at
before update on public.admin_users
for each row execute function private.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

create trigger product_option_groups_set_updated_at
before update on public.product_option_groups
for each row execute function private.set_updated_at();

create trigger product_options_set_updated_at
before update on public.product_options
for each row execute function private.set_updated_at();

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function private.set_updated_at();

create index categories_active_sort_idx
on public.categories (sort_order, id)
where active;

create index products_category_sort_idx
on public.products (category_id, sort_order, id);

create index products_public_catalog_idx
on public.products (sort_order, id)
where active;

create index products_delivery_availability_idx
on public.products (sort_order, id)
where active and available_for_delivery;

create index products_pickup_availability_idx
on public.products (sort_order, id)
where active and available_for_pickup;

create index product_option_groups_product_sort_idx
on public.product_option_groups (product_id, sort_order, id);

create index product_options_group_sort_idx
on public.product_options (group_id, sort_order, id);

comment on table public.admin_users is 'Bakery-only authorization allowlist keyed to Supabase Auth users.';
comment on table public.categories is 'Public-safe Bakery catalog categories.';
comment on table public.products is 'Public-safe Bakery product catalog and operational availability.';
comment on table public.product_source_metadata is 'Admin-only lossless snapshot of source catalog records.';
comment on table public.store_settings is 'Singleton operational and ordering settings for the Bakery.';

commit;
