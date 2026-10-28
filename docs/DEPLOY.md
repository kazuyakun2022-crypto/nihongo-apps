# Deploy & Alur Kerja Git

Web dan API berjalan di [Render](https://render.com), database di [Neon](https://neon.tech). Keduanya gratis tanpa kartu kredit.

| Lingkungan | Branch git | Web | API | Database (Neon) |
|---|---|---|---|---|
| Produksi | `main` | `nihongo-web` | `nihongo-api` | branch `main` |
| Staging | `dev` | `nihongo-web-staging` | `nihongo-api-staging` | branch `dev` |

Layanan Render diatur di [`render.yaml`](../render.yaml). Web meneruskan `/api/*` ke API (lihat `apps/web/next.config.mjs`), jadi pengguna hanya membuka alamat web.

## Alur kerja git

```
fitur/xyz ──PR──▶ dev ──PR──▶ main
                   │            │
                staging      produksi
```

1. Mulai dari `dev` terbaru (satu perintah per baris; PowerShell 5 tidak mengenal `&&`):
   ```
   git checkout dev
   git pull
   git checkout -b fitur/nama-fitur
   ```
2. Commit, push, lalu buka Pull Request ke `dev`. CI (`.github/workflows/ci.yml`) mengecek migrasi, typecheck, test, dan build.
3. Merge ke `dev` → staging ter-deploy otomatis setelah CI hijau. Coba di URL staging.
4. Siap rilis: buka PR `dev` → `main`. Merge → produksi ter-deploy otomatis setelah CI hijau.

Mengubah `schema.prisma`? Buat migrasinya dulu (`npm run db:migrate -w apps/api -- --name nama_perubahan`) dan commit folder migrasinya. CI gagal jika schema berubah tanpa migrasi. Migrasi dijalankan otomatis saat API start di Render.

## Setup pertama kali

### 1. Branch `dev` dan proteksi branch

```
git checkout main
git pull
git checkout -b dev
git push -u origin dev
```

Di GitHub → **Settings → Rules → Rulesets → New branch ruleset** (Enforcement: **Active**):
- `main` (target *Include default branch*): Restrict deletions, Block force pushes, Require a pull request (0 approval), Require status checks → **check** (job CI)
- `dev` (target pola `dev`): Restrict deletions, Block force pushes

### 2. Buat database di Neon

1. Daftar di [neon.tech](https://neon.tech) (bisa pakai akun GitHub) → **New Project**: nama `nihongo`, Postgres 16, region **AWS Asia Pacific (Singapore)**.
2. Project otomatis punya branch `main` (produksi). Buat branch kedua: **Branches → New branch** → nama `dev` (staging).
3. Untuk tiap branch: **Connect** → matikan **Connection pooling** → salin connection string (`postgresql://…?sslmode=require`). Migrasi Prisma butuh koneksi langsung, bukan pooled.

### 3. Buat layanan di Render

1. Masuk Render (daftar pakai GitHub) → **New → Blueprint** → hubungkan repo `nihongo-apps`, branch `main`.
2. Render membaca `render.yaml` dan meminta nilai variabel bertanda `sync: false`:

   | Variabel | Isi |
   |---|---|
   | `DATABASE_URL` (API) | Connection string Neon branch `main` (staging: branch `dev`) |
   | `WEB_ORIGIN` (API) | `https://nihongo-web.onrender.com` (staging: `https://nihongo-web-staging.onrender.com`) |
   | `API_URL` (Web) | `https://nihongo-api.onrender.com` (staging: `https://nihongo-api-staging.onrender.com`) |
   | `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | Kunci AI; kosong = maskot tiruan |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Login Google; boleh kosong |

3. Klik **Apply**. Setelah selesai, cek URL asli tiap layanan di dashboard. Jika nama `onrender.com` sudah dipakai orang lain, Render menambah akhiran acak — ubah `API_URL`/`WEB_ORIGIN` sesuai URL asli lalu **Manual Deploy** web (`API_URL` dibaca saat build).
4. Login Google: tambahkan URL web produksi & staging ke *Authorized JavaScript origins* di Google Cloud Console.

### 4. Isi data awal database

Jalankan dari laptop setelah API pertama kali sukses deploy (tabel dibuat oleh migrasi saat API start). Ulangi dengan connection string branch `dev` untuk staging.

PowerShell:

```powershell
cd apps/api
$env:DATABASE_URL = "<connection string Neon>"
$env:NODE_ENV = "production"
$env:SEED_SUPERADMIN_EMAIL = "email-kamu@contoh.com"
$env:SEED_SUPERADMIN_PASSWORD = "password-kuat-min-12"
npm run db:seed
npm run content:import   # impor kurikulum lengkap (opsional)
```

Variabel `$env:` hanya berlaku di jendela PowerShell itu. Tutup jendelanya setelah selesai supaya perintah berikutnya tidak tanpa sengaja mengenai database produksi.

Pengaturan pendaftaran, bank soal penempatan, dan aturan ujian diatur dari halaman admin setelah login sebagai Super Admin.

## Batasan paket gratis

- Layanan web/API gratis **tidur setelah 15 menit tanpa akses**; akses pertama berikutnya butuh ±1 menit. Untuk demo/sidang, buka web beberapa menit sebelumnya, atau naikkan `plan` API & web produksi ke `starter` di `render.yaml`.
- Neon gratis: 0,5 GB per project, cukup untuk aplikasi ini. Database tidur saat tidak dipakai dan bangun otomatis dalam <1 detik.
- Jam gratis dibagi semua layanan dalam satu workspace (750 jam/bulan).
