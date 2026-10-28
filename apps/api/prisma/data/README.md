# Data kurikulum

Data mentah untuk `npm run content:import` (lihat `prisma/scripts/importCurriculum.ts`).

| Folder | Isi | Sumber & lisensi |
|---|---|---|
| `jlpt-vocab/n*.csv` | Kosakata JLPT N5–N1 | [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), berbasis daftar JLPT Jonathan Waller, [tanos.co.uk](http://www.tanos.co.uk/jlpt/) (CC BY) |
| `jlpt-vocab/id-n*.json` | Arti bahasa Indonesia + tema per kata | Diterjemahkan dengan Gemini (`npm run content:translate`) |
| `kanji-data/kanji.json` | Data kanji & level JLPT | [kanji-data](https://github.com/davidluzgouveia/kanji-data) oleh David Gouveia (MIT), berbasis KANJIDIC dari EDRDG (CC BY-SA 4.0) |
| `kanji-data/id-kanji.json` | Arti kanji bahasa Indonesia | Diterjemahkan dengan Gemini |
| `grammar/n*.json` | Pola tata bahasa, contoh, dan soal | Ditulis khusus untuk NihonGo |

Materi level Pemula ada di `prisma/scripts/pemulaData.ts`.

Impor aman dijalankan ulang: bab dan soal yang sudah ada (berdasarkan `source_key`) dilewati, jadi perubahan yang dibuat admin tidak tertimpa.
