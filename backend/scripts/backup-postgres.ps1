param(
  [string]$OutputDir = ".\backups"
)

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is required for backup."
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutputDir "llmxray-$timestamp.sql"

pg_dump $env:DATABASE_URL | Out-File -Encoding utf8 $file
Write-Output "Backup written to $file"
