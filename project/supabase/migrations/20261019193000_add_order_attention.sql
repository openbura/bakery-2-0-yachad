-- Local implementation only. Separate acknowledgment never changes order status,
-- payment status or the updated_at value used by status-transition CAS.
begin;
create table public.order_attention (
  order_id uuid primary key references public.orders(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  acknowledged_by uuid not null references auth.users(id)
);
alter table public.order_attention enable row level security;
revoke all on public.order_attention from public,anon,authenticated;
grant select on public.order_attention to authenticated;
create policy "bakery admins read attention" on public.order_attention for select to authenticated
using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.active and a.role in ('owner','manager')));

create function private.acknowledge_bakery_order(p_order_id uuid) returns public.order_attention
language plpgsql security definer set search_path='' as $$
declare v_ack public.order_attention;
begin
  if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active and a.role in ('owner','manager')) then raise exception 'NOT_AUTHORIZED'; end if;
  if p_order_id is null or not exists(select 1 from public.orders where id=p_order_id) then raise exception 'ORDER_NOT_FOUND'; end if;
  insert into public.order_attention(order_id,acknowledged_by) values(p_order_id,auth.uid()) on conflict(order_id) do nothing;
  select * into strict v_ack from public.order_attention where order_id=p_order_id;
  return v_ack;
end; $$;
create function public.acknowledge_bakery_order(p_order_id uuid) returns public.order_attention
language sql security invoker set search_path='' as $$ select * from private.acknowledge_bakery_order(p_order_id); $$;

create function private.get_bakery_order_attention(p_after_number bigint default 0,p_limit integer default 200)
returns table(id uuid,order_number bigint,customer_name text,fulfillment_type text,total_agorot integer,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.admin_users a where a.user_id=auth.uid() and a.active and a.role in ('owner','manager')) then raise exception 'NOT_AUTHORIZED'; end if;
  return query select o.id,o.order_number,o.customer_name,o.fulfillment_type,o.total_agorot,o.created_at
    from public.orders o left join public.order_attention a on a.order_id=o.id
    where o.status='pending_approval' and a.order_id is null and o.order_number>coalesce(p_after_number,0)
    order by o.order_number limit least(greatest(coalesce(p_limit,200),1),500);
end; $$;
create function public.get_bakery_order_attention(p_after_number bigint default 0,p_limit integer default 200)
returns table(id uuid,order_number bigint,customer_name text,fulfillment_type text,total_agorot integer,created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.get_bakery_order_attention(p_after_number,p_limit); $$;

revoke all on function private.acknowledge_bakery_order(uuid),public.acknowledge_bakery_order(uuid),private.get_bakery_order_attention(bigint,integer),public.get_bakery_order_attention(bigint,integer) from public,anon,authenticated;
grant execute on function private.acknowledge_bakery_order(uuid),public.acknowledge_bakery_order(uuid),private.get_bakery_order_attention(bigint,integer),public.get_bakery_order_attention(bigint,integer) to authenticated;

-- Admin-only Realtime accelerates refetch. Durable polling remains the fallback.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.orders,public.order_attention;
  end if;
end; $$;
commit;
