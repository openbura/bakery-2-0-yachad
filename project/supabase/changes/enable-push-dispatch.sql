-- FUTURE RELEASE ONLY: not part of the local bootstrap. Do not execute against
-- production without separate approval. Provision these Vault secrets first:
-- bakery_push_dispatch_url = approved project's /functions/v1/dispatch-push
-- bakery_push_worker_secret = the same random secret used by the Edge function.
-- VAPID private key stays only in Edge secrets, never in browser/SQL/Git.
begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
do $$ begin
  if not exists(select 1 from vault.decrypted_secrets where name='bakery_push_dispatch_url' and decrypted_secret='https://utyzqpjjjwjkkdlepkag.supabase.co/functions/v1/dispatch-push')
    or not exists(select 1 from vault.decrypted_secrets where name='bakery_push_worker_secret' and length(decrypted_secret)>=32) then raise exception 'Provision approved push Vault configuration before enabling dispatch'; end if;
end;$$;
create or replace function private.request_bakery_push_dispatch() returns bigint
language plpgsql security definer set search_path='' as $$
declare v_url text; v_secret text; v_id bigint;
begin
  if not exists(select 1 from private.bakery_push_config where singleton and enabled)
    or not exists(select 1 from private.bakery_push_deliveries where attempts<5 and expires_at>now() and next_at<=now() and (status='pending' or(status='processing' and lease_until<=now()))) then return null; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name='bakery_push_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='bakery_push_worker_secret';
  if v_url is distinct from 'https://utyzqpjjjwjkkdlepkag.supabase.co/functions/v1/dispatch-push' or length(coalesce(v_secret,''))<32 then return null; end if;
  select net.http_post(url:=v_url,headers:=jsonb_build_object('Content-Type','application/json','x-bakery-push-worker-key',v_secret),body:='{}'::jsonb,timeout_milliseconds:=10000) into v_id;
  return v_id;
end;$$;
create or replace function private.wake_bakery_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.request_bakery_push_dispatch();
  return null;
exception when others then
  -- The persistent queue survives. Cron retries; orders must not fail because
  -- the optional network wakeup could not be queued. Do not log secrets/URLs.
  return null;
end;$$;
revoke all on function private.request_bakery_push_dispatch(),private.wake_bakery_push() from public,anon,authenticated,service_role;
create trigger bakery_push_wakeup after insert on private.bakery_push_deliveries for each statement execute function private.wake_bakery_push();
select cron.schedule('bakery-push-retry','* * * * *','select private.request_bakery_push_dispatch();');
commit;
