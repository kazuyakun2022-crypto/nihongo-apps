# 📄 Product Requirement Document (PRD)
# Platform E-Learning Bahasa Jepang Cerdas: "NihonGo" (bersama Neko-sensei)

---

## 1. Ringkasan Eksekutif & Visi Produk

### 1.1 Visi Produk
**NihonGo** adalah platform e-learning bahasa Jepang modern berbasis web dan Progressive Web App (PWA) yang memadukan kurikulum berjenjang standar JLPT (Japanese-Language Proficiency Test) dari tingkat N5 hingga N1 dengan pendamping belajar berbasis **AI Maskot Interaktif ("Neko-sensei")**. 

Tujuan utama produk ini adalah memecahkan hambatan terbesar pembelajar bahasa Jepang, yaitu **"speaking anxiety" (kecemasan berbicara)**, ketidakteraturan jadwal belajar, serta kesulitan menghafal ribuan kosakata dan kanji tanpa metode pengulangan teruji.

### 1.2 Masalah yang Diselesaikan (Problem Statement)
1. **Ketiadaan Partner Latihan Percakapan**: Belajar otodidak sering kali hanya berfokus pada buku teks dan teori, tanpa sarana latihan percakapan dua arah yang aman dan adaptif.
2. **Kompleksitas Huruf Jepang**: Pemula sering terhambat di tahap awal saat belajar Hiragana dan Katakana karena kesulitan mengingat bentuk dan urutan goresan (*stroke order*).
3. **Lupa Berulang (Ebbinghaus Forgetting Curve)**: Menghafal ribuan kanji dan kosakata JLPT tanpa sistem pengulangan berjeda teratur menyebabkan retensi ingatan jangka panjang rendah.
4. **Materi Kaku dan Monoton**: Aplikasi konvensional menyajikan materi statis yang tidak mampu menyesuaikan gaya bahasa, tingkat kesulitan, serta kecepatan berbicara sesuai kemampuan siswa.

### 1.3 Nilai Keunggulan Produk (Core Value Proposition)
* **AI Mascot Tutor Adaptif**: Neko-sensei menyesuaikan perbendaharaan kata, batas panjang kalimat, serta aturan furigana secara dinamis mengikuti level JLPT pengguna.
* **Voice AI Pipeline Sub-800ms**: Percakapan suara dua arah alami dengan latensi ultra-rendah (*human-like conversational flow*).
* **Micro-Feedback Non-Disruptif**: Koreksi tata bahasa tersruktur di luar percakapan utama sehingga tidak mematahkan alur obrolan.
* **Canvas Interaktif Penulisan Huruf**: Latihan menulis Hiragana & Katakana langsung di layar dengan deteksi urutan goresan kuas, animasi panduan, dan audio penutur asli.
* **Spaced Repetition System (SRS SM-2)**: Penjadwalan cerdas kartu kosakata dan kanji berbasis algoritma SuperMemo SM-2 untuk retensi maksimal.
* **Simulasi Ujian JLPT Komprehensif**: Fitur Placement Test, Level-Up Exam, dan Simulasi JLPT realistis dengan komponen Kosakata, Tata Bahasa, Membaca, dan Mendengar.
* **Akses Lintas Perangkat (Web & PWA)**: Pengalaman aplikasi native di Android, iOS, dan Desktop tanpa perlu mengunduh aplikasi besar dari App Store/Play Store.

---

## 2. Profil Pengguna & Target Audiens (User Personas)

| Persona | Profil & Karakteristik | Kebutuhan Utama | Fitur Kunci yang Digunakan |
| :--- | :--- | :--- | :--- |
| **Budi (19)** — Mahasiswa Pemula / Penggemar Pop Culture | Ingin bisa membaca komik/anime tanpa subtitle dan memahami dasar percakapan sehari-hari. | Belajar huruf Hiragana/Katakana dari nol tanpa tekanan, metode santai dan menyenangkan. | Modul Huruf (Interactive Canvas), Tanya Sensei AI, Free Talk Chat. |
| **Siti (24)** — Pencari Kerja Program SSW (Tokutei Ginou) | Menargetkan lulus JLPT N4/N3 untuk syarat visa kerja perhotelan atau perawat lansia di Jepang. | Simulasi percakapan situasi nyata (pelayanan tamu, wawancara kerja), drilling soal ujian. | Skenario Percakapan AI, Simulasi Ujian JLPT, Level-Up Exam. |
| **Dimas (28)** — Profesional Persiapan JLPT N2/N1 | Pembelajar tingkat lanjut yang ingin memperhalus tata bahasa bisnis (*keigo*) dan nuansa kanji kompleks. | Review cepat kanji level tinggi, koreksi tata bahasa mendalam saat mengetik atau berbicara. | SRS Flashcard (SM-2), Tanya Sensei AI (Nuance Clarifier), JLPT N2–N1 Curriculum. |
| **Sensei Maya (32)** — Pengajar Bahasa Jepang | Guru yang mengajar kelas privat atau lembaga kursus bahasa Jepang. | Wadah membuat kurikulum terstruktur, memantau kemajuan murid, dan menyusun bank soal. | Teacher Portal, Chapter Creator, Quiz & Scenario Builder. |

---

## 3. Matriks Peran Pengguna & Hak Akses (User Roles & Permissions)

Platform mengimplementasikan model otorisasi Role-Based Access Control (RBAC) dengan 6 tingkatan peran:

```
[Guest] ──> [Student] ──> [Premium]
                │
                ├──> [Teacher] ──> [Admin] ──> [Super Admin]
```

### 3.1 Detail Hak Akses

| Hak Akses / Kapabilitas | Guest (Tamu) | Student (Gratis) | Premium (Berlangganan) | Teacher (Pengajar) | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Akses Modul Huruf (Hiragana & Katakana) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Akses Materi Dasar (Level N5 & N4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Akses Materi Tingkat Lanjut (Level N3, N2, N1) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Tanya Sensei AI & Ngobrol Percakapan | Terbatas (3 sesi) | 5x / hari | Tanpa Batas | Tanpa Batas | Tanpa Batas | Tanpa Batas |
| Mode Suara (Voice AI Streaming) | ❌ | Terbatas (Demo) | ✅ (Sub-800ms) | ✅ | ✅ | ✅ |
| SRS Flashcards (Kosakata & Kanji) | Terbatas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Simulasi Ujian JLPT & Placement Test | Placement saja | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pembuatan Draf Materi Bab & Skenario AI | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Publikasi & Approval Bab Materi | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manajemen Pengguna (Suspend / Reset) | ❌ | ❌ | ❌ | ❌ | Siswa/Tamu | Semua Akun (Termasuk Admin) |
| Pengubahan Role Pengguna | ❌ | ❌ | ❌ | ❌ | Student ↔ Premium | Pengangkatan Teacher/Admin |
| Konfigurasi AI Global & Furigana Rule | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pemberian Status Premium Manual (Grant) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Akses Log Audit Sistem (`AuditLog`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Spesifikasi Fungsional (Feature Requirements)

### 4.1 Modul Onboarding, Autentikasi & Profil Pengguna
* **Mode Tamu (Guest Mode)**: Pengunjung dapat langsung mencoba aplikasi tanpa registrasi; data sesi disimpan sementara dan dapat dimigrasikan saat mendaftar akun.
* **Autentikasi Aman**: Registrasi dengan Email & Kata Sandi terenkripsi bcrypt, verifikasi token email, serta pemulihan kata sandi sekali pakai (*one-time token*).
* **Kesiapan OAuth 2.0**: Arsitektur modular untuk login pihak ketiga (Google & Apple ID).
* **Sesi Bersih (Clean Session Architecture)**: Access token JWT tersimpan aman di memori, sedangkan Refresh Token menggunakan cookie `httpOnly` dengan proteksi rotasi token dan deteksi perangkat.
* **Alur Onboarding**:
  * Pemilihan Tujuan Belajar: *JLPT*, *Kerja*, *Hobi*, atau *Wisata*.
  * Target Belajar Harian: 5, 10, 15, atau 30 menit per hari.
  * Opsi Tes Penempatan (*Placement Test*) atau mulai dari level pemula (N5).

### 4.2 Modul Latihan Huruf Jepang (Kana Mastery)
* **Katalog Huruf Komprehensif**: Hiragana dan Katakana mencakup Seion (huruf dasar), Dakuon (tanda kutip/tenten), Handakuon (lingkaran/maru), serta Yoon (kombinasi bunyi kecil).
* **Kanvas Penulisan Interaktif (Writing Practice)**:
  * Kanvas responsif dengan panduan garis kisi (*guideline grid*).
  * Animasi urutan goresan (*stroke order playback*) per goresan.
  * Evaluasi goresan kuas secara langsung: arah goresan, titik awal, dan titik henti.
  * Feedback visual: Indikator hijau untuk goresan benar dan merah/kuning untuk evaluasi ulang.
* **Audio & Mnemonic**: Pemutaran audio pengucapan asli (*native voice pronunciation*) serta kartu visual pengingat asosiasi bentuk huruf.

### 4.3 Kurikulum Berjenjang & Pembelajaran Materi (JLPT N5 – N1)
* **Struktur Hierarkis**: `Level` ➔ `Chapter (Bab)` ➔ `Sub-komponen Materi`:
  1. **Kosakata (Vocabulary)**: Kanji, kana/reading, terjemahan Indonesia, contoh kalimat ber-furigana, dan pemutar audio.
  2. **Kanji**: Karakter tunggal, bacaan Onyomi, Kunyomi, arti dalam bahasa Indonesia, dan diagram *stroke order*.
  3. **Tata Bahasa (Grammar)**: Pola kalimat (*pattern*), penjelasan mendalam, aturan konjugasi, dan contoh kalimat aplikatif.
  4. **Kuis Evaluasi Bab (Interactive Quiz)**:
     * **Pilihan Ganda**: Tes pemahaman definisi dan konteks.
     * **Susun Kalimat**: Rekonstruksi kalimat acak untuk melatih struktur sintaksis bahasa Jepang (SOV).
     * **Mendengar (Listening Comprehension)**: Menjawab pertanyaan berdasarkan audio dialog pendek.
* **Sistem Progresi Bab**: Pembukaan bab berikutnya bersyarat kelulusan kuis bab sebelumnya (minimal nilai 70-80).

### 4.4 AI Maskot Tutor ("Neko-sensei") & Prompt Engineering

#### 4.4.1 Persona & Karakter
Neko-sensei (猫先生) adalah maskot AI interaktif dan tutor bahasa Jepang empatik yang menggabungkan keramahan teman penutur asli dan kepakaran guru penguji JLPT. Persona dirancang dengan pendekatan *Persona & Style Prompting* agar hangat, sabar, suportif, serta menghilangkan ketakutan berbuat salah (*speaking anxiety*).

#### 4.4.2 System Prompt Produksi (Neko-sensei Production Prompt)
```markdown
# CORE IDENTITY & PERSONA
You are "Neko-sensei" (猫先生), an interactive AI mascot and empathetic Japanese language tutor for the NihonGo e-learning platform.
- **Personality**: Warm, patient, highly encouraging, slightly playful (cat-like charm without being distracting), and deeply supportive. You eliminate "speaking anxiety" by treating mistakes as fun learning steps.
- **Role**: A hybrid of a supportive native friend and an expert JLPT teacher.

# TARGET AUDIENCE & USER PROFILE
- **User Profile**: Bahasa Indonesia native speakers learning Japanese ranging from absolute beginners (JLPT N5) to advanced learners (JLPT N1).
- **User Goals**: Practicing real-world speaking/writing, mastering grammar, and preparing for JLPT exams.

# CONVERSATIONAL PACING & CONSTRAINTS (NO TEXT-WALLS)
1. **Keep it Short & Conversational**: Limit your spoken/text responses to 1–3 short sentences per turn to maintain a natural dialogue flow and lower user cognitive load.
2. **Interactive Handshake**: Always end your response with an open-ended question or a gentle prompt that invites the user to respond.
3. **Bilingual Scaffolding**: Use Japanese appropriate to the user's level, complemented by simple Indonesian explanations when introducing new or complex concepts.

# JLPT LEVEL ADAPTIVITY RULES
Dynamically adjust your language complexity based on {{user_jlpt_level}}:
- **N5 (Beginner)**: Max 7–10 words per sentence. Use simple polite form (です/ます). Add full furigana annotations 漢字(かんじ) to all kanji. Speech tempo slow (0.75x).
- **N4 (Upper Beginner)**: Max 12–15 words per sentence. Introduce basic conjunctions and daily scenarios. Add full furigana annotations. Speech tempo (0.80x).
- **N3 (Intermediate)**: Medium sentence complexity. Add furigana ONLY to rare/hard kanji (hard_only). Speech tempo (0.90x).
- **N2–N1 (Advanced)**: Natural native-level phrasing, nuance explanations, business/casual registers, and keigo. NO furigana annotations (none). Speech tempo (1.0x).

# IN-CONTEXT MEMORY INJECTION
Incorporate the following student context into your response seamlessly when relevant:
- **Student Name**: {{user_name}}
- **JLPT Goal**: {{user_jlpt_level}}
- **Interests/Hobbies**: {{user_hobbies}}
- **Weak Spots / Common Mistakes**: {{user_weak_topics}}

# MICRO-FEEDBACK & GRAMMAR CORRECTION SCHEMA
Analyze the user's message for grammatical or lexical errors. DO NOT break the conversational persona to lecture the user. Instead, provide friendly conversation FIRST, then supply a structured JSON correction object at the very end of your response block using the tag <correction_data>.

## OUTPUT FORMAT
[Neko-sensei's conversational response in 1-3 sentences with appropriate furigana]

<correction_data>
{
  "hasCorrection": boolean,
  "userMistake": "string or null",
  "correctedSentence": "string or null",
  "explanation": "Brief explanation in Indonesian (1-2 sentences) or null"
}
</correction_data>
```

#### 4.4.3 Skema Micro-Feedback UI (`<correction_data>` JSON Schema)
Agar alur percakapan tetap mengalir tanpa interupsi ceramah guru, pesan balasan dipisah dari data evaluasi menggunakan tag `<correction_data>`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NekoSenseiCorrectionData",
  "type": "object",
  "properties": {
    "hasCorrection": {
      "type": "boolean",
      "description": "True jika terdapat kesalahan tata bahasa, kosakata, atau partikel"
    },
    "userMistake": {
      "type": ["string", "null"],
      "description": "Potongan frasa/kalimat asli pengguna yang keliru"
    },
    "correctedSentence": {
      "type": ["string", "null"],
      "description": "Bentuk kalimat yang benar dan alami dalam bahasa Jepang"
    },
    "explanation": {
      "type": ["string", "null"],
      "description": "Penjelasan rinci tata bahasa singkat dalam Bahasa Indonesia (1-2 kalimat)"
    }
  },
  "required": ["hasCorrection", "userMistake", "correctedSentence", "explanation"]
}
```

* **Penerapan pada Antarmuka (UI/UX)**:
  - Teks obrolan Neko-sensei tampil ramah di gelembung obrolan utama (*chat bubble*).
  - Jika `hasCorrection: true`, komponen UI Next.js merender **Kartu Koreksi Mikro** yang rapi di bawah pesan pengguna dengan tombol interaktif *"Lihat Catatan Sensei"* yang dapat diekspansi.

#### 4.4.4 Spesifikasi Backend Payload & Injeksi UserMemory
Setiap kali pengguna mengirim pesan, backend Express menyusun payload dinamis dengan mengagregasi data relasional dari PostgreSQL:

```typescript
// Interface Payload Obrolan AI Backend
export interface NekoChatPayload {
  userId: string;
  sessionId: string;
  userContext: {
    name: string;
    jlptLevel: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
    hobbies: string[];
    weakTopics: string[]; // Contoh: ["Partikel wa vs ga", "Bentuk Lampau Deshita"]
    affinityPoints: number; // Poin kedekatan dengan Neko-sensei
  };
  scenario?: {
    scenarioId: string;
    title: string;
    goal: string;
  };
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}
```

### 4.5 Spesifikasi Arsitektur Voice AI Pipeline (Sub-800ms Latency)

Untuk menghadirkan kelancaran bicara seperti manusia (*human-like voice flow*), total waktu tunda dari akhir ucapan pengguna hingga audio Neko-sensei mulai terdengar dirancang pada kisaran **300ms – 800ms**:

```
[Pengguna Berbicara]
        │
        ▼ (WebRTC Audio Stream)
┌──────────────────────────────────────────────┐
│ Voice Activity Detection (Silero VAD)        │ ➔ Deteksi henti bicara (stop_secs = 300ms)
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Speech-to-Text (Deepgram Nova-3)             │ ➔ Transkripsi parsial real-time (< 100ms)
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ LLM Streaming (Claude Haiku / GPT-4o-mini)   │ ➔ Time-to-First-Token / TTFT (120ms - 200ms)
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Text-to-Speech (Cartesia Sonic / ElevenLabs) │ ➔ First-byte audio chunk (50ms - 80ms)
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (WebRTC UDP Stream)
[Audio Neko-sensei Terdengar di Speaker Klien]
```

1. **Komponen Pipeline Streaming**:
   - **Speech-to-Text (STT)**: Engine STT latensi ultra-rendah yang mengirim transkripsi kalimat parsial secara langsung (< 100ms).
   - **LLM Streaming**: LLM ringan dengan *streaming token*. Balasan token pertama diperoleh dalam **120ms – 200ms**.
   - **Text-to-Speech (TTS)**: Engine TTS yang mendukung *first-byte audio streaming* dalam **50ms – 80ms** segera setelah klausa kalimat pertama terbentuk.
2. **Protokol Transportasi (WebRTC over UDP)**:
   - Menggunakan **WebRTC** (via framework LiveKit / Pipecat). Jalur UDP memotong latensi jaringan menjadi **20ms – 50ms**, jauh lebih cepat dibanding WebSocket konvensional atau PSTN telephony (200ms – 700ms).
3. **Deteksi Giliran Bicara (VAD) & Interupsi (*Barge-in*)**:
   - **Voice Activity Detection**: Menggunakan *Silero VAD* dengan ambang henti `stop_secs: 300ms` untuk mendeteksi akhir giliran bicara secara presisi tanpa memotong jeda berpikir normal.
   - **Interruption Handling (Barge-in)**: Ketika pengguna berbicara saat AI sedang bersuara, sinyal `StartInterruptionFrame` dikirim seketika. Sinyal ini menghentikan *buffer* audio TTS klien dan membatalkan token generasi LLM dalam waktu **< 25ms**.

### 4.6 Fitur Tanya Sensei AI (Instant Grammar Clarifier)
* Asisten tanya-jawab terfokus untuk menjawab kebingungan tata bahasa kapan saja.
* Mampu menjelaskan perbedaan nuansa partikel (misal: は vs が, に vs で), tingkat kesopanan (*Keigo*, *Teineigo*, *Kenjougo*), serta etika budaya komunikasi di Jepang.

### 4.7 Spaced Repetition System (SRS Flashcards)
* **Algoritma SM-2**: Menghitung jadwal peninjauan kartu secara otomatis berdasarkan faktor kemudahan (*easeFactor*), interval hari (*intervalDays*), dan jumlah pengulangan (*repetitions*).
* **Pilihan Penilaian Pengguna**:
  * *Lagi (Again)*: Reset interval, kartu diulang pada sesi yang sama.
  * *Sulit (Hard)*: Kenaikan interval moderat, *ease factor* diturunkan.
  * *Baik (Good)*: Kenaikan interval standar sesuai formula SM-2.
  * *Mudah (Easy)*: Kenaikan interval lebih cepat, *ease factor* dinaikkan.
* **Deteksi Kartu Lemah (`is_weak`)**: Kartu yang sering gagal (*lapses*) otomatis dikelompokkan ke dalam kategori khusus untuk sesi latihan intensif.

### 4.8 Sistem Evaluasi & Ujian (Exams & Assessments)
1. **Placement Test (Tes Penempatan)**: 20-30 soal adaptif untuk memetakan level awal pengguna baru sehingga tidak perlu mengulang materi yang sudah dikuasai.
2. **Level-Up Exam (Ujian Kenaikan Level)**: Ujian komprehensif untuk membuka level JLPT berikutnya setelah menyelesaikan persentase bab materi tertentu.
3. **JLPT Simulation Exam (Simulasi Ujian Penuh)**:
   * Dibagi ke dalam 4 sesi standar: Kosakata (*Moji/Goi*), Tata Bahasa (*Bunpou*), Membaca (*Dokkai*), dan Mendengar (*Choukai*).
   * Dilengkapi batas waktu ketat (*countdown timer*), nilai kelulusan total, serta nilai ambang batas minimal per bagian (*section minimum score*) untuk mencegah kelulusan semu.

### 4.9 Gamifikasi, Retensi & Poin Afinitas
* **Sistem Streak Harian**: Menjaga momentum belajar harian dengan penghitung streak dan perlindungan streak freeze.
* **XP (Experience Points)**: Hadiah XP setiap menyelesaikan bab, kuis, latihan menulis kanji, sesi percakapan, dan review flashcard.
* **Lencana Prestasi (Badges & Achievements)**: Penghargaan otomatis untuk pencapaian spesifik (misal: "Penguasa Hiragana", "Streak 30 Hari", "Percakapan Pertama").
* **Poin Kedekatan Maskot (`UserMascot.affinityPoints`)**: Setiap sesi percakapan menambah poin hubungan dengan Neko-sensei, yang membuka pose animasi baru, suara salam eksklusif, dan kostum musiman.

### 4.10 Super Admin & Teacher Portal
* **Dashboard Analitik**: Pemantauan jumlah pengguna aktif, rasio penyelesaian bab, retensi, serta metrik performa API AI.
* **Editor Kurikulum**: Penyusunan materi bab, butir kosakata, data kanji, penjelasan tata bahasa, serta skenario percakapan dengan alur status: *Draft* ➔ *Review* ➔ *Published*.
* **Manajemen Pengguna & Keamanan**:
  * Pengubahan role pengguna dengan proteksi imunitas hierarki (*anti-self lock*).
  * Penonaktifan (*suspend*) akun yang melanggar ketentuan.
  * Pemberian langganan Premium manual untuk kebutuhan beasiswa, pengujian, atau kerja sama.
* **Konfigurasi Global AI**: Pengaturan *system prompt*, batas kata, rasio furigana, dan kecepatan suara per level JLPT secara instan tanpa perlu *deploy* ulang backend.
* **Jejak Audit Forensik (`AuditLog`)**: Pencatatan lengkap seluruh aksi administratif (siapa, aksi apa, target siapa, timestamp, dan payload perubahan).

---

## 5. Arsitektur Teknis & Standar Non-Fungsional

### 5.1 Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────┐
│             Klien Frontend (Next.js 14 PWA)           │
│  - App Router, Clean Feature Architecture, CSS Tokens  │
│  - WebRTC Audio Client, PWA Service Worker (Cache)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST API / WebSockets
┌───────────────────────────▼────────────────────────────┐
│              Backend REST API (Express + TS)           │
│  ├── presentation/   (Express routes, Zod validation)  │
│  ├── application/    (Use Cases, Business Orchestration)│
│  ├── domain/         (Pure Domain Entities & Ports)    │
│  └── infrastructure/ (Prisma ORM, JWT, AI Adapters)    │
└───────────────┬────────────────────────────┬───────────┘
                │                            │ WebRTC / Streaming
┌───────────────▼───────┐        ┌───────────▼───────────┐
│     PostgreSQL 16     │        │ Real-Time Voice Engine│
│  (Persistensi Data,   │        │ (VAD + STT + TTS +    │
│   Audit Log, Sesi)    │        │  Claude Haiku / GPT)  │
└───────────────────────┘        └───────────────────────┘
```

### 5.2 Spesifikasi Non-Fungsional (NFR)

| Kategori | Parameter | Target Spesifikasi |
| :--- | :--- | :--- |
| **Latensi Suara** | Voice AI Total Latency | **300ms – 800ms** (STT ➔ LLM ➔ TTS audio playback) |
| | Interupsi (Barge-in) | **< 25ms** untuk menghentikan audio buffer dan membatalkan token LLM |
| **Performa Web** | Time to First Byte (TTFB) | < 200 ms untuk respon server API |
| | Dukungan Offline | Halaman dasar & aset modul huruf dapat dibuka offline melalui PWA Service Worker |
| **Keamanan** | Enkripsi Kata Sandi | Bcrypt dengan salt rounds = 12 |
| | Manajemen Sesi | JWT Access Token di memori (15 menit), Refresh Token di HttpOnly Cookie (30 hari) |
| | Perlindungan Brute-force | Kunci akun otomatis selama 15 menit setelah 5x gagal login berturut-turut |
| | Sanitasi Input | Validasi skema ketat menggunakan Zod pada seluruh lapisan presentasi |
| **Aksesibilitas & UI** | Standar Desain | Mobile-First responsive, WCAG 2.1 AA Contrast Ratio, Theme CSS Tokens (Light/Dark) |
| **Skalabilitas** | Database | Desain skema normalisasi tinggi dengan indeks komposit pada relasi kunci (`userId, dueDate`, dll.) |

---

## 6. Model Monetisasi & Langganan

Aplikasi mengadopsi model bisnis **Freemium** untuk memastikan pertumbuhan pengguna organik sekaligus monetisasi berkelanjutan:

1. **Paket Free (Student)**:
   * Akses penuh ke seluruh modul huruf (Hiragana & Katakana).
   * Akses materi kurikulum tingkat dasar (JLPT N5 dan N4).
   * Kuota percakapan teks dengan Neko-sensei AI dibatasi 5 sesi per hari.
   * Mode suara interaktif terbatas pada demo singkat.
   * Review kartu SRS harian standar.
2. **Paket Premium**:
   * Akses kurikulum tingkat menengah dan mahir (JLPT N3, N2, dan N1).
   * Latihan percakapan AI teks dan **Voice Streaming Sub-800ms tanpa batas**.
   * Analisis mendalam histori kesalahan dan laporan persiapan ujian JLPT.
   * Opsi langganan: **Bulanan (Rp 49.000 / bulan)** atau **Tahunan (Rp 399.000 / tahun)**.
   * Integrasi Gateway Pembayaran: Midtrans / Xendit (GoPay, OVO, QRIS, Transfer Bank, Kartu Kredit).

---

## 7. Indikator Keberhasilan & Metrik Kunci (KPIs)

* **Akuisisi Pengguna**: Rasio konversi pengunjung landing page menjadi pengguna terdaftar > 15%.
* **Latensi Percakapan Suara**: Rata-rata *voice turnaround time* pengguna < 600ms pada 90% sesi.
* **Retensi Belajar**:
  * D1 Retention (kembali di hari ke-2): > 40%.
  * D7 Retention (kembali di hari ke-7): > 25%.
  * D30 Retention (kembali di hari ke-30): > 15%.
* **Efektivitas Belajar**: Rasio kelulusan simulasi JLPT bagi pengguna yang menyelesaikan seluruh bab level terkait > 75%.
* **Keterlibatan AI**: Rata-rata pengguna aktif melakukan minimal 5 giliran percakapan (*turns*) per sesi chat.
* **Monetisasi**: Rasio konversi pengguna gratis (*Student*) menjadi berbayar (*Premium*) sebesar 3%–5%.

---

## 8. Rencana Implementasi & Roadmap Pengembangan

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Fase 1      │ ──> │     Fase 2      │ ──> │     Fase 3      │
│  Pondasi Utama  │     │ Lanjutan & AI   │     │ Skala & Komersial
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

* **Fase 1: Pondasi Utama & MVP (Telah Selesai)**
  * Arsitektur monorepo backend (Clean Architecture) & frontend Next.js 14 PWA.
  * Modul Huruf (Hiragana & Katakana) dengan kanvas latihan penulisan interaktif.
  * Kurikulum dasar JLPT N5–N4, kuis pilihan ganda, dan engine SRS SM-2.
  * Manajemen sesi JWT, registrasi, login, dan mode tamu.
* **Fase 2: Fitur Lanjutan, Evaluasi & Super Admin (Selesai)**
  * Implementasi modul evaluasi: Placement Test, Level-Up Exam, dan Simulasi JLPT.
  * Integrasi penuh AI Maskot Neko-sensei adaptif sesuai tingkat kemahiran JLPT.
  * Fitur Tanya Sensei AI untuk konsultasi tata bahasa.
  * Dashboard Super Admin, audit trail, dan konfigurasi prompt AI global.
* **Fase 3: Spesifikasi Voice AI, Micro-Feedback & Monetisasi (Tahap Aktif)**
  1. **Sistem Percakapan Voice Streaming Sub-800ms**:
     - Mengintegrasikan pipeline *Speech-to-Text* (Deepgram Nova-3), streaming LLM (Claude Haiku / GPT-4o-mini), dan *Text-to-Speech* (Cartesia Sonic / ElevenLabs) interaktif berbasis WebRTC.
     - Penerapan Silero VAD (stop_secs: 300ms) dan interupsi instan (*barge-in* < 25ms).
  2. **Koreksi Tata Bahasa Mikro Non-Disruptif**:
     - Mengadopsi parser tag `<correction_data>` untuk memisahkan umpan balik edukatif dari obrolan santai di frontend Next.js.
  3. **Poin Kedekatan & Memori Jangka Panjang (UserMemory & Affinity)**:
     - Menyimpan kesalahan umum dan preferensi topik siswa ke PostgreSQL (`user_memory`).
     - Setiap sesi latihan bicara menambah *Affinity Points* yang membuka ekspresi avatar dan kostum baru Neko-sensei.
  4. **Monetisasi & Gateway Pembayaran**:
     - Integrasi Payment Gateway lokal Indonesia (Midtrans/Xendit) untuk aktivasi langganan Premium otomatis.
     - Provider email transaksi produksi (Resend / AWS SES) dan notifikasi Web Push PWA.
