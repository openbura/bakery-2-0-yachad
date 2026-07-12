# Yachad Bakery Supabase foundation

This directory is the local, versioned database foundation for the dedicated Bakery Supabase project. The repository remains intentionally unlinked; the approved migrations and initial seed were applied to the explicit Bakery project ref during Stage B.2.

## Isolation boundary

- The only future allowed Bakery project ref is `utyzqpjjjwjkkdlepkag` (`yachad-bakery-admin`, `eu-central-1`, `openbura's Org`).
- Denylisted refs are AM ROM `ehyiddjeiafulwsmhqbc` and CONNEX `vkcqkbgkuweldeuxnjjh`.
- Never link this directory to either denylisted project or to any other Supabase project.
- Never copy another project's URL, ref, Auth users, API keys, database password, migrations, or environment values.
- Never expose a secret key or `service_role` value to either browser application.
- `supabase/.temp/`, local `.env` files, passwords, access tokens, and generated keys are ignored.

No project ref is committed in `config.toml`. The `project_id` value is only a local Docker namespace.

## Current remote safety-gate result

The dedicated project `yachad-bakery-admin` in `openbura's Org`, region `eu-central-1`, is `ACTIVE_HEALTHY`. Its safe non-secret ref is `utyzqpjjjwjkkdlepkag`. Stage B.2 applied the approved foundation and seed, Stage B.3 connected the separate admin dashboard, and Stage C.0 completed the public catalog contract without connecting the public application. The verified Stage C.0 state is 10 categories, 78 products, 78 source snapshots, 2 option groups, 24 options, one store-settings row, one Auth user, one active admin and 36 preserved audit rows. The repository remains unlinked; every remote action used the explicit Bakery ref. AM ROM and CONNEX were not opened, queried, linked, or modified.

## Schema

- `categories`: ordered Hebrew catalog categories.
- `products`: public-safe product, integer-agorot price, source display/unit text, image, same-day and fulfillment availability fields.
- `product_option_groups` / `product_options`: normalized public option structure with nullable unlimited maximums and integer-agorot deltas.
- `store_settings`: singleton ordering, delivery, pickup, notice-window and integer-agorot fee/minimum settings.
- `admin_users`: Bakery-only authorization allowlist keyed to `auth.users`, with a constrained `owner` / `manager` operational role.
- `product_source_metadata`: trusted-server-only lossless catalog source payload and SHA-256; browser clients have no access.
- `audit_log`: append-only operational history written only by trusted database triggers.
- `private.set_updated_at()`: non-exposed trigger helper using invoker security.

### Append-only audit log

`20260711090000_add_bakery_audit_log.sql` normalizes the foundation to the approved agorot and customer-notice field contract, then creates `public.audit_log`, its RLS policy, indexes and two private trigger functions.

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

Anonymous users have no privileges on `audit_log`. Authenticated non-admins and inactive admins cannot read or write it. Active Bakery admins receive RLS-filtered `SELECT` only. No dashboard role has `INSERT`, `UPDATE`, or `DELETE` on the audit table, and no write policy exists. Trigger execution is the only normal audit-write path.

All public-schema tables have RLS enabled. Grants and policies are explicit because modern Supabase projects may not expose SQL-created tables automatically.

## Authorization model

1. Public/anonymous clients may read active categories, active products, active options and the singleton store settings row.
2. An authenticated user is not automatically an administrator.
3. Administrative access requires an active row in `public.admin_users` whose `user_id` equals `auth.uid()` and whose `role` is `owner` or `manager`.
4. `admin_users` can only be provisioned by a trusted database administrator; browser clients receive no insert/update/delete grant on it.
5. Authorization does not use user-editable `user_metadata`, and it does not depend on stale custom JWT claims.
6. Public signup and anonymous sign-in are disabled in local Auth configuration. Use an explicit invitation for each Bakery administrator.

### Restricted dashboard permissions

`20260712151416_tighten_bakery_admin_permissions.sql` is a forward-only correction applied after the original RLS and audit migrations. It removes every broad active-admin `FOR ALL` policy and all authenticated table-level mutation grants.

- Active `owner` and `manager` users may update only `products.price_agorot` and `products.available_today`.
- Active `owner` and `manager` users may update only ordering, delivery, pickup and customer-notice operational fields in `store_settings`.
- Fees, minimums, singleton identifiers, product identity/content/category/image/active state, per-product delivery/pickup availability, categories, options and source metadata are not browser-editable.
- Categories and active option data remain read-only. `product_source_metadata` has neither browser grants nor RLS policies and is intentionally inaccessible.
- Signed-in users may read only their own `admin_users` row. They cannot create an allowlist row or change any role/active value.
- `audit_log` remains append-only: active approved admins may select it, while all direct browser inserts, updates and deletes are revoked.
- `private.set_updated_at()` and the audit triggers remain the trusted database-side writers for managed timestamps and audit rows.

After a Bakery-only remote project and its first Auth user are approved, provision the allowlist row from a trusted SQL session:

```sql
insert into public.admin_users (user_id, display_name, role, active)
values ('<BAKERY_AUTH_USER_UUID>', 'Bakery owner', 'owner', true);
```

Do not place an email, password, UUID, token, or secret in migrations or seed files.

## Catalog seed

`seed.sql` is generated from the existing root `product-catalog-yachad.json` and must contain exactly 78 products and 10 categories.

```powershell
node supabase/scripts/generate-seed.mjs
node supabase/scripts/generate-seed.mjs --check
```

The seed is for local reset and controlled initial import. It starts the customer notice as inactive with type `info`, empty text and null start/end times. It does not create Auth users and must not be used as an uncontrolled production synchronization job.

Stage C.0 derives executable options only from complete structured `option_groups` in the approved source. The current contract contains one executable product (`salads-01`), 2 groups and 24 options. Four products retain unstructured source evidence pending owner confirmation, and seven false-positive source flags are not executable. See `PUBLIC_CATALOG_CONTRACT.md`.

The generated seed also copies `display_price_text` and `price_unit_note` into public-safe nullable product columns. The numeric `price_agorot` remains authoritative for all calculations.

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

The repeatable fallback suite runs the complete migration order and seed in an isolated, unlinked `postgres:17-alpine` Docker container:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/local/run-validation.ps1
```

It verifies seed freshness and PostgreSQL major version 17, then uses a read-only bind mount, no published database port, no persistent volume and removes the container in `finally`. It discovers every migration by filename, validates schema, constraints, RLS/grants, owner/manager column permissions, structural-write denial, append-only behavior, triggers, actor capture, notice lifecycle, seed idempotency, source identifiers, the 78/10/2/24 public contract and the scoped Realtime publication. The pgTAP files remain the intended full Supabase CLI suite when a local CLI is available.

## Dedicated remote project gate

- Organization: `openbura's Org` (`epratkpfbbeghgtkrtbv`), Pro.
- Project: `yachad-bakery-admin`, ref `utyzqpjjjwjkkdlepkag`, region `eu-central-1`.
- Creation estimate confirmed at USD 10/month for the smallest standard compute; usage, add-ons and applicable taxes can increase the invoice.
- No add-ons, plan change or Spend Cap change were made.
- Stage B.2 applied remote migration versions `20260711131949_create_bakery_core`, `20260711132008_enable_bakery_rls` and `20260711132027_add_bakery_audit_log`, followed by the initial 78-product seed.
- Stage B.3 Security Correction applied only `20260712152010_tighten_bakery_admin_permissions`. No seed or earlier migration was rerun, no Auth/admin user was created, and product/settings/audit values remained unchanged.
- Stage C.0 applied only `20260712182447_prepare_public_shop_product_contract`, `20260712182448_import_approved_public_catalog_contract` and `20260712182451_enable_public_shop_realtime`.
- Stage C.0 preserved every product price and availability value, store settings, the existing Auth/admin rows and all 36 audit events. It added the public-safe fields, normalized 2/24 options and published only `products` and `store_settings` for Postgres Changes.
- The admin dashboard remains connected. The public Bakery application and `/shop` remain on the local JSON source until Stage C.
- `REMOTE_MIGRATION_MAP.md` records the exact local-file to remote-history mapping and SHA-256 fingerprints for this checkpoint.

The post-correction Supabase Security Advisor reports one informational `rls_enabled_no_policy` item for `product_source_metadata`. This is intentional: RLS is enabled, there is no policy, and all `anon` / `authenticated` privileges are revoked, so the table is closed to browser clients. Performance advisor unused-index notices are expected before application traffic and do not justify removing approved indexes during this security correction.

## Environment templates

Dashboard browser configuration remains in `admin-dashboard/.env.example`:

- `VITE_BAKERY_ADMIN_SUPABASE_URL`
- `VITE_BAKERY_ADMIN_SUPABASE_PUBLISHABLE_KEY`

Only a publishable browser key may be used. No dashboard adapter is enabled in Stage B.1, so the approved mock state and prototype login remain unchanged.

The admin dashboard maps the database notice type `info` to the approved Hebrew UI. Stage C must use the same database values without widening the constraint.

## Rollback and recovery

- Local: `supabase db reset` reconstructs the database from migrations and seed.
- The approved migration chain has now been applied remotely. Never edit remote migration history or run the old destructive rollback sequence. Any correction must use a reviewed forward migration with a separate approval gate.
- Before any future remote apply: verify the explicit ref, capture an appropriate backup, review the SQL and prepare a forward recovery plan. Apply only to `utyzqpjjjwjkkdlepkag` after approval.
- Never use a destructive rollback against AM ROM, CONNEX or an implicitly selected project.
- External Stage B.1 backup: see the task report; it contains the complete approved dashboard, catalog, docs and Git bundle.
