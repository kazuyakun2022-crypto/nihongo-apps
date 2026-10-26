/**
 * Blueprint Kurikulum & Sistem Ujian E-Learning (Standar JLPT)
 * Struktur Relasi: Level -> Modul -> Unit -> Pelajaran
 * Sesuai Dokumen Arsitektur Kurikulum & Sistem Ujian E-Learning
 */

export interface ExamSubCategoryQuestion {
  id: string;
  category: "pengetahuan_bahasa" | "bunpou_dokkai" | "choukai";
  categoryLabel: string;
  question: string;
  subText?: string;
  options: string[];
  correctAnswer: string;
  point: number;
}

export interface ExamSubCategoryRule {
  id: "pengetahuan_bahasa" | "bunpou_dokkai" | "choukai";
  name: string;
  durationMinutes: number;
  maxScore: number;
  passingMark: number;
}

export interface LevelGatewayExam {
  id: string;
  title: string;
  targetLevelCode: string;
  targetLevelName: string;
  totalDurationMinutes: number;
  maxTotalScore: number;
  passingTotalScore: number;
  passingPercentage: number;
  description: string;
  rules: ExamSubCategoryRule[];
  questions: ExamSubCategoryQuestion[];
}

export interface StageUnit {
  id: string;
  unitNumber: number;
  title: string;
  subtitle: string;
  status: "completed" | "active" | "locked";
  score?: number;
  requiredNote?: string;
  sampleItems?: { jp: string; romaji: string; meaning: string }[];
}

export interface CurriculumModule {
  id: string;
  moduleNumber: number;
  title: string;
  japaneseTitle: string;
  description: string;
  isLocked: boolean;
  lockRequirement: string;
  stages: StageUnit[];
}

export interface CurriculumLevel {
  id: string;
  code: string; // "Pra-N5" | "N5" | "N4" | "N3" | "N2" | "N1"
  name: string;
  japaneseLabel: string;
  isLocked: boolean;
  targetKanji: string;
  targetKosakata: string;
  fokusPembelajaran: string;
  modules: CurriculumModule[];
  gatewayExam: LevelGatewayExam;
}

export const CURRICULUM_BLUEPRINT_DATA: CurriculumLevel[] = [
  // ── LEVEL 1: PRA-N5 (ONBOARDING MODULE) ──
  {
    id: "level-pra-n5",
    code: "Pra-N5",
    name: "Pra-N5 (Onboarding)",
    japaneseLabel: "入門・基礎",
    isLocked: false,
    targetKanji: "0 (92 Kana)",
    targetKosakata: "50 - 100 kata",
    fokusPembelajaran: "Pengenalan aksara dasar (Hiragana & Katakana), pelafalan bunyi, dan salam sapaan harian.",
    gatewayExam: {
      id: "exam-pra-n5-to-n5",
      title: "Ujian Kenaikan Tingkat: Pra-N5 ke N5",
      targetLevelCode: "N5",
      targetLevelName: "N5 (Dasar)",
      totalDurationMinutes: 45,
      maxTotalScore: 100,
      passingTotalScore: 60,
      passingPercentage: 60,
      description: "Ujian gateway kelulusan fondasi aksara dan sapaan dasar. Wajib mencapai skor minimal di setiap sub-kategori untuk membuka Level N5.",
      rules: [
        {
          id: "pengetahuan_bahasa",
          name: "Aksara Kana & Kosakata",
          durationMinutes: 15,
          maxScore: 50,
          passingMark: 30,
        },
        {
          id: "bunpou_dokkai",
          name: "Sapaan & Angka (Aisatsu)",
          durationMinutes: 15,
          maxScore: 30,
          passingMark: 18,
        },
        {
          id: "choukai",
          name: "Pelafalan & Suara (Choukai)",
          durationMinutes: 15,
          maxScore: 20,
          passingMark: 12,
        },
      ],
      questions: [
        {
          id: "q-p1",
          category: "pengetahuan_bahasa",
          categoryLabel: "Aksara Kana & Kosakata",
          question: "Manakah bacaan Romaji yang benar untuk huruf Hiragana: あ ?",
          options: ["a", "i", "u", "e"],
          correctAnswer: "a",
          point: 25,
        },
        {
          id: "q-p2",
          category: "pengetahuan_bahasa",
          categoryLabel: "Aksara Kana & Kosakata",
          question: "Pilihlah penulisan Hiragana yang benar untuk kata 'Neko' (Kucing):",
          options: ["ねこ", "いぬ", "とり", "さかな"],
          correctAnswer: "ねこ",
          point: 25,
        },
        {
          id: "q-p3",
          category: "bunpou_dokkai",
          categoryLabel: "Sapaan & Angka",
          question: "Salam apa yang diucapkan saat pertama kali bertemu seseorang (Senang berkenalan)?",
          options: ["はじめまして (Hajimemashite)", "こんばんは (Konbanwa)", "さようなら (Sayounara)", "おやすみ (Oyasumi)"],
          correctAnswer: "はじめまして (Hajimemashite)",
          point: 30,
        },
        {
          id: "q-p4",
          category: "choukai",
          categoryLabel: "Pelafalan & Suara",
          question: "Dengarkan/baca audio pelafalan: 'Arigatou gozaimasu'. Apa arti ungkapan ini dalam bahasa Indonesia?",
          subText: "Kategori etika dasar kesopanan Jepang",
          options: ["Terima kasih banyak", "Selamat pagi", "Sampai jumpa", "Permisi"],
          correctAnswer: "Terima kasih banyak",
          point: 20,
        },
      ],
    },
    modules: [
      {
        id: "mod-kana",
        moduleNumber: 1,
        title: "Modul Kana (Aksara)",
        japaneseTitle: "仮名文字",
        description: "Hiragana Dasar (46 huruf + urutan goresan), Modifikasi Hiragana (Dakuon, Handakuon, Yoon, Sokuon), dan Katakana Dasar beserta aturan serapan asing.",
        isLocked: false,
        lockRequirement: "",
        stages: [
          {
            id: "m1-u1",
            unitNumber: 1,
            title: "Pengenalan Hiragana Dasar",
            subtitle: "46 Aksara Gojuuon (A-I-U-E-O hingga Wa-O-N) & Urutan Goresan",
            status: "completed",
            score: 100,
            sampleItems: [
              { jp: "あ (a)", romaji: "a", meaning: "Vokal Dasar A" },
              { jp: "い (i)", romaji: "i", meaning: "Vokal Dasar I" },
              { jp: "う (u)", romaji: "u", meaning: "Vokal Dasar U" },
              { jp: "か (ka)", romaji: "ka", meaning: "Konsonan K-A" },
            ],
          },
          {
            id: "m1-u2",
            unitNumber: 2,
            title: "Modifikasi Hiragana",
            subtitle: "Dakuon (Tenten), Handakuon (Maru), Yoon (Kombinasi Ya-Yu-Yo), dan Sokuon (Konsonan Ganda)",
            status: "active",
            sampleItems: [
              { jp: "が (ga)", romaji: "ga", meaning: "Dakuon Ka + Tenten" },
              { jp: "ぱ (pa)", romaji: "pa", meaning: "Handakuon Ha + Maru" },
              { jp: "きょ (kyo)", romaji: "kyo", meaning: "Yoon Ki + Yo kecil" },
            ],
          },
          {
            id: "m1-u3",
            unitNumber: 3,
            title: "Katakana Dasar & Serapan Asing",
            subtitle: "46 Karakter Katakana, Choonpu (Vokal Panjang), dan Kosakata Serapan Luar Negeri (Gairaigo)",
            status: "locked",
            requiredNote: "Selesaikan Modifikasi Hiragana terlebih dahulu",
            sampleItems: [
              { jp: "コーヒー", romaji: "koohii", meaning: "Kopi (Gairaigo)" },
              { jp: "パン", romaji: "pan", meaning: "Roti (Serapan Portugis)" },
            ],
          },
          {
            id: "m1-u4",
            unitNumber: 4,
            title: "Evaluasi Pemantapan Kana",
            subtitle: "Latihan Membaca Cepat & Dikte Penulisan Seluruh Aksara Kana",
            status: "locked",
            requiredNote: "Selesaikan Unit 1 s/d 3",
          },
        ],
      },
      {
        id: "mod-suara-sapaan",
        moduleNumber: 2,
        title: "Dasar Suara & Sapaan (Aisatsu)",
        japaneseTitle: "挨拶と発音",
        description: "Pengenalan intonasi alami, salam harian resmi & kasual, serta ungkapan etika dasar budaya Jepang seperti Itadakimasu.",
        isLocked: true,
        lockRequirement: "Selesaikan Modul Kana dan raih evaluasi tuntas",
        stages: [
          {
            id: "m2-u1",
            unitNumber: 1,
            title: "Aisatsu Harian Dasar",
            subtitle: "Ohayou, Konnichiwa, Konbanwa, Sayounara, Oyasumi",
            status: "locked",
            requiredNote: "Buka Modul 2 terlebih dahulu",
          },
          {
            id: "m2-u2",
            unitNumber: 2,
            title: "Ungkapan Etika & Terima Kasih",
            subtitle: "Arigatou gozaimasu, Sumimasen, Onegaishimasu, Itadakimasu",
            status: "locked",
            requiredNote: "Tuntas Unit 1",
          },
          {
            id: "m2-u3",
            unitNumber: 3,
            title: "Pelatihan Suara & Respon Cepat",
            subtitle: "Audio Listening aksen Tokyo & Simulasi Balas Salam",
            status: "locked",
            requiredNote: "Tuntas Unit 2",
          },
          {
            id: "m2-u4",
            unitNumber: 4,
            title: "Test Evaluasi Sapaan",
            subtitle: "Kuis Situasi & Pemilihan Aisatsu yang Tepat",
            status: "locked",
            requiredNote: "Tuntas Unit 3",
          },
        ],
      },
      {
        id: "mod-angka-waktu",
        moduleNumber: 3,
        title: "Angka Dasar & Kalender",
        japaneseTitle: "数字と時間",
        description: "Sistem perhitungan angka 1–10.000, penyebutan jam (ji), menit (pun/fun), hari dalam seminggu, dan nama bulan.",
        isLocked: true,
        lockRequirement: "Selesaikan modul Dasar Suara & Sapaan",
        stages: [
          {
            id: "m3-u1",
            unitNumber: 1,
            title: "Angka 1 sampai 10.000",
            subtitle: "Ichi, Ni, San, Yon/Shi, Go... Juu, Hyaku, Sen, Man",
            status: "locked",
            requiredNote: "Buka Modul 3 terlebih dahulu",
          },
          {
            id: "m3-u2",
            unitNumber: 2,
            title: "Waktu: Jam & Menit",
            subtitle: "Ima nan-ji desu ka? Perubahan bunyi pada 1分, 3分, 6分, 8分, 10分",
            status: "locked",
            requiredNote: "Tuntas Unit 1",
          },
          {
            id: "m3-u3",
            unitNumber: 3,
            title: "Hari, Tanggal & Bulan",
            subtitle: "Getsuyoubi s/d Nichiyoubi, penyebutan tanggal khusus (Tsuitachi, Futsuka)",
            status: "locked",
            requiredNote: "Tuntas Unit 2",
          },
          {
            id: "m3-u4",
            unitNumber: 4,
            title: "Test Evaluasi Angka & Waktu",
            subtitle: "Simulasi Membaca Jadwal Jam & Perhitungan Kasir",
            status: "locked",
            requiredNote: "Tuntas Unit 3",
          },
        ],
      },
    ],
  },

  // ── LEVEL 2: N5 (DASAR / BEGINNER) ──
  {
    id: "level-n5",
    code: "N5",
    name: "N5 (Dasar)",
    japaneseLabel: "初級・N5",
    isLocked: true,
    targetKanji: "~100 Kanji",
    targetKosakata: "~800 kata",
    fokusPembelajaran: "Kalimat sederhana sehari-hari, partikel dasar, dan perubahan bentuk kata kerja dasar.",
    gatewayExam: {
      id: "exam-n5-to-n4",
      title: "Parameter Ujian Kenaikan Tingkat: N5 ke N4",
      targetLevelCode: "N4",
      targetLevelName: "N4 (Dasar Menengah)",
      totalDurationMinutes: 105,
      maxTotalScore: 180,
      passingTotalScore: 80,
      passingPercentage: 44,
      description: "Ujian berstandar resmi JLPT N5. Wajib mencapai skor minimal di kedua seksi ujian (Pengetahuan Bahasa min. 38/120 & Choukai min. 19/60).",
      rules: [
        {
          id: "pengetahuan_bahasa",
          name: "Pengetahuan Bahasa & Bunpou",
          durationMinutes: 75,
          maxScore: 120,
          passingMark: 38,
        },
        {
          id: "choukai",
          name: "Mendengarkan (Choukai)",
          durationMinutes: 30,
          maxScore: 60,
          passingMark: 19,
        },
      ],
      questions: [
        {
          id: "q-n5-1",
          category: "pengetahuan_bahasa",
          categoryLabel: "Pengetahuan Bahasa (Kanji)",
          question: "Kanji apakah ini: 水 dan apa artinya?",
          options: ["Mizu (Air)", "Hi (Api)", "Ki (Pohon)", "Kane (Uang)"],
          correctAnswer: "Mizu (Air)",
          point: 40,
        },
        {
          id: "q-n5-2",
          category: "pengetahuan_bahasa",
          categoryLabel: "Pengetahuan Bahasa (Tata Bahasa / Bunpou)",
          question: "Lengkapi kalimat: 'Watashi ___ gakusei desu' (Saya adalah murid):",
          options: ["は (wa)", "を (wo)", "に (ni)", "で (de)"],
          correctAnswer: "は (wa)",
          point: 40,
        },
        {
          id: "q-n5-3",
          category: "pengetahuan_bahasa",
          categoryLabel: "Pengetahuan Bahasa (Bentuk Kata Kerja)",
          question: "Bentuk -Te (Te-kei) dari kata kerja 食べます (Tabemasu) adalah:",
          options: ["たべて (Tabete)", "たべた (Tabeta)", "たべない (Tabenai)", "たべよう (Tabeyou)"],
          correctAnswer: "たべて (Tabete)",
          point: 40,
        },
        {
          id: "q-n5-4",
          category: "choukai",
          categoryLabel: "Mendengarkan (Choukai)",
          question: "Dalam percakapan di toko: 'Kore wa ikura desu ka?' Apa yang ditanyakan oleh pembeli?",
          subText: "Dialog transaksi belanja sehari-hari",
          options: ["Menanyakan harga barang", "Menanyakan letak toilet", "Menanyakan nama toko", "Menanyakan waktu buka"],
          correctAnswer: "Menanyakan harga barang",
          point: 60,
        },
      ],
    },
    modules: [
      {
        id: "mod-n5-kanji",
        moduleNumber: 1,
        title: "Modul Kanji (~100 Karakter)",
        japaneseTitle: "漢字学習",
        description: "Angka, Waktu, Hari, Arah, Posisi, Alam Dasar, Orang, Kata Kerja Dasar, dan Kata Sifat Dasar.",
        isLocked: false,
        lockRequirement: "Lulus Ujian Kenaikan Tingkat Pra-N5",
        stages: [
          {
            id: "n5-k1",
            unitNumber: 1,
            title: "Kanji Alam & Angka",
            subtitle: "日, 月, 火, 水, 木, 金, 土, 山, 川, 田",
            status: "active",
            sampleItems: [
              { jp: "日 (hi/nichi)", romaji: "nichi", meaning: "Matahari / Hari" },
              { jp: "水 (mizu/sui)", romaji: "mizu", meaning: "Air" },
              { jp: "山 (yama/san)", romaji: "yama", meaning: "Gunung" },
            ],
          },
          {
            id: "n5-k2",
            unitNumber: 2,
            title: "Kanji Orang & Arah",
            subtitle: "人, 子, 女, 男, 上, 下, 左, 右, 中",
            status: "locked",
            requiredNote: "Selesaikan Unit 1",
          },
          {
            id: "n5-k3",
            unitNumber: 3,
            title: "Kanji Kata Kerja & Kata Sifat",
            subtitle: "行, 来, 見, 食, 飲, 大, 小, 高, 白",
            status: "locked",
            requiredNote: "Selesaikan Unit 2",
          },
          {
            id: "n5-k4",
            unitNumber: 4,
            title: "Evaluasi Pemahaman 100 Kanji",
            subtitle: "Membaca Onyomi & Kunyomi dalam Kalimat Nyata",
            status: "locked",
            requiredNote: "Selesaikan Unit 1-3",
          },
        ],
      },
      {
        id: "mod-n5-vocab",
        moduleNumber: 2,
        title: "Modul Kosakata (~800 Kata)",
        japaneseTitle: "重要単語",
        description: "Keluarga sendiri vs orang lain, benda sekitar, profesi, transportasi, hobi, makanan, warna, dan kata tunjuk (Kore, Sore, Are).",
        isLocked: true,
        lockRequirement: "Tuntaskan modul Kanji N5",
        stages: [
          {
            id: "n5-v1",
            unitNumber: 1,
            title: "Benda Sekitar & Kata Tunjuk",
            subtitle: "Kore, Sore, Are, Hon, Tsukue, Isu, Pen, Kuruma",
            status: "locked",
            requiredNote: "Buka Modul Kosakata N5",
          },
          {
            id: "n5-v2",
            unitNumber: 2,
            title: "Keluarga & Hubungan Sosial",
            subtitle: "Chichi/Otousan, Haha/Okaasan, Tomodachi, Sensei",
            status: "locked",
            requiredNote: "Tuntas Unit 1",
          },
          {
            id: "n5-v3",
            unitNumber: 3,
            title: "Makanan, Profesi & Transportasi",
            subtitle: "Gohan, Pan, Densha, Basu, Isha, Kaishain",
            status: "locked",
            requiredNote: "Tuntas Unit 2",
          },
          {
            id: "n5-v4",
            unitNumber: 4,
            title: "Test Evaluasi 800 Kosakata",
            subtitle: "Kuis Perbendaharaan Kata N5",
            status: "locked",
            requiredNote: "Tuntas Unit 1-3",
          },
        ],
      },
      {
        id: "mod-n5-grammar",
        moduleNumber: 3,
        title: "Modul Tata Bahasa (Bunpou)",
        japaneseTitle: "基本文法",
        description: "Struktur Kalimat Nominal, Partikel Dasar (wa, ga, wo, ni, de...), Konjugasi Kata Sifat, Klasifikasi Kata Kerja, dan Bentuk -Te.",
        isLocked: true,
        lockRequirement: "Selesaikan modul Kosakata N5",
        stages: [
          {
            id: "n5-g1",
            unitNumber: 1,
            title: "Struktur Nominal & Partikel Dasar",
            subtitle: "A wa B desu, partikel wa, ga, wo, ni, de, he, to, mo, no",
            status: "locked",
            requiredNote: "Buka Modul Tata Bahasa N5",
          },
          {
            id: "n5-g2",
            unitNumber: 2,
            title: "Konjugasi Kata Sifat & Kata Kerja",
            subtitle: "Keiyoushi -i & -na, Kata Kerja Grup 1/2/3, Bentuk -masu & -nai",
            status: "locked",
            requiredNote: "Tuntas Unit 1",
          },
          {
            id: "n5-g3",
            unitNumber: 3,
            title: "Bentuk -Te & Ekspresi Keinginan",
            subtitle: "Te-kei (Permintaan, Izin, Larangan), ~tai desu, Perbandingan (A wa B yori)",
            status: "locked",
            requiredNote: "Tuntas Unit 2",
          },
          {
            id: "n5-g4",
            unitNumber: 4,
            title: "Test Evaluasi Tata Bahasa",
            subtitle: "Kuis Analisis Struktur Kalimat N5",
            status: "locked",
            requiredNote: "Tuntas Unit 1-3",
          },
        ],
      },
      {
        id: "mod-n5-dokkai-choukai",
        moduleNumber: 4,
        title: "Dokkai & Choukai (Membaca & Mendengar)",
        japaneseTitle: "読解・聴解",
        description: "Membaca memo, jadwal kereta, serta mendengarkan transaksi belanja dan perkenalan diri sesuai format ujian JLPT N5.",
        isLocked: true,
        lockRequirement: "Selesaikan modul Tata Bahasa N5",
        stages: [
          {
            id: "n5-d1",
            unitNumber: 1,
            title: "Dokkai: Memo & Pengumuman Pendek",
            subtitle: "Membaca pesan singkat dan petunjuk arah sederhana",
            status: "locked",
            requiredNote: "Buka Modul 4",
          },
          {
            id: "n5-d2",
            unitNumber: 2,
            title: "Dokkai: Jadwal & Informasi Praktis",
            subtitle: "Membaca tabel waktu kereta, poster diskon, jam buka toko",
            status: "locked",
            requiredNote: "Tuntas Unit 1",
          },
          {
            id: "n5-d3",
            unitNumber: 3,
            title: "Choukai: Respon Dialog Pendek",
            subtitle: "Latihan mendengarkan sapaan dan respon cepat di tempat umum",
            status: "locked",
            requiredNote: "Tuntas Unit 2",
          },
          {
            id: "n5-d4",
            unitNumber: 4,
            title: "Simulasi Ujian Dokkai & Choukai",
            subtitle: "Latihan soal komprehensif jelang Ujian Kenaikan Tingkat N4",
            status: "locked",
            requiredNote: "Tuntas Unit 1-3",
          },
        ],
      },
    ],
  },

  // ── LEVEL 3: N4 (DASAR MENENGAH) ──
  {
    id: "level-n4",
    code: "N4",
    name: "N4 (Dasar Menengah)",
    japaneseLabel: "初中級・N4",
    isLocked: true,
    targetKanji: "~300 Kanji",
    targetKosakata: "~1.500 kata",
    fokusPembelajaran: "Percakapan harian penuh, bentuk sopan & kasual, kalimat majemuk, dan pengantar Keigo.",
    gatewayExam: {
      id: "exam-n4-to-n3",
      title: "Ujian Kenaikan Tingkat: N4 ke N3",
      targetLevelCode: "N3",
      targetLevelName: "N3 (Menengah)",
      totalDurationMinutes: 115,
      maxTotalScore: 180,
      passingTotalScore: 90,
      passingPercentage: 50,
      description: "Gateway kelulusan level N4 untuk membuka kurikulum teks berita ringan N3.",
      rules: [
        { id: "pengetahuan_bahasa", name: "Pengetahuan Bahasa & Bunpou", durationMinutes: 80, maxScore: 120, passingMark: 38 },
        { id: "choukai", name: "Mendengarkan (Choukai)", durationMinutes: 35, maxScore: 60, passingMark: 19 },
      ],
      questions: [],
    },
    modules: [],
  },

  // ── LEVEL 4: N3 (MENENGAH) ──
  {
    id: "level-n3",
    code: "N3",
    name: "N3 (Menengah)",
    japaneseLabel: "中級・N3",
    isLocked: true,
    targetKanji: "~650 Kanji",
    targetKosakata: "~3.750 kata",
    fokusPembelajaran: "Jembatan bahasa lisan ke tulisan, koran ringan, dan situasi kerja formal.",
    gatewayExam: {
      id: "exam-n3-to-n2",
      title: "Ujian Kenaikan Tingkat: N3 ke N2",
      targetLevelCode: "N2",
      targetLevelName: "N2 (Mahir Menengah)",
      totalDurationMinutes: 140,
      maxTotalScore: 180,
      passingTotalScore: 95,
      passingPercentage: 52,
      description: "Gateway kelulusan level N3 untuk membuka bahasa bisnis N2.",
      rules: [
        { id: "pengetahuan_bahasa", name: "Pengetahuan Bahasa & Dokkai", durationMinutes: 100, maxScore: 120, passingMark: 38 },
        { id: "choukai", name: "Mendengarkan (Choukai)", durationMinutes: 40, maxScore: 60, passingMark: 19 },
      ],
      questions: [],
    },
    modules: [],
  },

  // ── LEVEL 5: N2 (MAHIR MENENGAH) ──
  {
    id: "level-n2",
    code: "N2",
    name: "N2 (Mahir Menengah)",
    japaneseLabel: "上中級・N2",
    isLocked: true,
    targetKanji: "~1.000 Kanji",
    targetKosakata: "~6.000 kata",
    fokusPembelajaran: "Bahasa bisnis penuh, artikel berita, dan ekspresi abstrak profesional.",
    gatewayExam: {
      id: "exam-n2-to-n1",
      title: "Ujian Kenaikan Tingkat: N2 ke N1",
      targetLevelCode: "N1",
      targetLevelName: "N1 (Master)",
      totalDurationMinutes: 155,
      maxTotalScore: 180,
      passingTotalScore: 90,
      passingPercentage: 50,
      description: "Gateway kelulusan level N2 untuk menuju level master N1.",
      rules: [
        { id: "pengetahuan_bahasa", name: "Pengetahuan Bahasa & Dokkai", durationMinutes: 105, maxScore: 120, passingMark: 38 },
        { id: "choukai", name: "Mendengarkan (Choukai)", durationMinutes: 50, maxScore: 60, passingMark: 19 },
      ],
      questions: [],
    },
    modules: [],
  },

  // ── LEVEL 6: N1 (MASTER / MAHIR PENUH) ──
  {
    id: "level-n1",
    code: "N1",
    name: "N1 (Master)",
    japaneseLabel: "最上級・N1",
    isLocked: true,
    targetKanji: "~2.136 Kanji",
    targetKosakata: "~10.000+ kata",
    fokusPembelajaran: "Teks akademik, sastra, hukum, dan nuansa bahasa tingkat tinggi tanpa hambatan.",
    gatewayExam: {
      id: "exam-n1-cert",
      title: "Sertifikasi Kelulusan Akhir: JLPT N1 Master",
      targetLevelCode: "Tamat",
      targetLevelName: "JLPT N1 Certified Master",
      totalDurationMinutes: 170,
      maxTotalScore: 180,
      passingTotalScore: 100,
      passingPercentage: 55,
      description: "Ujian sertifikasi akhir kurikulum bahasa Jepang tingkat tertinggi.",
      rules: [
        { id: "pengetahuan_bahasa", name: "Gengo Chishiki & Dokkai", durationMinutes: 110, maxScore: 120, passingMark: 38 },
        { id: "choukai", name: "Choukai Kecepatan Tinggi", durationMinutes: 60, maxScore: 60, passingMark: 19 },
      ],
      questions: [],
    },
    modules: [],
  },
];
