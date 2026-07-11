# Bakery database tests

The database tests are designed for local-only execution. They must never run with `--linked`.

```powershell
supabase db reset
supabase test db
supabase db lint --level warning
```

The pgTAP suite covers schema, seed, existing RLS and append-only audit behavior:

- `001_bakery_schema.test.sql`
- `002_bakery_seed.test.sql`
- `003_bakery_rls.test.sql`
- `004_bakery_audit_log.test.sql`

The RLS/audit tests create transaction-scoped test users under `@yachad.invalid` and roll them back.

Because the Supabase CLI and pgTAP are not currently installed, the executable fallback suite uses the cached `postgres:13` Docker image:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/local/run-validation.ps1
```

The runner applies `bootstrap.sql`, the migrations in version order, `seed.sql`, and `validate-audit.sql` through `psql -f` from a read-only bind mount. It publishes no database port, persists no volume, connects to no remote project and removes the temporary container. The fallback validates PostgreSQL behavior but does not replace future PostgreSQL 17, PostgREST or Supabase CLI parity checks.
