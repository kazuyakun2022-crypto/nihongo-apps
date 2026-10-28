# Deploy & Alur Kerja Git

Aplikasi berjalan di [Render](https://render.com) dengan dua lingkungan:

| Lingkungan | Branch | Web | API | Database |
|---|---|---|---|---|
| Produksi | `main` | `nihongo-web` | `nihongo-api` | `nihongo-db` (berbayar, ±US$6/bln) |
| Staging | `dev` | `nihongo-web-staging` | `nihongo-api-staging` | `nihongo-db-staging` (gratis, 30 hari) |

Semua diatur di [`render.yaml`](../render.yaml). Web meneruskan `/api/*` ke API (lihat `apps/web/next.config.mjs`), jadi pengguna hanya membuka alamat web.

## Alur kerja git

```
fitur/xyz ──PR──▶ dev ──PR──▶ main
                   │            │
                staging      produksi
```

1. Mulai dari `dev` terbaru: `git checkout dev && git pull && git checkout -b fitur/nama-fitur`
2. Commit, push, lalu buka Pull Request ke `dev`. CI (`.github/workflows/ci.yml`) mengecek migrasi, typecheck, test, dan build.
3. Merge ke `dev` → staging ter-deploy otomatis setelah CI hijau. Coba di URL staging.
4. Siap rilis: buka PR `dev` → `main`. Merge → produksi ter-deploy otomatis setelah CI hijau.

Mengubah `schema.prisma`? Buat migrasinya dulu (`npm run db:migrate -w apps/api -- --name nama_perubahan`) dan commit folder migrasinya. CI gagal jika schema berubah tanpa migrasi. Migrasi dijalankan otomatis saat API start di Render.

## Setup pertama kali

### 1. Branch `dev` dan proteksi branch

```bash
git checkout main && git pull
git checkout -b dev && git push -u origin dev
```

Di GitHub → **Settings → Branches → Add branch ruleset** untuk `main` dan `dev`:
- Require a pull request before merging
- Require status checks to pass → pilih **check** (job CI)

### 2. Buat layanan di Render

1. Masuk Render → **New → Blueprint** → hubungkan repo `nihongo-apps`, branch `main`.
2. Render membaca `render.yaml` dan meminta nilai variabel bertanda `sync: false`:

   | Variabel | Isi |
   |---|---|
   | `WEB_ORIGIN` (API) | `https://nihongo-web.onrender.com` (staging: `https://nihongo-web-staging.onrender.com`) |
   | `API_URL` (Web) | `https://nihongo-api.onrender.com` (staging: `https://nihongo-api-staging.onrender.com`) |
   | `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | Kunci AI; kosong = maskot tiruan |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login Google; boleh kosong |

3. Klik **Apply**. Setelah selesai, cek URL asli tiap layanan di dashboard. Jika nama `onrender.com` sudah dipakai orang lain, Render menambah akhiran acak — ubah `API_URL`/`WEB_ORIGIN` sesuai URL asli lalu **Manual Deploy** web (`API_URL` dibaca saat build).
4. Login Google: tambahkan URL web produksi & staging ke *Authorized JavaScript origins* di Google Cloud Console.

### 3. Isi data awal database

Paket gratis tidak punya Shell, jadi seed dijalankan dari laptop memakai **External Database URL** (Render → database → Connect):

```bash
cd apps/api
# Bash / Git Bash
DATABASE_URL="<external database url>" NODE_ENV=production \
SEED_SUPERADMIN_EMAIL="email-kamu@contoh.com" SEED_SUPERADMIN_PASSWORD="password-kuat-min-12" \
npm run db:seed
# lalu impor kurikulum lengkap (opsional)
DATABASE_URL="<external database url>" npm run content:import
```

Pengaturan pendaftaran, bank soal penempatan, dan aturan ujian diatur dari halaman admin setelah login sebagai Super Admin.

## Batasan paket gratis

- Layanan web/API gratis **tidur setelah 15 menit tanpa akses**; akses pertama berikutnya butuh ±1 menit. Untuk demo/sidang, buka web beberapa menit sebelumnya, atau naikkan `plan` API & web produksi ke `starter` di `render.yaml`.
- Database staging gratis dihapus Render setelah 30 hari; buat ulang dari dashboard bila perlu.
- Jam gratis dibagi semua layanan dalam satu workspace (750 jam/bulan).
