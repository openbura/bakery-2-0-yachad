# Yachad Bakery Supabase foundation

This directory is the local, versioned database foundation for the dedicated Bakery Supabase project. It is intentionally not linked to any remote project yet, and no migration or seed has been applied remotely.

## Isolation boundary

- The only future allowed Bakery project ref is `utyzqpjjjwjkkdlepkag` (`yachad-bakery-admin`, `eu-central-1`, `openbura's Org`).
- Denylisted refs are AM ROM `ehyiddjeiafulwsmhqbc` and CONNEX `vkcqkbgkuweldeuxnjjh`.
- Never link this directory to either denylisted project or to any other Supabase project.
- Never copy another project's URL, ref, Auth users, API keys, database password, migrations, or environment values.
- Never expose a secret key or `service_role` value to either browser application.
- `supabase/.temp/`, local `.env` files, passwords, access tokens, and generated keys are ignored.

No project ref is committed in `config.toml`. The `project_id` value is only a local Docker namespace.

## Current remote safety-gate result

The empty dedicated project `yachad-bakery-admin` was created in `openbura's Org` in `eu-central-1` and reached `ACTIVE_HEALTHY`. Its safe non-secret ref is `utyzqpjjjwjkkdlepkag`. This repository remains unlinked: the project has not received migrations, seed data, Auth users, application connections, keys, or environment values. AM ROM and CONNEX were not opened, queried, linked, or modified.

## Schema

- `categories`: ordered Hebrew catalog categories.
- `products`: public-safe product, integer-agorot price, image, same-day and fulfillment availability fields.
- `product_option_groups` / `product_options`: normalized future option structure.
- `store_settings`: singleton ordering, delivery, pickup, notice-window and integer-agorot fee/minimum settings.
- `admin_users`: Bakery-only authorization allowlist keyed to `auth.users`.
- `product_source_metadata`: admin-only lossless catalog source payload and SHA-256.
- `audit_log`: append-only operational history written only by trusted database triggers.
- `private.set_updated_at()`: non-exposed trigger helper using invoker security.

### Append-only audit log

`20260711090000_add_bakery_audit_log.sql` normalizes the still-local foundation to the approved agorot and customer-notice field contract, then creates `public.audit_log`, its RLS policy, indexes and two private trigger functions.

Each event contains:

- authenticated actor/user id
- action/event type
- affected entity type and id
- previous and new values as structured JSON
- server-generated timestamp
- database-generated UUID and `statement_timestamp()`

Stable tracked actions:

- `product.price_changed`
- `product.available_today_changed`
- `product.delivery_availability_changed`
- `product.pickup_availability_changed`
- `store.ordering_changed`
- `store.delivery_changed`
- `store.pickup_changed`
- `store.notice_published`
- `store.notice_updated`
- `store.notice_removed`

`private.audit_product_changes()` emits one row per changed tracked product field. `private.audit_store_settings_changes()` emits fixed operational actions and a single notice lifecycle event. Both are trigger-only `SECURITY DEFINER` functions with `search_path = ''`, fully qualified relations, fixed action identifiers and revoked browser execution. Inserts and no-op updates create no audit rows.

Anonymous users have no table privileges. Authenticated non-admins and inactive admins cannot read or write. Active Bakery admins receive RLS-filtered `SELECT` only. No dashboard role has `INSERT`, `UPDATE`, or `DELETE`, and no write policy exists. Trigger execution is the only normal audit-write path.

All public-schema tables have RLS enabled. Grants and policies are explicit because modern Supabase projects may not expose SQL-created tables automatically.

## Authorization model

1. Public/anonymous clients may read active categories, active products, active options and the singleton store settings row.
2. An authenticated user is not automatically an administrator.
3. Administrative access requires an active row in `public.admin_users` whose `user_id` equals `auth.uid()`.
4. `admin_users` can only be provisioned by a trusted database administrator; browser clients receive no insert/update/delete grant on it.
5. Authorization does not use user-editable `user_metadata`, and it does not depend on stale custom JWT claims.
6. Public signup and anonymous sign-in are disabled in local Auth configuration. Use an explicit invitation for each Bakery administrator.

After a Bakery-only remote project and its first Auth user are approved, provision the allowlist row from a trusted SQL session:

```sql
insert into public.admin_users (user_id, display_name)
values ('<BAKERY_AUTH_USER_UUID>', 'Bakery owner');
```

Do not place an email, password, UUID, token, or secret in migrations or seed files.

## Catalog seed

`seed.sql` is generated from the existing root `product-catalog-yachad.json` and must contain exactly 78 products and 10 categories.

```powershell
node supabase/scripts/generate-seed.mjs
node supabase/scripts/generate-seed.mjs --check
```

The seed is for local reset and controlled initial import. It does not create Auth users and must not be used as an uncontrolled production synchronization job.

Structured option rows are intentionally empty until the Bakery owner approves the source options. The schema is ready, but Stage B.1 does not invent option data.

## Local workflow

Docker is available, but the Supabase CLI was not installed during Stage B.1. Do not install it globally. After explicit approval, use a pinned local CLI or the official supported package-manager flow, then discover commands with `--help`:

```powershell
supabase --version
supabase --help
supabase start
supabase db reset
supabase test db
supabase db lint --level warning
```

Never use `--linked` for local tests. Never run `db push`, remote SQL, or migrations until the remote project identity is verified as Bakery-only.

The repeatable fallback suite runs the complete migration order and seed in an isolated, unlinked `postgres:13` Docker container:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/local/run-validation.ps1
```

It uses a read-only bind mount, no published database port, no persistent volume and removes the container in `finally`. It validates schema, constraints, RLS/grants, append-only behavior, triggers, actor capture, notice lifecycle, no-op handling, seed noise and catalog/settings regressions. This is a PostgreSQL fallback; the pgTAP files remain the intended Supabase/Postgres 17 suite when a local CLI is available.

## Dedicated remote project gate

- Organization: `openbura's Org` (`epratkpfbbeghgtkrtbv`), Pro.
- Project: `yachad-bakery-admin`, ref `utyzqpjjjwjkkdlepkag`, region `eu-central-1`.
- Creation estimate confirmed at USD 10/month for the smallest standard compute; usage, add-ons and applicable taxes can increase the invoice.
- No add-ons, plan change or Spend Cap change were made.
- Stage B.1.1 remains local-only. Do not link or apply anything until a separate Stage B.2 approval explicitly names `utyzqpjjjwjkkdlepkag`.

## Environment templates

Dashboard browser configuration remains in `admin-dashboard/.env.example`:

- `VITE_BAKERY_ADMIN_SUPABASE_URL`
- `VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY`

Only a publishable browser key may be used. No dashboard adapter is enabled in Stage B.1, so the approved mock state and prototype login remain unchanged.

## Rollback and recovery

- Local: `supabase db reset` reconstructs the database from migrations and seed.
- Audit migration rollback, before any remote apply: remove the two audit triggers, drop the two private audit functions, drop `public.audit_log`, then reverse the local field renames/type conversions only in a fresh disposable database. Never edit migration history after it has been applied remotely.
- Before a future remote apply: verify the explicit ref, capture a schema/data backup, review the migration SQL and prepare a separate forward rollback migration. Apply only to `utyzqpjjjwjkkdlepkag` after approval.
- Never use a destructive rollback against AM ROM, CONNEX or an implicitly selected project.
- External Stage B.1 backup: see the task report; it contains the complete approved dashboard, catalog, docs and Git bundle.
