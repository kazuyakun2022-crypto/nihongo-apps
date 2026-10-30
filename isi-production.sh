#!/usr/bin/env bash
# Mengisi data pelajaran, skenario, prompt AI, bank soal ujian, dan kamus ke database PRODUCTION.
# Jalankan dari root project: bash isi-production.sh
set -euo pipefail

cd "$(dirname "$0")/apps/api"

# URL bisa diberikan lewat argumen: bash isi-production.sh 'postgresql://...'
# Tanpa argumen, skrip menanyakannya (ketikan terlihat agar jelas sudah masuk).
# Argumen: URL (opsional) dan --ya untuk melewati pertanyaan konfirmasi
PROD_URL=""
AUTO_YES=""
for arg in "$@"; do
  if [[ "$arg" == "--ya" ]]; then AUTO_YES=1; else PROD_URL="$arg"; fi
done
# Atau ditulis di apps/api/.env.production.local sebagai PROD_DATABASE_URL=... (diabaikan git)
ENV_FILE=".env.production.local"
if [[ -z "$PROD_URL" && -f "$ENV_FILE" ]]; then
  PROD_URL=$(grep -E '^PROD_DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
  if [[ "$PROD_URL" == "ISI_DENGAN_URL_PRODUCTION" ]]; then
    echo "Isi dulu PROD_DATABASE_URL di apps/api/$ENV_FILE lalu simpan."
    exit 1
  fi
  [[ -n "$PROD_URL" ]] && echo "URL dibaca dari apps/api/$ENV_FILE"
fi
if [[ -z "$PROD_URL" ]]; then
  echo "Tempel DATABASE_URL production (klik kanan > Paste, atau Shift+Insert), lalu tekan Enter:"
  read -r PROD_URL
  # Hapus baris yang berisi password dari layar
  printf '\033[1A\033[2K'
  echo "(URL diterima)"
fi
# Buang spasi/kutip yang ikut tertempel
PROD_URL=$(printf '%s' "$PROD_URL" | tr -d '\r' | sed -e "s/^[[:space:]'\"]*//" -e "s/[[:space:]'\"]*$//")
if [[ -z "$PROD_URL" ]]; then
  echo "DATABASE_URL kosong, dibatalkan."
  exit 1
fi
# Variabel environment ini dipakai menggantikan DATABASE_URL lokal di .env
export DATABASE_URL="$PROD_URL"

# Tampilkan host tujuan (tanpa password) supaya tidak salah database
HOST_INFO=$(node -e 'const u=new URL(process.env.DATABASE_URL);console.log(u.hostname+":"+(u.port||5432)+u.pathname)')
echo "Database tujuan: $HOST_INFO"
if [[ -n "$AUTO_YES" ]]; then
  echo "Konfirmasi otomatis (--ya). Mulai dalam 5 detik, tekan Ctrl+C untuk batal..."
  sleep 5
else
  read -rp "Benar ini database PRODUCTION? Ketik 'ya' untuk lanjut: " OK
  [[ "$OK" == "ya" ]] || { echo "Dibatalkan."; exit 1; }
fi

echo
echo "== 1/5 Cek status migrasi =="
# Tabel baru (kamus, blok materi, skenario, aturan ujian) harus sudah ada
npx prisma migrate status --schema prisma/schema.prisma

echo
echo "== 2/5 Bab dataset JLPT + bank soal ujian (termasuk N1) =="
npx tsx prisma/scripts/importCurriculum.ts

echo
echo "== 3/5 Kurikulum utama Pre-N5 s.d. N1, skenario, prompt AI, aturan ujian =="
npm run content:kurikulum

echo
echo "== 4/5 Kamus (gambar, ungkapan, kosakata, kanji, tata bahasa) =="
npm run content:kamus

echo
echo "== 5/5 Verifikasi isi kamus per level =="
cat > prisma/scripts/_cek_kamus.ts <<'EOF'
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const levels = await db.level.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true } });
  for (const l of levels) {
    const n = await db.dictionaryEntry.count({ where: { levelId: l.id, status: "published" } });
    const bab = await db.chapter.count({ where: { levelId: l.id, status: "published" } });
    console.log(`${l.code.padEnd(7)} kamus: ${String(n).padStart(5)}  bab terbit: ${bab}`);
  }
  await db.$disconnect();
})();
EOF
npx tsx prisma/scripts/_cek_kamus.ts
rm -f prisma/scripts/_cek_kamus.ts

unset DATABASE_URL PROD_URL
echo
echo "Selesai. Buka halaman Kamus di production dan refresh."
