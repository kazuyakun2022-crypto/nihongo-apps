# ==============================================================================
# Script Otomatisasi Injeksi Data ke Database PRODUCTION (NihonGo)
# Jalankan dari root project: .\isi-production.ps1
# Atau: powershell -ExecutionPolicy Bypass -File .\isi-production.ps1
# ==============================================================================

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [string]$ProdUrl = "",

    [Parameter()]
    [switch]$AutoYes = $false
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apiDir = Join-Path $scriptDir "apps\api"

if (-not (Test-Path $apiDir)) {
    Write-Error "Folder apps\api tidak ditemukan. Jalankan skrip ini dari root folder project nihonggo-apps."
    exit 1
}

Set-Location $apiDir

# 1. Cek DATABASE_URL Production
$envFile = Join-Path $apiDir ".env.production.local"
if ([string]::IsNullOrWhiteSpace($ProdUrl) -and (Test-Path $envFile)) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^PROD_DATABASE_URL=(.+)$' } | Select-Object -First 1
    if ($line) {
        $extracted = $line -replace '^PROD_DATABASE_URL=', ''
        if ($extracted -ne "ISI_DENGAN_URL_PRODUCTION" -and -not [string]::IsNullOrWhiteSpace($extracted)) {
            $ProdUrl = $extracted
            Write-Host "URL database production dibaca dari apps/api/.env.production.local" -ForegroundColor Cyan
        }
    }
}

if ([string]::IsNullOrWhiteSpace($ProdUrl)) {
    Write-Host "Tempel DATABASE_URL Production (klik kanan / Paste), lalu tekan Enter:" -ForegroundColor Yellow
    $ProdUrl = Read-Host
}

# Bersihkan karakter spasi / kutip
$ProdUrl = $ProdUrl.Trim().Trim("`"").Trim("'")

if ([string]::IsNullOrWhiteSpace($ProdUrl)) {
    Write-Error "DATABASE_URL production kosong. Proses dibatalkan."
    exit 1
}

$env:DATABASE_URL = $ProdUrl

# Tampilkan host tanpa password
try {
    $uri = [System.Uri]$ProdUrl
    $hostInfo = "$($uri.Host):$($uri.Port)$($uri.AbsolutePath)"
    Write-Host "`nTarget Database: $hostInfo" -ForegroundColor Green
} catch {
    Write-Host "`nTarget Database URL format non-standard, tetap dilanjutkan." -ForegroundColor Yellow
}

if (-not $AutoYes) {
    $confirm = Read-Host "Benar ini database PRODUCTION yang dituju? Ketik 'ya' untuk lanjut"
    if ($confirm.Trim().ToLower() -ne "ya") {
        Write-Host "Dibatalkan oleh pengguna." -ForegroundColor Red
        exit 0
    }
} else {
    Write-Host "Konfirmasi otomatis aktif (-AutoYes). Menjalankan dalam 3 detik..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

Write-Host "`n== 1/5 Migrasi schema basis data production ==" -ForegroundColor Cyan
npx prisma migrate deploy --schema prisma/schema.prisma

Write-Host "`n== 2/5 Bab dataset JLPT + bank soal ujian ==" -ForegroundColor Cyan
npx tsx prisma/scripts/importCurriculum.ts

Write-Host "`n== 3/5 Kurikulum utama Pre-N5 s.d. N1, materi, prompt AI, aturan ujian ==" -ForegroundColor Cyan
npm run content:kurikulum

Write-Host "`n== 3b/5 Sinkronisasi 15 Skenario Gambar Situasi Resmi ==" -ForegroundColor Cyan
npx tsx prisma/scripts/seedAllImageScenarios.ts

Write-Host "`n== 4/5 Kamus (gambar, ungkapan, kosakata, kanji, tata bahasa) ==" -ForegroundColor Cyan
npm run content:kamus

Write-Host "`n== 4b/5 Bank soal Simulasi JLPT (1.468 soal lengkap N5-N1 semua Daimon) ==" -ForegroundColor Cyan
npx tsx prisma/scripts/jlptBank.ts injeksi --ya

Write-Host "`n== 5/5 Verifikasi data production ==" -ForegroundColor Cyan
$verifyScript = @"
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const levels = await db.level.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true } });
  console.log("\n--- REKAP KURIKULUM & KAMUS ---");
  for (const l of levels) {
    const kamus = await db.dictionaryEntry.count({ where: { levelId: l.id, status: "published" } });
    const bab = await db.chapter.count({ where: { levelId: l.id, status: "published" } });
    console.log(`${l.code.padEnd(7)} kamus: ${String(kamus).padStart(5)}  bab terbit: ${bab}`);
  }
  const scenarios = await db.scenario.count({ where: { status: "published" } });
  const jlptSim = await db.examQuestion.count({ where: { examType: "jlpt_sim", status: "published" } });
  const levelUp = await db.examQuestion.count({ where: { examType: "level_up" } });
  console.log("\n--- REKAP SKENARIO & BANK SOAL ---");
  console.log(`Skenario Gambar Percakapan : ${scenarios} skenario aktif`);
  console.log(`Soal Simulasi JLPT (Resmi) : ${jlptSim} soal terbit (Daimon N5-N1)`);
  console.log(`Soal Level-Up & Placement  : ${levelUp} soal`);
  await db.$disconnect();
})();
"@

$tempVerifyFile = Join-Path $apiDir "prisma\scripts\_cek_prod.ts"
Set-Content -Path $tempVerifyFile -Value $verifyScript -Encoding UTF8
try {
    npx tsx prisma/scripts/_cek_prod.ts
} finally {
    if (Test-Path $tempVerifyFile) {
        Remove-Item -Path $tempVerifyFile -Force
    }
}

Remove-Item Env:\DATABASE_URL

Write-Host "`n[SUKSES] Seluruh data berhasil dinaikkan ke database PRODUCTION!`n" -ForegroundColor Green

