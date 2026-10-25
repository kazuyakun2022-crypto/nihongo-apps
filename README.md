# Nihongo bersama Neko-sensei

Aplikasi e-learning bahasa Jepang dengan AI maskot untuk latihan ngobrol yang menyesuaikan level pengguna.
Satu kode untuk web dan mobile (PWA). Rancangan lengkapnya ada di dokumen "Rancangan Fitur Aplikasi E-Learning Bahasa Jepang dengan AI Maskot".

## Isi monorepo

| Folder | Isi |
| --- | --- |
| `apps/api` | Backend REST API: Express, TypeScript, Prisma, PostgreSQL |
| `apps/web` | Frontend web + PWA: Next.js 14 (App Router), TypeScript, CSS Modules |
| `docker-compose.yml` | PostgreSQL 16 untuk development |

## Menjalankan di komputer sendiri

Kebutuhan: Node.js 20+, Docker (untuk PostgreSQL).

```bash
npm install                      # pasang semua dependensi (kedua aplikasi)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:up                    # jalankan PostgreSQL di Docker
npm run db:migrate               # buat tabel (beri nama migrasi, misalnya "init")
npm run db:seed                  # isi level, aturan AI, maskot, bab contoh, akun Admin

npm run dev:api                  # API di http://localhost:4000
npm run dev:web                  # Web di http://localhost:3000 (terminal lain)
```

Akun Admin dari seed: `admin@nihongo.local` / `Admin12345` (ganti sebelum production).

Tanpa `ANTHROPIC_API_KEY`, maskot memakai balasan tiruan (`MockChatProvider`) sehingga semua alur tetap bisa dicoba.
Link verifikasi email dan reset password dicetak di terminal API selama development.

Perintah lain: `npm test` (unit test backend), `npm run typecheck`, `npm run build`.

## Arsitektur backend (clean architecture per fitur)

```
apps/api/src/
├── modules/
│   ├── auth/            daftar, masuk, Tamu, sesi, verifikasi email, reset password, onboarding
│   ├── learning/        level, bab, kuis
│   ├── srs/             flashcard pengulangan berjeda (SM-2)
│   ├── conversation/    AI maskot: prompt per level, cek kanji, kuota, memori
│   └── users/           manajemen pengguna oleh Admin + audit log
├── shared/              error domain, config .env, middleware HTTP
└── main/
    ├── container.ts     composition root: merangkai semua implementasi
    ├── app.ts           routing Express
    └── server.ts        titik masuk
```

Setiap modul punya empat lapisan. Arah ketergantungan hanya ke dalam:

| Lapisan | Isi | Boleh bergantung pada |
| --- | --- | --- |
| `domain` | Entitas, aturan bisnis murni, interface (port) | Tidak ada |
| `application` | Use case, satu kelas per aksi pengguna | `domain` |
| `infrastructure` | Implementasi port: Prisma, bcrypt, JWT, Anthropic API | `domain` |
| `presentation` | Route Express, validasi input dengan zod | `application` |

Konsekuensinya:

- Use case bisa diuji tanpa database, cukup dengan implementasi palsu (lihat `tests/fakes.ts`).
- Mengganti penyedia (email, AI, OAuth, bahkan database) cukup dengan membuat kelas baru yang mengimplementasikan port, lalu mengubah satu baris di `main/container.ts`.
- Aturan bisnis (batas gagal login, nilai lulus kuis, kuota AI) ada di `domain`, mudah ditemukan dan diubah.

### Menambah fitur baru di backend

1. Buat `src/modules/<fitur>/` dengan empat folder lapisan.
2. Tulis tipe dan port di `domain`, lalu use case di `application`.
3. Implementasikan port di `infrastructure` (biasanya repository Prisma).
4. Buat route di `presentation`, rangkai di `main/container.ts`, daftarkan di `main/app.ts`.
5. Tambahkan test untuk use case di `tests/`.

### Endpoint utama

| Method | Path | Keterangan |
| --- | --- | --- |
| POST | `/api/auth/register`, `/login`, `/guest`, `/oauth` | Masuk dan daftar; refresh token disimpan di cookie httpOnly |
| POST | `/api/auth/refresh`, `/logout` (`?all=true`) | Perpanjang sesi, keluar |
| POST | `/api/auth/verify-email`, `/forgot-password`, `/reset-password` | Token sekali pakai |
| GET, PUT | `/api/auth/me`, `/api/auth/me/onboarding` | Profil dan onboarding |
| GET, POST | `/api/learning/levels`, `/levels/:id/chapters`, `/chapters/:id`, `/chapters/:id/quiz` | Materi |
| GET, POST | `/api/srs/due`, `/api/srs/cards/:id/review` | Review flashcard |
| POST | `/api/conversation/sessions`, `/sessions/:id/messages`, `/sessions/:id/end` | Ngobrol dengan maskot |
| GET, PATCH, POST | `/api/admin/users`, `/:id/role`, `/:id/suspend` | Khusus Admin |

## Arsitektur frontend

```
apps/web/src/
├── app/                 halaman Next.js (hanya merangkai komponen fitur)
│   ├── (auth)/          masuk, daftar, lupa-password
│   └── (app)/           beranda, belajar, ngobrol, review, profil (wajib login)
├── core/http/           API client: access token di memori, refresh otomatis saat 401
├── features/<fitur>/
│   ├── domain/          tipe dan interface repository
│   ├── data/            implementasi repository (panggilan API)
│   ├── application/     hook / context berisi logika layar
│   └── ui/              komponen tampilan
└── shared/
    ├── styles/tokens.css   SEMUA warna, huruf, jarak, sudut
    └── ui/                 komponen dasar: Button, TextField, Mascot, AppShell
```

`next.config.mjs` meneruskan `/api/*` ke backend, sehingga web dan API tampil satu origin dan cookie login aman untuk PWA (termasuk di iPhone).

## Redesign

1. **Ganti tema:** ubah nilai di `apps/web/src/shared/styles/tokens.css`. Komponen hanya memakai variabel peran seperti `--color-primary`, jadi seluruh aplikasi ikut berubah. Mode gelap ada di blok `prefers-color-scheme: dark` di file yang sama.
2. **Ganti font:** ubah URL di baris pertama `globals.css` dan `--font-family` di tokens.
3. **Ganti tata letak satu layar:** ubah file di `features/<fitur>/ui/`. Logika di `application/` tidak perlu disentuh.
4. **Ganti maskot:** ubah `shared/ui/Mascot.tsx` (SVG dengan tiga ekspresi: senang, berpikir, semangat) dan ikon di `public/icons/`.

## PWA

- `public/manifest.webmanifest` dan ikon membuat aplikasi bisa dipasang ke layar utama.
- `public/sw.js` menyimpan halaman dan aset untuk offline; `/api` tidak pernah di-cache. Naikkan `VERSION` setiap mengubah file ini.
- Service worker hanya aktif di build production (`npm run build && npm start -w apps/web`).
- Komponen `InstallPrompt` menampilkan tombol pasang (Android/desktop) atau panduan "Tambahkan ke Layar Utama" (iPhone).

## Yang perlu dilengkapi sebelum rilis

- [ ] Login Google/Apple: implementasikan `OAuthVerifier` (file `auth/infrastructure/adapters.ts`).
- [ ] Email sungguhan: implementasikan `EmailSender` dengan layanan email pilihanmu.
- [ ] Pembayaran Premium: modul baru untuk Midtrans/Xendit (tabel `subscriptions` sudah ada).
- [ ] Panel admin web untuk Pengajar dan Admin (API manajemen pengguna sudah ada).
- [ ] Mode suara: speech-to-text dan text-to-speech di modul `conversation`.
- [ ] Web push untuk pengingat belajar (handler `push` sudah ada di `sw.js`).
- [ ] Ganti `JWT_ACCESS_SECRET` dan password Admin, aktifkan HTTPS di production.
