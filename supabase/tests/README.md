# Bakery database tests

The database tests are designed for local-only execution. They must never run with `--linked`.

```powershell
supabase db reset
supabase test db
supabase db lint --level warning
```

The pgTAP suite covers schema, seed, restricted RLS/grants and append-only audit behavior:

- `001_bakery_schema.test.sql`
- `002_bakery_seed.test.sql`
- `003_bakery_rls.test.sql`
- `004_bakery_audit_log.test.sql`
- `005_bakery_admin_permissions.test.sql`

The RLS/audit/security tests create transaction-scoped test users under `@yachad.invalid` and roll them back. The security suite covers anonymous, non-admin, inactive admin, active owner and active manager behavior; exact Product and Store Settings column grants; structural-write denial; self-profile isolation; and append-only audit enforcement.

Because the Supabase CLI and pgTAP are not currently installed, the executable fallback suite uses the official `postgres:17-alpine` Docker image:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/local/run-validation.ps1
```

The runner first verifies that the generated seed is current, confirms PostgreSQL major version 17, then applies `bootstrap.sql`, every migration in version order, `seed.sql`, `validate-audit.sql` and `validate-security.sql` through `psql -f` from a read-only bind mount. It publishes no database port, persists no volume, connects to no remote project and removes the temporary container. The fallback validates PostgreSQL 17 schema, seed, exact column grants, RLS, structural-write denial and audit behavior, but does not replace future PostgREST or full Supabase CLI parity checks.
