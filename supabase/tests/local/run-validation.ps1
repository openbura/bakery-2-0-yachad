$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$containerName = 'bakery-audit-validation-' + ([guid]::NewGuid().ToString('N').Substring(0, 10))
$mount = "type=bind,source=$repositoryRoot,target=/work,readonly"

try {
  docker run --detach --rm --name $containerName --env POSTGRES_HOST_AUTH_METHOD=trust --mount $mount postgres:13 | Out-Null

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    docker exec $containerName pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $ready) {
    throw 'The isolated PostgreSQL container did not become ready.'
  }

  $sqlFiles = @(
    '/work/supabase/tests/local/bootstrap.sql',
    '/work/supabase/migrations/20260710235930_create_bakery_core.sql',
    '/work/supabase/migrations/20260711000000_enable_bakery_rls.sql',
    '/work/supabase/migrations/20260711090000_add_bakery_audit_log.sql',
    '/work/supabase/seed.sql',
    '/work/supabase/tests/local/validate-audit.sql'
  )

  foreach ($sqlFile in $sqlFiles) {
    docker exec $containerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f $sqlFile
    if ($LASTEXITCODE -ne 0) {
      throw "Validation failed while executing $sqlFile."
    }
  }

  Write-Output 'BAKERY_AUDIT_LOCAL_VALIDATION_OK'
}
finally {
  docker rm --force $containerName 2>$null | Out-Null
}
