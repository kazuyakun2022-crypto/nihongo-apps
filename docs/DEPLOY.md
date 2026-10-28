# Deploy & Alur Kerja Git

Web dan API berjalan di [Vercel](https://vercel.com) (paket Hobby), database di [Neon](https://neon.tech). Keduanya gratis tanpa kartu kredit.

| Lingkungan | Branch git | Web (project Vercel `nihongo-web`) | API (project Vercel `nihongo-api`) | Database Neon |
|---|---|---|---|---|
| Produksi | `main` | Production | Production | branch `main` |
| Staging | `dev` | Preview branch `dev` | Preview branch `dev` | branch `dev` |

- Web meneruskan `/api/*` ke API (`apps/web/next.config.mjs`), jadi pengguna hanya membuka alamat web dan cookie login tetap first-party.
- API Express dijalankan sebagai satu Vercel Function (`apps/api/api/index.ts`, `apps/api/vercel.json`).
- Hanya branch `main` dan `dev` yang di-deploy (`ignoreCommand` di kedua `vercel.json`). Branch fitur tidak di-deploy supaya tidak menjalankan migrasi ke database staging.

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
3. Merge ke `dev` → Vercel men-deploy staging. Coba di URL staging.
4. Siap rilis: buka PR `dev` → `main`. Merge → Vercel men-deploy produksi.

Mengubah `schema.prisma`? Buat migrasinya dulu (`npm run db:migrate -w apps/api -- --name nama_perubahan`) dan commit folder migrasinya. CI gagal jika schema berubah tanpa migrasi. Migrasi dijalankan otomatis saat build API di Vercel (`prisma migrate deploy`).

## Setup pertama kali

### 1. Proteksi branch di GitHub

**Settings → Rules → Rulesets → New branch ruleset** (Enforcement: **Active**):
- `main` (target *Include default branch*): Restrict deletions, Block force pushes, Require a pull request (0 approval), Require status checks → **check** (job CI)
- `dev` (target pola `dev`): Restrict deletions, Block force pushes

### 2. Database di Neon

1. Daftar di [neon.tech](https://neon.tech) (bisa pakai akun GitHub) → **New Project**: nama `nihongo`, Postgres 16, region **AWS Asia Pacific (Singapore)**.
2. Project otomatis punya branch `main` (produksi). Buat branch kedua: **Branches → New branch** → nama `dev` (staging).
3. Untuk tiap branch: **Connect** → matikan **Connection pooling** → salin connection string (`postgresql://…?sslmode=require`).

### 3. Project API di Vercel

1. Daftar di [vercel.com](https://vercel.com) pakai GitHub (paket **Hobby**) → **Add New → Project** → import repo `nihongo-apps`.
2. **Project Name** `nihongo-api`, **Root Directory** `apps/api`, Framework Preset **Other**. Build/Output dibiarkan default (diatur `vercel.json`).
3. **Environment Variables** (untuk *Production*):

   | Variabel | Isi |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Connection string Neon branch `main` |
   | `JWT_ACCESS_SECRET` | String acak ≥ 32 karakter. PowerShell: `-join ((1..64) \| % { '{0:x}' -f (Get-Random -Max 16) })` |
   | `WEB_ORIGIN` | `https://nihongo-web.vercel.app` (ubah setelah URL web asli diketahui) |
   | `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY` | Kunci AI; kosong = maskot tiruan |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login Google; boleh kosong |

4. **Deploy**. Cek `https://<url-api>/api/health` → `{"ok":true,…}`.

### 4. Project Web di Vercel

1. **Add New → Project** → repo yang sama. **Project Name** `nihongo-web`, **Root Directory** `apps/web`, Framework **Next.js**.
2. Environment Variables (*Production*): `API_URL` = URL API produksi (mis. `https://nihongo-api.vercel.app`), `NEXT_PUBLIC_GOOGLE_CLIENT_ID` bila memakai login Google.
3. **Deploy**. Jika URL web berbeda dari tebakan di langkah 3, perbaiki `WEB_ORIGIN` di project API lalu **Redeploy**. `API_URL` dibaca saat build: setiap mengubahnya, redeploy web.

### 5. Staging (branch `dev`)

Di kedua project → **Settings → Environment Variables** → tambah variabel untuk environment **Preview**, pilih branch **`dev`**:

| Project | Variabel | Isi |
|---|---|---|
| API | `DATABASE_URL` | Connection string Neon branch `dev` |
| API | `JWT_ACCESS_SECRET` | String acak lain (beda dari produksi) |
| API | `NODE_ENV` | `production` |
| API | `WEB_ORIGIN` | `https://nihongo-web-git-dev-<nama-akun>.vercel.app` |
| Web | `API_URL` | `https://nihongo-api-git-dev-<nama-akun>.vercel.app` |

Lalu di kedua project → **Settings → Deployment Protection** → matikan **Vercel Authentication**. Jika tetap menyala, URL preview minta login Vercel dan web staging tidak bisa memanggil API staging. Push ke `dev` (atau **Redeploy** deployment terakhir `dev`) untuk menerapkan. URL staging yang tetap ada di **Deployments → filter branch `dev` → Domains**.

### 6. Isi data awal database

Jalankan dari laptop setelah API pertama kali sukses deploy (tabel dibuat oleh migrasi saat build). Ulangi dengan connection string branch `dev` untuk staging.

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

Pengaturan pendaftaran, bank soal penempatan, dan aturan ujian diatur dari halaman admin setelah login sebagai Super Admin. Untuk login Google, tambahkan URL web produksi & staging ke *Authorized JavaScript origins* di Google Cloud Console.

## Batasan paket gratis

- Vercel Hobby hanya untuk pemakaian non-komersial (cocok untuk tugas akhir). Fungsi API maksimal 60 detik per request.
- Request pertama setelah lama tidak dipakai sedikit lebih lambat (fungsi dan database Neon "bangun" dulu, biasanya 1–3 detik).
- Neon gratis: 0,5 GB per project, cukup untuk aplikasi ini.
