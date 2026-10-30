Modul Kurikulum Pembelajaran Bahasa Jepang Standar JLPT (Pre-N5 s.d. N1) Platform NihonGo

Dokumen ini merupakan spesifikasi kurikulum master terintegrasi untuk platform e-learning NihonGo. Kurikulum ini dirancang untuk memenuhi standar kompetensi Japanese-Language Proficiency Test (JLPT) dari tingkat pemula absolut (Pre-N5) hingga tingkat mahir (N1). Setiap modul mengintegrasikan penguasaan sistem penulisan (Kana & Kanji), tata bahasa (Bunpou), perbendaharaan kata (Goi), kemampuan mendengar (Choukai), membaca (Dokkai), kuis evaluasi bab, serta skenario percakapan interaktif bersama maskot AI Neko-sensei.

1. Pendahuluan & Arsitektur Kurikulum NihonGo

1.1 Visi Pedagogy & Struktur Hierarkis

Kurikulum NihonGo mengadopsi pendekatan communicative language teaching yang dipadukan dengan Spaced Repetition System (SRS SM-2) dan AI-assisted conversational scaffolding. Tujuan utamanya adalah mengeliminasi speaking anxiety serta memberikan jalur pembelajaran yang terukur.

Materi disusun secara hierarkis dalam empat tingkatan struktur data:

1. Level: Tingkat kemampuan standar JLPT (, , , , , ).
2. Module: Kelompok topik besar dalam satu level (misalnya: Fonetik & Kana, Komunikasi Harian, Persiapan Kerja SSW, Bahasa Bisnis).
3. Chapter (Bab): Unit pembelajaran mandiri yang memuat indikator pencapaian, materi inti, dan syarat kelulusan (skor kuis minimal 80).
4. Sub-component: Komponen materi spesifik yang mencakup Kosakata (Vocabularies), Kanji (KanjiList), Tata Bahasa (Grammars), Kuis Evaluasi (Quizzes), dan Skenario Percakapan AI (AIScenarios).

1.2 Matriks Konfigurasi AI Neko-sensei per Level

Setiap level memiliki parameter otomatisasi AI yang mengontrol tingkat kompleksitas kalimat, aturan furigana, dan kecepatan artikulasi suara (speech rate) agar Neko-sensei selalu memberikan respons yang sesuai dengan ambang pemahaman siswa:

Parameter AI	Level Pre-N5	Level N5	Level N4	Level N3	Level N2	Level N1
Aturan Furigana	Full (Romaji+Kana)	Full ()	Full ()	Kanji Sulit Saja ()	Tanpa Furigana ()	Tanpa Furigana ()
Max Words / Sentence	5 – 7 kata	7 – 10 kata	12 – 15 kata	15 – 20 kata	Tanpa Batas	Tanpa Batas
Speech Rate (TTS)	0.70x	0.75x	0.80x	0.90x	1.00x	1.00x
Bahasa Penjelas Utama	Bahasa Indonesia	Indonesia + Jepang	Indonesia + Jepang	Indonesia (Mikro)	Full Jepang	Full Jepang
Bentuk Kata Kerja	Masu/Desu	Masu/Desu	Kamus/Kasual	Kasual/Keigo	Keigo Bisnis	Keigo/Sastra

2. Modul Level Pre-N5: Fondasi Kana, Fonetik & Aisatsu (Pemula Absolut)

2.1 Target Kompetensi & Metrik

* Target Audience: Pembelajar tanpa latar belakang bahasa Jepang (nol pengalaman).
* Capaian Pembelajaran: Mampu membaca dan menulis 46 Hiragana & 46 Katakana dengan urutan goresan (stroke order) yang benar, menguasai sistem fonetik Jepang, menyebutkan angka 1–10.000, serta menggunakan salam harian (Aisatsu).
* Target Kosakata: 150 kata dasar (ditulis dalam Kana & Romaji).
* Target Kanji: 0 karakter (fokus pemantapan huruf dasar).

2.2 Rincian Bab Materi Pre-N5

Bab 1: Sistem Huruf Hiragana (ひらがな) & Kanvas Penulisan

* Fokus Penulisan:
  * Seion (Bunyi Dasar): あ い う え お s.d. わ を ん (46 huruf).
  * Dakuon (Tenten ) & Handakuon (Maru ): が・ざ・だ・ば・ぱ.
  * Yoon (Bunyi Kombinasi): きゃ・きゅ・きょ.
* Materi Tata Bahasa:
  * Pola Kalimat Identitas:  (Penyataan identitas).
  * Partikel Kepemilikan:  (Contoh:  = Buku saya).
* Contoh Kosakata:  (Saya),  (Buku),  (Kucing),  (Bunga Sakura).
* Skenario Neko-sensei: Perkenalan Nama Sederhana.

Bab 2: Sistem Huruf Katakana (カタカナ) & Kata Serapan (外来語)

* Fokus Penulisan:
  * Katakana Dasar Seion, Dakuon, Handakuon, Yoon.
  * Bunyi Panjang Katakana (Chouonpu ) & Bunyi Rangkap (Sokuon 小さい ツ/ッ).
* Materi Tata Bahasa:
  * Pola Kalimat Negatif Dasar:  / .
* Contoh Kosakata:  (Kopi),  (Hotel),  (Indonesia),  (Televisi).
* Skenario Neko-sensei: Menanyakan Kebangsaan & Kata Serapan.

Bab 3: Fonetik, Angka & Sistem Waktu

* Fokus Pembelajaran:
  * Angka 1 s.d. 10.000 (, , , , ).
  * Menyebutkan Jam (), Menit (), dan Jam Buka Toko.
* Materi Tata Bahasa:
  * Pola Pertanyaan:  (Jam berapa...?).
* Skenario Neko-sensei: Menanyakan Jam & Nomor Telepon.

Bab 4: Salam Harian (挨拶 - Aisatsu) & Ekspresi Kelas

* Fokus Pembelajaran:
  * Salam: , , , , , .
  * Ekspresi Kelas:  (Saya mengerti),  (Saya tidak mengerti),  (Tolong ulangi sekali lagi).

3. Modul Level JLPT N5: Komunikasi Dasar Harian (Beginner)

3.1 Target Kompetensi & Metrik

* Target Kompetensi: Lulus Ujian JLPT N5. Mampu memahami percakapan lambat dalam situasi kehidupan sehari-hari.
* Target Kosakata: 800 kata.
* Target Kanji: 100 Kanji Dasar (seperti: 日, 本, 人, 月, 火, 水, 木, 金, 土, 山, 川, 田, 天, 気, 生, 先, 学, 校).

3.2 Rincian Bab Materi N5

Bab 1: Perkenalan Diri & Profesi (自己紹介)

* Tata Bahasa:
  * /  /
  * Partikel  (Juga) & Partikel  (Kepemilikan/Afiliasi).
* Daftar Kanji (5 Kanji Utama): 人 (ひと/ジン), 本 (ほん), 日 (ひ/ニチ), 先 (さき/セン), 生 (い/セイ).
* Kosakata Inti:  (Siswa),  (Guru),  (Karyawan),  (Dokter).
* Skenario Neko-sensei: Wawancara Perkenalan Diri Pertama di Kelas.

Bab 2: Keberadaan Benda & Posisi (存在と位置)

* Tata Bahasa:
  * Kata Penunjuk: , .
  * Kalimat Keberadaan Benda Mati: .
  * Kalimat Keberadaan Makhluk Hidup: .
  * Posisi:  (Atas),  (Bawah),  (Dalam),  (Samping).
* Daftar Kanji (5 Kanji Utama): 上, 下, 中, 右, 左.
* Skenario Neko-sensei: Mencari Barang Hilang di Kamar.

Bab 3: Kegiatan Harian & Waktu (日常の動作)

* Tata Bahasa:
  * Kata Kerja Bentuk  /  /  / .
  * Partikel Waktu , Partikel Objek , Partikel Arah , Partikel Alat/Tempat .
* Daftar Kanji (5 Kanji Utama): 行 (い/コウ), 来 (き/ライ), 食 (た/ショク), 飲 (の/イン), 見 (み/ケン).
* Kosakata Inti:  (Bangun),  (Tidur),  (Makan),  (Pergi),  (Sekolah).
* Skenario Neko-sensei: Menceritakan Rutinitas Harian dari Bangun Tidur.

Bab 4: Belanja & Keinginan (買い物と望み)

* Tata Bahasa:
  * Kata Sifat-i () dan Kata Sifat-na () dalam Bentuk Positif & Negatif Lampau.
  * Menyatakan Keinginan:  (Ingin benda),  (Ingin melakukan kegiatan).
  * Ajakan Sopan:  / .
* Skenario Neko-sensei: Simulasi Belanja Makanan di Minimarket (Konbini).

Bab 5: Bentuk ~Te & Permintaan Sopan (指示と依頼)

* Tata Bahasa:
  * Konjugasi Kata Kerja Bentuk  (Grup 1, Grup 2, Grup 3).
  * Permintaan Sopan: .
  * Kegiatan yang Sedang Berlangsung: .
  * Izin & Larangan:  / .

4. Modul Level JLPT N4: Komunikasi Praktis & Persiapan Kerja (Upper Beginner / SSW)

4.1 Target Kompetensi & Metrik

* Target Kompetensi: Lulus Ujian JLPT N4. Mampu melakukan percakapan sehari-hari dengan kecepatan wajar dan memenuhi syarat komunikasi dasar program kerja Tokutei Ginou (SSW).
* Target Kosakata: 1.500 kata (kumulatif).
* Target Kanji: 300 Kanji.

4.2 Rincian Bab Materi N4

Bab 1: Bentuk Kasual & Hubungan Antar Teman (普通形)

* Tata Bahasa:
  * Konjugasi Bentuk Kasual (Futsuukei): Bentuk Kamus (Jisho-kei), Bentuk , Bentuk .
  * Penggunaan Bentuk Kasual dalam Percakapan Akrab dengan Teman/Sebaya.
  * Pengutipan Kalimat:  (Saya pikir...),  (Berkata bahwa...).
* Skenario Neko-sensei: Ngobrol Santai (Free Talk Kasual) tentang Rencana Akhir Pekan.

Bab 2: Petunjuk Arah, Transportasi & Pengandaian (道案内と条件)

* Tata Bahasa:
  * Pengandaian Syarat:  (Jika/Setelah) dan  (Jika melakukan A, pasti terjadi B).
  * Memberi & Menerima Bantuan: , , .
  * Kemampuan (Potential Form):  / Kata Kerja Bentuk Potensial (, ).

Bab 3: Pengalaman, Perubahan & Alasan (経験と理由)

* Tata Bahasa:
  * Menyatakan Pengalaman:  (Pernah melakukan...).
  * Menyatakan Perubahan Status:  (Menjadi...).
  * Menyatakan Alasan Halus:  (Karena...) dan  (Meskipun/Padahal...).
* Skenario Neko-sensei: Menceritakan Pengalaman Liburan & Pengalaman Belajar Bahasa Jepang.

Bab 4: Maksud, Persiapan & Keadaan (意図と準備)

* Tata Bahasa:
  * Bentuk Maksud (Volitional Form):  ().
  * Menyatakan Rencana:  (Bercita-cita/Bermaksud untuk...).
  * Persiapan Sebelum Kegiatan:  (Melakukan persiapan terlebih dahulu).
  * Keadaan yang Selesai/Penyesalan: .

Bab 5: Persiapan Kerja, Dunia Kerja SSW & Pasif/Kausatif Dasar

* Tata Bahasa:
  * Bentuk Pasif Dasar ():  (Dimarahi).
  * Bentuk Kausatif Dasar (): Menyuruh / Mengizinkan.
  * Ungkapan Permohonan Maaf & Tata Krama Kerja Dasar.
* Skenario Neko-sensei: Simulasi Wawancara Kerja Paruh Waktu (Arubaito) / Program SSW.

5. Modul Level JLPT N3: Pemahaman Operasional & Menengah (Intermediate)

5.1 Target Kompetensi & Metrik

* Target Kompetensi: Lulus Ujian JLPT N3. Mampu memahami artikel koran sederhana, mengikuti diskusi umum, dan melakukan koordinasi kerja operasional.
* Target Kosakata: 3.750 kata.
* Target Kanji: 650 Kanji.

5.2 Rincian Bab Materi N3

Bab 1: Pelaporan Kerja, Hubungan Kausal & Hourenso (報連相)

* Tata Bahasa:
  * Berkat / Gara-gara:  (Berkat) vs  (Gara-gara).
  * Tujuan:  (Demi/Untuk) vs  (Agar bisa).
  * Laporan Kerja Hourenso:  (Berdasarkan...),  (Kabar burung/katanya).

Bab 2: Nuansa Perbandingan, Batasan & Batas Waktu

* Tata Bahasa:
  * Mengenai / Tentang:  / .
  * Dibandingkan Dengan: .
  * Berdasarkan / Sesuai Dengan:  (Touri ni).
* Skenario Neko-sensei: Melaporkan Perkembangan Proyek dan Kendala Operasional.

Bab 3: Prediksi, Duga-Dugaan & Kepastian

* Tata Bahasa:
  * Kemungkinan:  (Mungkin saja).
  * Kepastian Tinggi:  (Pasti/Tidak salah lagi).
  * Seharusnya:  (Seharusnya...).
  * Kausatif-Pasif (Causative-Passive):  (Dipaksa melakukan sesuatu oleh atasan/keadaan).

Bab 4: Konsultasi Kesehatan, Masalah & Perasaan

* Tata Bahasa:
  * Menunjukkan Gejala:  (Cita rasa/bau/suara/perasaan).
  * Kebutuhan / Keharusan:  / .
* Skenario Neko-sensei: Konsultasi Kesehatan dengan Dokter di Klinik/Rumah Sakit Jepang.

Bab 5: Diskusi Hobi, Budaya & Fenomena Sosial

* Tata Bahasa:
  * Pengubahan Kata Kerja Menjadi Kata Benda:  / .
  * Batasan Waktu & Urutan:  (Selagi...) /  (Begitu... langsung...).

6. Modul Level JLPT N2: Bahasa Jepang Bisnis & Profesional (Upper Intermediate)

6.1 Target Kompetensi & Metrik

* Target Kompetensi: Lulus Ujian JLPT N2. Mampu membaca berita, editorial, menguasai tata bahasa bisnis (Keigo), serta berkomunikasi tanpa hambatan di lingkungan kerja profesional.
* Target Kosakata: 6.000 kata.
* Target Kanji: 1.000 Kanji.

6.2 Rincian Bab Materi N2

Bab 1: Keigo Bisnis Lanjutan (敬語マスター)

* Tata Bahasa:
  * Sonkeigo (Bahasa Penghormatan untuk Atasan/Klien): , , kata khusus (, , ).
  * Kenjougo (Bahasa Rendah Diri): , , kata khusus (, , ).
  * Teineigo & Greet Bisnis: .
* Skenario Neko-sensei: Simulasi Panggilan Telepon Bisnis & Menyapa Klien Utama.

Bab 2: Penekanan Formal, Hubungan & Perubahan Proyek

* Tata Bahasa:
  * (Tidak lain dan tidak bukan adalah...).
  * (Terkait dengan/Mengenai perdebatan tentang...).
  * /  (Seiring dengan berkembangnya...).

Bab 3: Pengandaian Tinggi & Batasan Absolut

* Tata Bahasa:
  * (Kalau seandainya bisa...).
  * /  (Meskipun/Ukuran untuk...).
  * (Meskipun demikian/Terlepas dari...).

Bab 4: Wawancara Kerja Formal & Presentasi Strategi

* Tata Bahasa:
  * (Dengan sepenuh hati...).
  * (Dilihat dari sudut pandang...).
* Skenario Neko-sensei: Simulasi Wawancara Kerja Formal Rekrutmen Perusahaan Jepang.

Bab 5: Editorial Berita & Isu Kebijakan Publik

* Tata Bahasa:
  * (Boleh tidak boleh harus...).
  * (Tidak ada yang lebih baik daripada...).

7. Modul Level JLPT N1: Kemahiran Mahir & Profesional Tinggi (Advanced)

7.1 Target Kompetensi & Metrik

* Target Kompetensi: Lulus Ujian JLPT N1. Memahami bahasa Jepang tingkat akademis, karya sastra, editorial rumit, serta ekspresi puitis bernuansa tinggi.
* Target Kosakata: 10.000+ kata.
* Target Kanji: 2.000+ Kanji (Seluruh Jouyou Kanji).

7.2 Rincian Bab Materi N1

Bab 1: Ungkapan Klasik & Sastra (文語的表現)

* Tata Bahasa:
  * (Begitu... langsung seketika itu juga...).
  * /  (Sesuai dengan kemampuan/kapasitasnya).
  * (Demi untuk mencapai...).

Bab 2: Peribahasa Empat Karakter (四字熟語 - Yojijukugo) & Bahasa Formal

* Tata Bahasa & Ungkapan:
  * (Ichigo Ichie - Penyelenggaraan momen tak terulang).
  * (Shikousakugo - Trial and error).
  * (Dengan menggunakan/Berakhir pada...).

Bab 3: Negosiasi Tingkat Tinggi & Debat Kebijakan Publik

* Tata Bahasa:
  * (Diawali dengan...).
  * (Terpaksa harus...).
* Skenario Neko-sensei: Debat Kebijakan Publik & Presentasi Strategi Bisnis Global.

8. Spesifikasi JSON Schema Data Ingestion Database Backend

Gunakan skema JSON di bawah ini sebagai standar struktur data saat melakukan seeding atau ingestion materi kurikulum ke dalam database PostgreSQL melalui Prisma ORM:
