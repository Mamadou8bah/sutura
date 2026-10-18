param([string]$DatabaseUrl = "")
$ErrorActionPreference = "Stop"
$backendDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../sutura"))
if ($DatabaseUrl) {
    if ($DatabaseUrl -notmatch '^jdbc:postgresql://(127\.0\.0\.1|localhost):[0-9]+/[A-Za-z0-9_]+_deployment_test$') {
        throw "Use a disposable local PostgreSQL database ending in _deployment_test."
    }
    $env:TEST_DATABASE_URL = $DatabaseUrl
    $env:TEST_DATABASE_DRIVER = "org.postgresql.Driver"
    $env:DEPLOYMENT_TEST_DATABASE_URL = $DatabaseUrl
    $env:DEPLOYMENT_TEST_DATABASE_USER = $env:TEST_DATABASE_USER
    $env:DEPLOYMENT_TEST_DATABASE_PASSWORD = $env:TEST_DATABASE_PASSWORD
} elseif ($env:TEST_DATABASE_URL -or $env:DEPLOYMENT_TEST_DATABASE_URL) {
    throw "Database environment variables are already set; pass the explicit disposable -DatabaseUrl or clear them."
}
Push-Location -LiteralPath $backendDirectory
try {
    Write-Host "Running Sutura proposal regression checks. External integrations use test fixtures."
    if ($DatabaseUrl) {
        & ./mvnw.cmd -B "-Dspring.flyway.enabled=true" "-Dspring.jpa.hibernate.ddl-auto=validate" test
    } else {
        & ./mvnw.cmd -B test
    }
    if ($LASTEXITCODE -ne 0) { throw "Sutura acceptance checks failed (exit $LASTEXITCODE)." }
    Write-Host "Sutura automated checks passed. Complete the live two-service demonstration separately."
} finally { Pop-Location }
