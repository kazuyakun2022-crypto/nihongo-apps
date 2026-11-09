# Bank Soal Simulasi JLPT

Simulasi JLPT memakai paket soal per tingkat (N5–N1, Paket 01–10, plus soal campuran untuk "Paket acak").
Modul `soal:jlpt` membuat paket dengan AI, menyimpan hasil review ke file, dan mengisi database lain (production) dari file itu.

Semua perintah dijalankan dari folder `apps/api`.

## Alur

```
buat ──▶ review di admin ──▶ ekspor ──▶ commit ──▶ injeksi
(AI → DRAFT     (edit, hapus,      (DB lokal →    (git)     (file → DB tujuan,
 di DB lokal)    Terbitkan)         file bank)               mis. production)
```

Production selalu diisi dari **file bank hasil ekspor**, bukan dari draft mentah AI. Hasil edit admin tersimpan di database,
jadi ekspor dulu setelah review supaya editannya ikut.

## 1. Membuat paket dengan AI

```
npm run soal:jlpt -- buat --tingkat N4,N3 --paket 2-5
```

- Satu paket ±15–25 menit (N5 62 soal sampai N2 105 soal), dibuat berurutan.
- Soal dibuat Gemini dari kosakata & tata bahasa tingkat itu, lalu kunci jawabannya diperiksa model kedua (Groq).
- Hasil masuk database **ini** (`DATABASE_URL` di `.env`) sebagai **draft**: belum terlihat siswa.
- Soal yang sudah ada tidak pernah ditimpa, jadi aman menjalankan ulang.
- Kuota AI gratis habis di tengah jalan? Jalankan perintah yang sama nanti. Proses lanjut dari titik terakhir dan paket yang sudah jadi dilewati.
- Kuota dipakai bersama fitur AI aplikasi; buat paket di luar jam ramai.

## 2. Review di admin

Admin → Konten → Ujian & Tes Penempatan → **Simulasi JLPT** → pilih tingkat.
Di panel **Paket simulasi**: *Lihat soal* untuk memeriksa (kalimat, kunci, pengecoh, audio), edit atau hapus soal yang keliru,
lalu **Terbitkan**. Soal AI tetap perlu dibaca manusia: salah ketik dan kalimat janggal tidak selalu tertangkap pemeriksa otomatis.

## 3. Ekspor ke file

```
npm run soal:jlpt -- ekspor
```

Menulis `prisma/data/jlpt-sim/bank/<tingkat>/paket-XX.json` (dan `campuran.json`) lengkap dengan status terbit/draft
dan `sourceKey` tiap soal. Commit folder `bank/` bersama perubahan kode.

Filter opsional: `--tingkat N5` dan `--paket 2-4`.

## 4. Injeksi ke database tujuan

Selalu uji dulu:

```
DATABASE_URL="<connection string tujuan>" npm run soal:jlpt -- injeksi --uji
```

Tampil rencana per tingkat & paket: jumlah soal **baru**, **diperbarui**, dan status akhirnya. Tidak ada yang ditulis.
Kalau rencananya benar, jalankan tanpa `--uji`. Untuk database selain localhost, ketik `ya` saat diminta.

Yang dilakukan injeksi:
1. Memvalidasi **semua** file dulu. Satu file rusak berarti tidak ada yang ditulis.
2. Menolak bila sebuah `sourceKey` sudah dipakai soal jenis/tingkat lain.
3. Menulis per paket dalam satu transaksi. Soal yang sudah ada (sama `sourceKey`) diperbarui, bukan digandakan.
4. Menghitung ulang isi database dan membandingkan dengan rencana.

Opsi:

| Opsi | Arti |
|---|---|
| `--status=ikut-file` | Bawaan. Status mengikuti file; paket yang belum direview tetap draft |
| `--status=draft` | Semua soal masuk draft (ditinjau ulang di admin tujuan) |
| `--tarik-yang-hilang` | Soal terbit di tujuan yang sudah dihapus dari file paketnya ditarik ke draft (tidak dihapus) |
| `--tingkat`, `--paket` | Batasi tingkat/paket yang diinjeksi |
| `--ya` | Lewati konfirmasi (dipakai `isi-production.sh`) |

## Mengisi production

`bash isi-production.sh` (root project) sudah menjalankan `injeksi --ya` setelah impor kurikulum dan kamus,
memakai connection string production dari `apps/api/.env.production.local`.

Hanya bank soal yang perlu diperbarui? Jalankan langsung, mulai dengan `--uji`:

```
DATABASE_URL="<connection string Neon main>" npm run soal:jlpt -- injeksi --uji
DATABASE_URL="<connection string Neon main>" npm run soal:jlpt -- injeksi
```

Di PowerShell: `$env:DATABASE_URL = "..."` lalu jalankan perintahnya.

## Format file

Satu file = satu paket. Field per soal: `sourceKey` (identitas tetap), `status`, `section`, `questionType` (tipe Daimon,
mis. `KANJI_READING`, `SENTENCE_COMPOSITION`, `TASK_BASED`), `promptText` (garis bawah ditulis `<u>…</u>`), `passage`
(teks bacaan Dokkai / skrip Choukai), `audioScript` (audio dibuat lewat TTS aplikasi) atau `audioUrl`, `options`,
`correctOptionIndex` (1-based), `explanation`. Detail dan validasi lengkap: `src/modules/exam/domain/jlptImport.ts`.

Paket dari luar (ditulis tim) bisa juga diimpor lewat tombol **Impor paket JSON** di admin (boleh beberapa file sekaligus),
atau ditaruh di folder `bank/` lalu diinjeksi.
