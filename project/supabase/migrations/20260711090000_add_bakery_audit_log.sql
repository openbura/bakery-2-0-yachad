begin;

-- Normalize the still-local foundation to the approved operational contract.
-- No Bakery migration has been applied remotely, so this versioned step preserves
-- the existing business values while moving money fields to integer agorot.
alter table public.products rename column price_ils to price_agorot;
alter table public.products
  alter column price_agorot type integer
  using round(price_agorot * 100)::integer;
alter table public.products
  add column available_today boolean not null default true;

alter table public.store_settings rename column notice_active to customer_notice_active;
alter table public.store_settings rename column notice_type to customer_notice_type;
alter table public.store_settings rename column notice_text to customer_notice_text;
alter table public.store_settings rename column delivery_fee_ils to delivery_fee_agorot;
alter table public.store_settings
  alter column delivery_fee_agorot type integer
  using round(delivery_fee_agorot * 100)::integer;
alter table public.store_settings
  rename column minimum_delivery_subtotal_ils to minimum_delivery_subtotal_agorot;
alter table public.store_settings
  alter column minimum_delivery_subtotal_agorot type integer
  using round(minimum_delivery_subtotal_agorot * 100)::integer;
alter table public.store_settings
  add column pickup_fee_agorot integer not null default 0,
  add column customer_notice_start_at timestamptz,
  add column customer_notice_end_at timestamptz,
  add constraint store_settings_pickup_fee_nonnegative check (pickup_fee_agorot >= 0),
  add constraint store_settings_notice_window check (
    customer_notice_start_at is null
    or customer_notice_end_at is null
    or customer_notice_end_at >= customer_notice_start_at
  );

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint audit_log_actor_role check (
    actor_role is null or actor_role = 'bakery_admin'
  ),
  constraint audit_log_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint audit_log_entity_id_not_blank check (length(btrim(entity_id)) > 0),
  constraint audit_log_entity_type check (entity_type in ('product', 'store_settings')),
  constraint audit_log_action check (
    action in (
      'product.price_changed',
      'product.available_today_changed',
      'product.delivery_availability_changed',
      'product.pickup_availability_changed',
      'store.ordering_changed',
      'store.delivery_changed',
      'store.pickup_changed',
      'store.notice_published',
      'store.notice_updated',
      'store.notice_removed'
    )
  ),
  constraint audit_log_action_entity_match check (
    (entity_type = 'product' and action like 'product.%')
    or (entity_type = 'store_settings' and action like 'store.%')
  )
);

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated;
grant select on table public.audit_log to authenticated;

create policy "active bakery admins can read audit history"
on public.audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = (select auth.uid())
      and admin_user.active
  )
);

create index audit_log_created_at_desc_idx
on public.audit_log (created_at desc);

create index audit_log_entity_history_idx
on public.audit_log (entity_type, entity_id, created_at desc);

create index audit_log_actor_user_id_idx
on public.audit_log (actor_user_id);

create index audit_log_action_idx
on public.audit_log (action);

create or replace function private.audit_product_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_actor_user_id uuid := auth.uid();
  audit_actor_role text;
begin
  if audit_actor_user_id is not null and exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = audit_actor_user_id
      and admin_user.active
  ) then
    audit_actor_role := 'bakery_admin';
  end if;

  if old.price_agorot is distinct from new.price_agorot then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'product',
      new.id,
      'product.price_changed',
      jsonb_build_object('price_agorot', old.price_agorot),
      jsonb_build_object('price_agorot', new.price_agorot)
    );
  end if;

  if old.available_today is distinct from new.available_today then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'product',
      new.id,
      'product.available_today_changed',
      jsonb_build_object('available_today', old.available_today),
      jsonb_build_object('available_today', new.available_today)
    );
  end if;

  if old.available_for_delivery is distinct from new.available_for_delivery then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'product',
      new.id,
      'product.delivery_availability_changed',
      jsonb_build_object('available_for_delivery', old.available_for_delivery),
      jsonb_build_object('available_for_delivery', new.available_for_delivery)
    );
  end if;

  if old.available_for_pickup is distinct from new.available_for_pickup then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'product',
      new.id,
      'product.pickup_availability_changed',
      jsonb_build_object('available_for_pickup', old.available_for_pickup),
      jsonb_build_object('available_for_pickup', new.available_for_pickup)
    );
  end if;

  return new;
end;
$$;

create or replace function private.audit_store_settings_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_actor_user_id uuid := auth.uid();
  audit_actor_role text;
  old_notice jsonb;
  new_notice jsonb;
begin
  if audit_actor_user_id is not null and exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.user_id = audit_actor_user_id
      and admin_user.active
  ) then
    audit_actor_role := 'bakery_admin';
  end if;

  if old.ordering_enabled is distinct from new.ordering_enabled then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.ordering_changed',
      jsonb_build_object('ordering_enabled', old.ordering_enabled),
      jsonb_build_object('ordering_enabled', new.ordering_enabled)
    );
  end if;

  if old.delivery_enabled is distinct from new.delivery_enabled then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.delivery_changed',
      jsonb_build_object('delivery_enabled', old.delivery_enabled),
      jsonb_build_object('delivery_enabled', new.delivery_enabled)
    );
  end if;

  if old.pickup_enabled is distinct from new.pickup_enabled then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.pickup_changed',
      jsonb_build_object('pickup_enabled', old.pickup_enabled),
      jsonb_build_object('pickup_enabled', new.pickup_enabled)
    );
  end if;

  old_notice := jsonb_build_object(
    'customer_notice_active', old.customer_notice_active,
    'customer_notice_type', old.customer_notice_type,
    'customer_notice_text', old.customer_notice_text,
    'customer_notice_start_at', old.customer_notice_start_at,
    'customer_notice_end_at', old.customer_notice_end_at
  );
  new_notice := jsonb_build_object(
    'customer_notice_active', new.customer_notice_active,
    'customer_notice_type', new.customer_notice_type,
    'customer_notice_text', new.customer_notice_text,
    'customer_notice_start_at', new.customer_notice_start_at,
    'customer_notice_end_at', new.customer_notice_end_at
  );

  if not old.customer_notice_active and new.customer_notice_active then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.notice_published',
      old_notice,
      new_notice
    );
  elsif old.customer_notice_active and not new.customer_notice_active then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.notice_removed',
      old_notice,
      new_notice
    );
  elsif old.customer_notice_active
    and new.customer_notice_active
    and old_notice is distinct from new_notice then
    insert into public.audit_log (
      actor_user_id, actor_role, entity_type, entity_id, action, previous_value, new_value
    ) values (
      audit_actor_user_id,
      audit_actor_role,
      'store_settings',
      new.id,
      'store.notice_updated',
      old_notice,
      new_notice
    );
  end if;

  return new;
end;
$$;

revoke execute on function private.audit_product_changes() from public, anon, authenticated;
revoke execute on function private.audit_store_settings_changes() from public, anon, authenticated;

create trigger products_write_audit_log
after update of price_agorot, available_today, available_for_delivery, available_for_pickup
on public.products
for each row execute function private.audit_product_changes();

create trigger store_settings_write_audit_log
after update of
  ordering_enabled,
  delivery_enabled,
  pickup_enabled,
  customer_notice_active,
  customer_notice_type,
  customer_notice_text,
  customer_notice_start_at,
  customer_notice_end_at
on public.store_settings
for each row execute function private.audit_store_settings_changes();

comment on table public.audit_log is
  'Append-only Bakery operational audit history written only by trusted database triggers.';

commit;
