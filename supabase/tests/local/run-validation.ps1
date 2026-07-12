$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$containerName = 'bakery-audit-validation-' + ([guid]::NewGuid().ToString('N').Substring(0, 10))
$mount = "type=bind,source=$repositoryRoot,target=/work,readonly"
$seedGenerator = Join-Path $repositoryRoot 'supabase\scripts\generate-seed.mjs'

try {
  & node $seedGenerator --check
  if ($LASTEXITCODE -ne 0) {
    throw 'The generated seed is stale or invalid.'
  }

  docker run --detach --rm --name $containerName --env POSTGRES_HOST_AUTH_METHOD=trust --mount $mount postgres:17-alpine -c wal_level=logical | Out-Null

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

  $serverVersionNumber = docker exec $containerName psql -U postgres -d postgres -Atc 'show server_version_num'
  if ($LASTEXITCODE -ne 0 -or -not $serverVersionNumber.StartsWith('17')) {
    throw "Expected PostgreSQL 17, received server_version_num=$serverVersionNumber."
  }

  Write-Output "POSTGRES_SERVER_VERSION_NUM=$serverVersionNumber"

  $migrationFiles = Get-ChildItem (Join-Path $repositoryRoot 'supabase\migrations') -Filter '*.sql' |
    Sort-Object Name |
    ForEach-Object { "/work/supabase/migrations/$($_.Name)" }

  $sqlFiles = @('/work/supabase/tests/local/bootstrap.sql') + $migrationFiles + @(
    '/work/supabase/seed.sql',
    '/work/supabase/tests/local/validate-audit.sql',
    '/work/supabase/tests/local/validate-public-contract.sql',
    '/work/supabase/tests/local/validate-security.sql'
  )

  foreach ($sqlFile in $sqlFiles) {
    docker exec $containerName psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f $sqlFile
    if ($LASTEXITCODE -ne 0) {
      throw "Validation failed while executing $sqlFile."
    }
  }

  Write-Output 'BAKERY_SECURITY_LOCAL_VALIDATION_OK'
}
finally {
  docker rm --force $containerName 2>$null | Out-Null
}
