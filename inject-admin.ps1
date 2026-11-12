# ==============================================================================
# Script Otomatis Injeksi Akun Admin & Super Admin NihonGo
# Jalankan dari root project: .\inject-admin.ps1
# Atau: powershell -ExecutionPolicy Bypass -File .\inject-admin.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$DbUrl = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $scriptDir "apps\api"

if (-not (Test-Path $apiDir)) {
    Write-Error "Folder apps\api tidak ditemukan. Jalankan script ini dari root repo."
    exit 1
}

# 1. Cek apakah ada URL tersimpan di .env.production.local
$envFile = Join-Path $apiDir ".env.production.local"
if ([string]::IsNullOrWhiteSpace($DbUrl) -and (Test-Path $envFile)) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^(?:PROD_)?DATABASE_URL=(.+)$' } | Select-Object -First 1
    if ($line) {
        $extracted = $line -replace '^(?:PROD_)?DATABASE_URL=', ''
        if ($extracted -ne "ISI_DENGAN_URL_PRODUCTION" -and -not [string]::IsNullOrWhiteSpace($extracted)) {
            $DbUrl = $extracted
            Write-Host "URL database dibaca dari apps/api/.env.production.local" -ForegroundColor Cyan
        }
    }
}

# 2. Jika belum ada, minta input dari pengguna
if ([string]::IsNullOrWhiteSpace($DbUrl)) {
    Write-Host "`nTempel DATABASE_URL target (klik kanan / Paste), lalu tekan Enter:" -ForegroundColor Yellow
    $DbUrl = Read-Host
}

$DbUrl = $DbUrl.Trim().Trim("`"").Trim("'")

if ([string]::IsNullOrWhiteSpace($DbUrl)) {
    Write-Error "DATABASE_URL kosong. Proses dibatalkan."
    exit 1
}

Set-Location $apiDir
npx tsx prisma/scripts/injectAdmin.ts "$DbUrl"

