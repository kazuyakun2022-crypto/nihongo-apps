import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ALL_15_SCENARIOS = [
  // ── 01. Konbini (Pemula / N5) ──
  {
    sourceKey: "scenario-01-konbini",
    levelId: 1, // PEMULA
    title: "Transaksi Dasar Minimarket (Konbini)",
    imageUrl: "/images/scenarios/01_Misi_Pertama_di_Konbini.png",
    location: "Kasir Konbini di Tokyo",
    userRole: "Pembeli (Siswa)",
    mascotRole: "Kasir Konbini Ramah",
    keigoType: "Teineigo / Desu-Masu",
    goal: "Membeli bento, meminta bantuan pemanasan makanan, dan merespons pertanyaan kantong plastik.",
    initialMessage: "いらっしゃいませ！お会計、こちらへどうぞ。",
    targetGrammar: ["〜をお願いします", "〜てください", "袋はいりません"],
    maxTurns: 12,
    sortOrder: 1,
    status: "published" as const,
    systemPrompt:
      "Anda adalah kasir Konbini Jepang yang ramah. Bantu siswa membeli bento, tanyakan apakah ingin dihangatkan ('温めますか？'), dan tanyakan apakah butuh kantong plastik ('袋はお付けしますか？'). Gunakan bahasa Jepang Teineigo yang sopan dan ringkas. Berikan koreksi lembut jika siswa salah.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "いらっしゃいませ！お会計、こちらへどうぞ。",
        romaji: "Irasshaimase! Okaikei, kochira e douzo.",
        indonesianText: "Selamat datang! Silakan melakukan pembayaran di sini.",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["これをお願いします", "お弁当"],
        hintText: "Katakan: これをお願いします (Kore o onegaishimasu)",
        japaneseText: "これをお願いします。",
        romaji: "Kore o onegaishimasu.",
        indonesianText: "Tolong bayar yang ini.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "はい、お弁当ですね。温めますか？",
        romaji: "Hai, obentou desu ne. Atatamemasu ka?",
        indonesianText: "Baik, bento ya. Apakah mau dihangatkan?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["温めてください", "はい"],
        hintText: "Katakan: はい、温めてください。(Hai, atatame te kudasai.)",
        japaneseText: "はい、温めてください。",
        romaji: "Hai, atatame te kudasai.",
        indonesianText: "Ya, tolong dihangatkan.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "かしこまりました。少々お待ちください。...お待たせしました。袋はお付けしますか？",
        romaji: "Kashikomarimashita. Shou-shou omachi kudasai. ...Omataseshimashita. Fukuro wa otsuke shimasu ka?",
        indonesianText: "Baik. Mohon tunggu sebentar. ...Terima kasih telah menunggu. Apakah ingin ditambah kantong plastik?",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["袋はいりません", "大丈夫です", "いいえ"],
        hintText: "Katakan: いいえ、袋はいりません。大丈夫です。(Iie, fukuro wa irimasen. Daijoubu desu.)",
        japaneseText: "いいえ、袋はいりません。大丈夫です。",
        romaji: "Iie, fukuro wa irimasen. Daijoubu desu.",
        indonesianText: "Tidak, tidak perlu kantong plastik. Tidak apa-apa.",
      },
      {
        step: 7,
        speaker: "AI",
        japaneseText: "かしこまりました。合計で550円になります。",
        romaji: "Kashikomarimashita. Goukei de gohyaku-gojuu en ni narimasu.",
        indonesianText: "Baik. Totalnya menjadi 550 yen.",
      },
      {
        step: 8,
        speaker: "USER",
        expectedKeyPhrases: ["550円", "どうぞ", "はい"],
        hintText: "Katakan: 550円ですね。はい、どうぞ。(Gohyaku-gojuu en desu ne. Hai, douzo.)",
        japaneseText: "550円ですね。はい、どうぞ。",
        romaji: "Gohyaku-gojuu en desu ne. Hai, douzo.",
        indonesianText: "550 yen ya. Ini uangnya.",
      },
      {
        step: 9,
        speaker: "AI",
        japaneseText: "ちょうどお預かりします。ありがとうございました！またお越しください。",
        romaji: "Choudo oazukari shimasu. Arigatou gozaimashita! Mata okoshi kudasai.",
        indonesianText: "Uangnya pas saya terima. Terima kasih banyak! Silakan datang kembali.",
      },
    ],
  },

  // ── 02. Stasiun Shinjuku (N5) ──
  {
    sourceKey: "scenario-02-shinjuku",
    levelId: 2, // N5
    title: "Tersesat & Tanya Jalur Kereta di Stasiun Shinjuku",
    imageUrl: "/images/scenarios/02_Tersesat_di_Stasiun_Shinjuku.png",
    location: "Pintu Keluar Barat Stasiun Shinjuku",
    userRole: "Turis / Siswa",
    mascotRole: "Petugas Stasiun (Ekiin)",
    keigoType: "Teineigo Sopan",
    goal: "Menanyakan lokasi peron jalur Yamanote Line (peron 14/15) dan arah menuju peron tersebut.",
    initialMessage: "はい、どうされましたか？何かお困りですか？",
    targetGrammar: ["〜はどこですか", "〜番線", "まっすぐ行ってください"],
    maxTurns: 10,
    sortOrder: 2,
    status: "published" as const,
    systemPrompt:
      "Anda adalah petugas stasiun kereta (Ekiin) di Stasiun Shinjuku yang sigap dan ramah. Pandu siswa yang tersesat mencari peron Yamanote Line (nomor 14 dan 15) dengan petunjuk arah sederhana dalam bahasa Teineigo.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "はい、どうされましたか？何かお困りですか？",
        romaji: "Hai, dou saremashita ka? Nani ka okomari desu ka?",
        indonesianText: "Ya, ada apa? Apakah ada yang bisa saya bantu?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["すみません", "山手線", "どこですか"],
        hintText: "Katakan: すみません、山手線のホームはどこですか？",
        japaneseText: "すみません、山手線のホームはどこですか？",
        romaji: "Sumimasen, Yamanote-sen no hoomu wa doko desu ka?",
        indonesianText: "Permisi, peron jalur Yamanote Line ada di mana ya?",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "山手線ですね。あちらの階段を上がって、14番線と15番線です。",
        romaji: "Yamanote-sen desu ne. Achira no kaidan o agatte, juu-yon-bansen to juu-go-bansen desu.",
        indonesianText: "Jalur Yamanote ya. Naik tangga di sebelah sana, peron nomor 14 dan 15.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["14番線", "ありがとうございます"],
        hintText: "Katakan: 14番線ですね。ありがとうございます！",
        japaneseText: "14番線ですね。ありがとうございます！",
        romaji: "Juu-yon-bansen desu ne. Arigatou gozaimasu!",
        indonesianText: "Peron nomor 14 ya. Terima kasih banyak!",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "いいえ、お気をつけて行ってらっしゃいませ！",
        romaji: "Iie, oki o tsukete itterasshaimase!",
        indonesianText: "Sama-sama, hati-hati di jalan ya!",
      },
    ],
  },

  // ── 03. Kedai Ramen Mesin Tiket (N5) ──
  {
    sourceKey: "scenario-03-ramen",
    levelId: 2, // N5
    title: "Memesan Ramen dengan Mesin Tiket (Shokukenki)",
    imageUrl: "/images/scenarios/03_Memesan_Ramen_dengan_Mesin_Tiket.png",
    location: "Kedai Ramen di Tokyo",
    userRole: "Pelanggan (Siswa)",
    mascotRole: "Pelayan Kedai Ramen",
    keigoType: "Teineigo Kasual Restoran",
    goal: "Menyerahkan tiket ramen, memesan tingkat kekerasan mie (katame), dan menambah porsi chashu.",
    initialMessage: "いらっしゃい！食券をお預かりします！",
    targetGrammar: ["〜をお願いします", "麺硬めで", "チャーシュー"],
    maxTurns: 10,
    sortOrder: 3,
    status: "published" as const,
    systemPrompt:
      "Anda adalah staf kedai ramen Jepang yang energik. Terima tiket ramen pelanggan, tanyakan preferensi kekerasan mie ('麺の硬さはどうしますか？'), dan tanyakan apakah ingin menambah topping.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "いらっしゃい！食券をお預かりします！",
        romaji: "Irasshai! Shokken o oazukari shimasu!",
        indonesianText: "Selamat datang! Saya terima tiket makannya!",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["お願いします", "麺は硬め", "硬め"],
        hintText: "Katakan: これをお願いします。麺は硬めでお願いします。",
        japaneseText: "これをお願いします。麺は硬めでお願いします。",
        romaji: "Kore o onegaishimasu. Men wa katame de onegaishimasu.",
        indonesianText: "Tolong yang ini. Mienya tolong agak keras ya.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "はい、醤油ラーメン麺硬めですね！トッピングはいかがですか？",
        romaji: "Hai, shouyu raamen men katame desu ne! Toppingu wa ikaga desu ka?",
        indonesianText: "Baik, Shoyu Ramen mie keras ya! Mau tambah topping?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["チャーシュー", "追加で", "お願いします"],
        hintText: "Katakan: チャーシューを追加でお願いします。",
        japaneseText: "チャーシューを追加でお願いします。",
        romaji: "Chaashuu o tsuika de onegaishimasu.",
        indonesianText: "Tolong tambah ekstra chashu.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "かしこまりました！席でお待ちください。すぐお作りします！",
        romaji: "Kashikomarimashita! Seki de omachi kudasai. Sugu otsukuri shimasu!",
        indonesianText: "Baik, dimengerti! Silakan menunggu di kursi. Segera kami siapkan!",
      },
    ],
  },

  // ── 04. Ryokan Tradisional (N5) ──
  {
    sourceKey: "scenario-04-ryokan",
    levelId: 2, // N5
    title: "Check-in & Etika Ryokan Tradisional",
    imageUrl: "/images/scenarios/04_Check_in_di_Ryokan_Tradisional.png",
    location: "Genkan & Resepsionis Ryokan di Kyoto",
    userRole: "Tamu Menginap",
    mascotRole: "Okami-san (Pemilik Ryokan)",
    keigoType: "Sonkeigo (Pihak Ryokan) & Teineigo",
    goal: "Konfirmasi reservasi nama, etika melepas sepatu di genkan, dan memahami petunjuk fasilitas onsen & makan malam.",
    initialMessage: "いらっしゃいませ。ようこそお越しくださいました。スリッパへお履き替えください。",
    targetGrammar: ["〜と申します", "〜でございます", "何時ですか"],
    maxTurns: 10,
    sortOrder: 4,
    status: "published" as const,
    systemPrompt:
      "Anda adalah Okami-san (pemilik penginapan tradisional Ryokan di Kyoto) yang ramah dan menggunakan Sonkeigo/Teineigo yang anggun. Pandu tamu untuk check-in, ganti sepatu dengan sandal, beri tahu kamar 'Sakura' di lantai 2, dan jam makan malam.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "いらっしゃいませ。ようこそお越しくださいました。スリッパへお履き替えください。",
        romaji: "Irasshaimase. Youkoso okoshi kudasaimashita. Surippa e ohakikae kudasai.",
        indonesianText: "Selamat datang! Terima kasih telah berkunjung. Silakan mengganti sepatu dengan sandal kamar.",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["予約した", "こんにちは", "です"],
        hintText: "Katakan: こんにちは。予約した田中です。(Konnichiwa. Yoyaku shita Tanaka desu.)",
        japaneseText: "こんにちは。予約した田中です。",
        romaji: "Konnichiwa. Yoyaku shita Tanaka desu.",
        indonesianText: "Halo. Saya Tanaka yang sudah membuat reservasi.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "田中様ですね。お待ちしておりました。本日のお部屋は2階の「さくら」でございます。",
        romaji: "Tanaka-sama desu ne. Omachi shite orimashita. Honjitsu no oheya wa nikai no 'Sakura' de gozaimasu.",
        indonesianText: "Bapak/Ibu Tanaka ya. Kami sudah menunggu Anda. Kamar Anda hari ini adalah 'Sakura' di lantai 2.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["夕食は何時ですか", "ありがとうございます"],
        hintText: "Katakan: ありがとうございます。夕食は何時ですか？(Arigatou gozaimasu. Yuushoku wa nanji desu ka?)",
        japaneseText: "ありがとうございます。夕食は何時ですか？",
        romaji: "Arigatou gozaimasu. Yuushoku wa nanji desu ka?",
        indonesianText: "Terima kasih. Jam berapa makan malamnya?",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "夕食は午後6時半にお部屋へお持ちいたします。お風呂は午後11時までご利用いただけます。",
        romaji: "Yuushoku wa gogo rokuji-han ni oheya e omochi itashimasu. Ofuro wa gogo juu-ichiji made goriyou itadakemasu.",
        indonesianText: "Makan malam akan kami antarkan ke kamar pada pukul 18:30. Pemandian air panas dapat digunakan hingga pukul 23:00.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["分かりました", "よろしくお願いします"],
        hintText: "Katakan: 分かりました。よろしくお願いします。(Wakarimashita. Yoroshiku onegaishimasu.)",
        japaneseText: "分かりました。よろしくお願いします。",
        romaji: "Wakarimashita. Yoroshiku onegaishimasu.",
        indonesianText: "Saya mengerti. Mohon bantuannya.",
      },
    ],
  },

  // ── 05. Belanja Pakaian (N5) ──
  {
    sourceKey: "scenario-05-belanja-baju",
    levelId: 2, // N5
    title: "Belanja Pakaian & Fitting Room",
    imageUrl: "/images/scenarios/05_Belanja_Baju_dan_Mencari_Ukuran.png",
    location: "Toko Pakaian di Shibuya",
    userRole: "Pembeli",
    mascotRole: "Staf Toko Baju (Ten'in)",
    keigoType: "Teineigo & Istilah Belanja",
    goal: "Bertanya variasi warna/ukuran pakaian, dan meminta izin mencoba pakaian di kamar ganti (fitting room).",
    initialMessage: "いらっしゃいませ！何かお探しですか？",
    targetGrammar: ["〜はありますか", "〜てもいいですか", "これにします"],
    maxTurns: 10,
    sortOrder: 5,
    status: "published" as const,
    systemPrompt:
      "Anda adalah staf toko pakaian di Shibuya yang ramah dan sigap melayani pelanggan. Jawab pertanyaan pembeli tentang ukuran sweter (M), persilakan ke kamar ganti di sebelah kanan dalam, dan bantu proses transaksi.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "いらっしゃいませ！何かお探しですか？",
        romaji: "Irasshaimase! Nani ka osagashi desu ka?",
        indonesianText: "Selamat datang! Apakah sedang mencari sesuatu?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["Mサイズ", "ありますか", "セーター"],
        hintText: "Katakan: すみません、このセーターのMサイズはありますか？",
        japaneseText: "すみません、このセーターのMサイズはありますか？",
        romaji: "Sumimasen, kono seetaa no emu-saizu wa arimasu ka?",
        indonesianText: "Permisi, apakah ada ukuran M untuk sweter ini?",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "はい、確認いたします。...お待たせしました。こちらがMサイズになります。",
        romaji: "Hai, kakunin itashimasu. ...Omataseshimashita. Kochira ga emu-saizu ni narimasu.",
        indonesianText: "Baik, saya periksa dulu. ...Terima kasih telah menunggu. Ini ukuran M-nya.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["試着してもいいですか", "着てみても"],
        hintText: "Katakan: 試着してもいいですか？(Shichaku shite mo ii desu ka?)",
        japaneseText: "試着してもいいですか？",
        romaji: "Shichaku shite mo ii desu ka?",
        indonesianText: "Bolehkah saya mencobanya?",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "もちろんでございます！ご試着室は奥の右側にございます。どうぞ！",
        romaji: "Mochiron de gozaimasu! Goshichakushitsu wa oku no migigawa ni gozaimasu. Douzo!",
        indonesianText: "Tentu saja! Kamar ganti ada di sebelah kanan bagian dalam. Silakan!",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["ちょうどいいです", "これにします"],
        hintText: "Katakan: ちょうどいいです。これにします。(Choudo ii desu. Kore ni shimasu.)",
        japaneseText: "ちょうどいいです。これにします。",
        romaji: "Choudo ii desu. Kore ni shimasu.",
        indonesianText: "Ukurannya pas. Saya ambil yang ini.",
      },
    ],
  },

  // ── 06. Pemilahan Sampah (N4) ──
  {
    sourceKey: "scenario-06-sampah",
    levelId: 3, // N4
    title: "Aturan Pemilahan Sampah di Apartemen",
    imageUrl: "/images/scenarios/06_Memilah_Sampah_di_Apartemen.png",
    location: "Tempat Pembuangan Sampah Apartemen",
    userRole: "Penghuni Baru Apartemen",
    mascotRole: "Tetangga Senior",
    keigoType: "Futsuukei (Kasual Tetangga) & Teineigo",
    goal: "Memahami perbedaan sampah dapat dibakar (Moeru), tidak dapat dibakar (Moenai), dan botol daur ulang (Shigen).",
    initialMessage: "おはようございます！引越ししてきたばかりですね。ごみ出しですか？",
    targetGrammar: ["〜ばいいですか", "〜てね", "燃えるごみ / 燃えないごみ"],
    maxTurns: 10,
    sortOrder: 6,
    status: "published" as const,
    systemPrompt:
      "Anda adalah tetangga senior di apartemen yang ramah. Bantu penghuni baru memilah sampah botol plastik (lepaskan label dan tutup), dan jelaskan kategori sampah daur ulang dan hari pembuangannya.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "おはようございます！引越ししてきたばかりですね。ごみ出しですか？",
        romaji: "Ohayou gozaimasu! Hikkoshi shite kita bakari desu ne. Gomi-dashi desu ka?",
        indonesianText: "Selamat pagi! Baru saja pindah ya. Mau membuang sampah?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["ペットボトル", "どこに捨てればいいですか"],
        hintText: "Katakan: はい。でも、このペットボトルはどこに捨てればいいですか？",
        japaneseText: "はい。でも、このペットボトルはどこに捨てればいいですか？",
        romaji: "Hai. Demo, kono petto-botoru wa doko ni sutereba ii desu ka?",
        indonesianText: "Ya. Tapi, botol plastik ini harus dibuang ke mana?",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "ペットボトルは資源ごみだから、ラベルとキャップをはがして、あの青い箱に入れてね。",
        romaji: "Petto-botoru wa shigen-gomi dakara, raberu to kyappu o hagashite, ano aoi hako ni irete ne.",
        indonesianText: "Botol plastik itu sampah daur ulang, jadi lepaskan label dan tutupnya, lalu masukkan ke kotak biru itu ya.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["キャップ", "燃えるごみですか", "プラスチック"],
        hintText: "Katakan: あ、そうですか！プラスチックのキャップは燃えるごみですか？",
        japaneseText: "あ、そうですか！プラスチックのキャップは燃えるごみですか？",
        romaji: "A, sou desu ka! Purasuchikku no kyappu wa moeru-gomi desu ka?",
        indonesianText: "Oh, begitu! Apakah tutup plastik termasuk sampah dapat dibakar?",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "うん、キャップとラベルは「プラスチック資源」か「可燃ごみ」だよ。曜日に気をつけてね！",
        romaji: "Un, kyappu to raberu wa 'Purasuchikku shigen' ka 'Kanen-gomi' dayo. Youbi ni ki o tsukete ne!",
        indonesianText: "Ya, tutup dan labelnya masuk 'Plastik Daur Ulang' atau 'Sampah Dapat Dibakar'. Perhatikan hari pembuangannya ya!",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["教えてくれてありがとうございます", "気をつけます"],
        hintText: "Katakan: 教えてくれてありがとうございます！気をつけます。(Oshiete kurete arigatou gozaimasu! Ki o tsukemasu.)",
        japaneseText: "教えてくれてありがとうございます！気をつけます。",
        romaji: "Oshiete kurete arigatou gozaimasu! Ki o tsukemasu.",
        indonesianText: "Terima kasih sudah memberi tahu! Saya akan berhati-hati.",
      },
    ],
  },

  // ── 07. Menerima Paket Kurir (N4) ──
  {
    sourceKey: "scenario-07-kurir",
    levelId: 3, // N4
    title: "Menerima Kiriman Paket dari Kurir (Takkyubin)",
    imageUrl: "/images/scenarios/07_Menerima_Paket_dari_Kurir.png",
    location: "Pintu Masuk Apartemen",
    userRole: "Penghuni Apartemen (Siswa)",
    mascotRole: "Kurir Pengantar Paket",
    keigoType: "Teineigo Pekerjaan",
    goal: "Mengonfirmasi identitas penerima paket, menandatangani tanda terima (サイン / 印鑑), dan menerima kiriman paket.",
    initialMessage: "ピンポーン！こんにちは、宅急便です！お荷物のお届けです。",
    targetGrammar: ["〜様のお宅ですか", "サインをお願いします", "ご苦労様です"],
    maxTurns: 10,
    sortOrder: 7,
    status: "published" as const,
    systemPrompt:
      "Anda adalah kurir pengantar paket di Jepang yang sopan, ramah, dan cepat. Konfirmasi nama penerima paket, minta tanda tangan atau cap hanko, dan serahkan paket ke siswa.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "ピンポーン！こんにちは、宅急便です！お荷物のお届けです。",
        romaji: "Pinpoon! Konnichiwa, takkyuubin desu! Onimotsu no otodoke desu.",
        indonesianText: "Ting-tong! Halo, pengantar paket! Ada kiriman paket untuk Anda.",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["はい", "開けます", "どちら様"],
        hintText: "Katakan: はい、今開けます。どちら様ですか？",
        japaneseText: "はい、今開けます。どちら様ですか？",
        romaji: "Hai, ima akemasu. Dochira-sama desu ka?",
        indonesianText: "Ya, saya buka sekarang. Dari siapa ya?",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "クロネコ宅急便です。田中様のお宅でしょうか？こちらにお届け物がございます。",
        romaji: "Kuroneko takkyuubin desu. Tanaka-sama no otaku deshou ka? Kochira ni otodokemono ga gozaimasu.",
        indonesianText: "Dari kurir Kuroneko. Apakah benar kediaman Tanaka-sama? Ini ada barang kiriman untuk Anda.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["はい", "田中です"],
        hintText: "Katakan: はい、田中です。ありがとうございます。",
        japaneseText: "はい、田中です。ありがとうございます。",
        romaji: "Hai, Tanaka desu. Arigatou gozaimasu.",
        indonesianText: "Ya, saya Tanaka. Terima kasih.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "こちらにフルネームでサインか印鑑をお願いできますか？",
        romaji: "Kochira ni furuneemu de sain ka inkan o onegai dekimasu ka?",
        indonesianText: "Bisa tolong tanda tangan dengan nama lengkap atau cap stempel di sini?",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["サインしました", "どうぞ", "ご苦労様"],
        hintText: "Katakan: はい、サインしました。ご苦労様です。(Hai, sain shimashita. Gokurousama desu.)",
        japaneseText: "はい、サインしました。ご苦労様です。",
        romaji: "Hai, sain shimashita. Gokurousama desu.",
        indonesianText: "Ya, sudah saya tanda tangani. Terima kasih atas kerja kerasnya.",
      },
      {
        step: 7,
        speaker: "AI",
        japaneseText: "確認いたしました！お荷物をどうぞ。ありがとうございました！",
        romaji: "Kakunin itashimashita! Onimotsu o douzo. Arigatou gozaimashita!",
        indonesianText: "Sudah saya periksa! Ini paketnya. Terima kasih banyak!",
      },
    ],
  },

  // ── 08. Hari Pertama Arubaito (N4) ──
  {
    sourceKey: "scenario-08-part-time",
    levelId: 3, // N4
    title: "Orientasi Hari Pertama Kerja Part-Time (Arubaito)",
    imageUrl: "/images/scenarios/08_Hari_Pertama_Kerja_Part_time.png",
    location: "Dapur & Area Kasir Restoran Keluarga (Famiresu)",
    userRole: "Karyawan Baru Arubaito",
    mascotRole: "Manajer Restoran (Tenchou)",
    keigoType: "Kenjougo / Teineigo Kerja",
    goal: "Menerima instruksi supervisor restoran, mencatat pesanan, dan memahami alur pelayanan meja.",
    initialMessage: "今日からアルバイト初日ですね！まずは接客の基本を覚えましょう。",
    targetGrammar: ["〜を担当してもらいます", "かしこまりました", "〜ていただけますか"],
    maxTurns: 10,
    sortOrder: 8,
    status: "published" as const,
    systemPrompt:
      "Anda adalah Tenchou (manajer restoran) yang membimbing pekerja baru. Ajarkan salam restoran 'Irasshaimase!', cara mencatat pesanan, dan tegaskan ucapan 'Kashikomarimashita'.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "今日からアルバイト初日ですね！まずは接客の基本を覚えましょう。",
        romaji: "Kyou kara arubaito shonichi desu ne! Mazu wa sekkyaku no kihon o oboemashou.",
        indonesianText: "Hari ini hari pertama kerja paruh waktu ya! Pertama-tama mari pelajari dasar pelayanan pelanggan.",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["よろしくお願いします", "頑張ります", "はい"],
        hintText: "Katakan: はい！一生懸命頑張ります。よろしくお願いします！",
        japaneseText: "はい！一生懸命頑張ります。よろしくお願いします！",
        romaji: "Hai! Isshoukenmei gambarimasu. Yoroshiku onegaishimasu!",
        indonesianText: "Ya! Saya akan berusaha sebaik mungkin. Mohon bimbingannya!",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "いい返事ですね！お客様が席に着いたら、まずお水とおしぼりをお出ししてください。",
        romaji: "Ii henji desu ne! Okyakusama ga seki ni tsuitara, mazu omizu to oshibori o odashi kudasai.",
        indonesianText: "Jawaban yang bagus! Begitu tamu duduk, pertama tolong sajikan air minum dan handuk basah (oshibori).",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["かしこまりました", "お水とおしぼり"],
        hintText: "Katakan: かしこまりました。お水とおしぼりですね。(Kashikomarimashita. Omizu to oshibori desu ne.)",
        japaneseText: "かしこまりました。お水とおしぼりですね。",
        romaji: "Kashikomarimashita. Omizu to oshibori desu ne.",
        indonesianText: "Dimengerti. Menyajikan air dan handuk basah ya.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "注文を取るときは「ご注文はお決まりでしょうか？」と言ってくださいね。",
        romaji: "Chuumon o toru toki wa 'Gochuumon wa okimari deshou ka?' to itte kudasai ne.",
        indonesianText: "Saat mencatat pesanan, tolong katakan 'Gochuumon wa okimari deshou ka?' ya.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["ご注文はお決まりでしょうか", "覚えました"],
        hintText: "Katakan: 「ご注文はお決まりでしょうか？」ですね。覚えました！",
        japaneseText: "「ご注文はお決まりでしょうか？」ですね。覚えました！",
        romaji: "'Gochuumon wa okimari deshou ka?' desu ne. Oboemashita!",
        indonesianText: "'Gochuumon wa okimari deshou ka?' ya. Sudah saya hafal!",
      },
    ],
  },

  // ── 09. Izakaya Teman (N4) ──
  {
    sourceKey: "scenario-09-izakaya",
    levelId: 3, // N4
    title: "Sosialisasi & Toast di Izakaya Bersama Teman",
    imageUrl: "/images/scenarios/09_Nongkrong_di_Izakaya_Bersama_Teman.png",
    location: "Meja Izakaya di Shinjuku",
    userRole: "Teman Nongkrong (Siswa)",
    mascotRole: "Teman Dekat Jepang (Ken-kun)",
    keigoType: "Futsuukei (Kasual Teman)",
    goal: "Memesan minuman pembuka, bersulang Kanpai, dan membagi tagihan pembayaran (Warikan).",
    initialMessage: "お疲れさま！席取れたよ。とりあえず何飲む？",
    targetGrammar: ["〜にしよう", "乾杯！", "割り勘にしよう"],
    maxTurns: 10,
    sortOrder: 9,
    status: "published" as const,
    systemPrompt:
      "Anda adalah teman akrab Jepang (Ken-kun) yang asyik diajak nongkrong di Izakaya. Gunakan bahasa kasual Jepang (Futsuukei). Ajak bersulang 'Kanpai!' dan bahas bagi rata tagihan (Warikan).",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "お疲れさま！席取れたよ。とりあえず何飲む？",
        romaji: "Otsukaresama! Seki toreta yo. Toriaezu nani nomu?",
        indonesianText: "Terima kasih atas kerja keras hari ini! Sudah dapat meja nih. Mau minum apa dulu?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["ビール", "ウーロン茶", "にする", "飲もう"],
        hintText: "Katakan: お疲れさま！私はウーロン茶にする。(Otsukaresama! Watashi wa uuron-cha ni suru.)",
        japaneseText: "お疲れさま！私はウーロン茶にする。",
        romaji: "Otsukaresama! Watashi wa uuron-cha ni suru.",
        indonesianText: "Semangat! Aku mau teh oolong aja deh.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "オッケー！じゃあ店員さん呼ぶね。すみませーん！飲み物来たら乾杯しよう！",
        romaji: "Okkee! Jaa ten'in-san yobu ne. Sumimaseen! Nomimono kitara kanpai shiyou!",
        indonesianText: "Oke! Kalo gitu aku panggil pelayan ya. Permisiii! Nanti begitu minumannya datang kita tos ya!",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["乾杯", "かんぱい"],
        hintText: "Katakan: 来たね！乾杯！(Kita ne! Kanpai!)",
        japaneseText: "来たね！乾杯！",
        romaji: "Kita ne! Kanpai!",
        indonesianText: "Udah datang nih! Bersulaaang!",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "乾杯ー！焼き鳥も頼もうか。お会計は後で割り勘にしようね。",
        romaji: "Kanpaai! Yakitori mo tanomou ka. Okaikei wa ato de warikan ni shiyou ne.",
        indonesianText: "Tos! Pesan sate yakitori juga yuk. Nanti tagihannya kita bagi rata (warikan) ya.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["割り勘", "賛成", "そうしよう"],
        hintText: "Katakan: うん、割り勘でいいね！(Un, warikan de ii ne!)",
        japaneseText: "うん、割り勘でいいね！",
        romaji: "Un, warikan de ii ne!",
        indonesianText: "Sip, bagi rata aja enak!",
      },
    ],
  },

  // ── 10. Klinik Lokal (N4) ──
  {
    sourceKey: "scenario-10-klinik",
    levelId: 3, // N4
    title: "Masuk Angin & Berobat ke Klinik Lokal",
    imageUrl: "/images/scenarios/10_Masuk_Angin_Pergi_ke_Klinik_Lokal.png",
    location: "Ruang Periksa Klinik Pratama",
    userRole: "Pasien Sakit",
    mascotRole: "Dokter Umum (Isha-sensei)",
    keigoType: "Teineigo Medis",
    goal: "Menjelaskan gejala fisik (demam, batuk, pusing), menjawab pertanyaan dokter, dan memahami instruksi minum obat.",
    initialMessage: "フェリーさん、どうぞお入りください。今日はどうされましたか？",
    targetGrammar: ["〜が痛いです", "〜熱があります", "食後に飲んでください"],
    maxTurns: 10,
    sortOrder: 10,
    status: "published" as const,
    systemPrompt:
      "Anda adalah dokter klinik yang perhatian dan profesional. Tanyakan gejala pasien (panas, tenggorokan), periksa sejak kapan gejalanya muncul, dan berikan resep obat yang harus diminum setelah makan (Shokugo).",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "どうぞお入りください。今日はどうされましたか？",
        romaji: "Douzo ohairi kudasai. Kyou wa dou saremashita ka?",
        indonesianText: "Silakan masuk. Hari ini ada keluhan apa?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["熱があります", "喉が痛い", "頭が痛い"],
        hintText: "Katakan: 昨日から熱があって、喉がとても痛いです。(Kinou kara netsu ga atte, nodo ga totemo itai desu.)",
        japaneseText: "昨日から熱があって、喉がとても痛いです。",
        romaji: "Kinou kara netsu ga atte, nodo ga totemo itai desu.",
        indonesianText: "Sejak kemarin saya demam, dan tenggorokan sakit sekali.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "それは辛いですね。熱は何百度くらいありますか？咳も出ますか？",
        romaji: "Sore wa tsurai desu ne. Netsu wa nando kurai arimasu ka? Seki mo demasu ka?",
        indonesianText: "Pasti terasa berat ya. Demamnya sekitar berapa derajat? Apakah batuk juga?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["38度", "咳も出ます", "度"],
        hintText: "Katakan: 38度くらいあります。少し咳も出ます。(Sanjuu-hachido kurai arimasu. Sukoshi seki mo demasu.)",
        japaneseText: "38度くらいあります。少し咳も出ます。",
        romaji: "Sanjuu-hachido kurai arimasu. Sukoshi seki mo demasu.",
        indonesianText: "Sekitar 38 derajat. Ada sedikit batuk juga.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "風邪ですね。3日分の薬を出しますので、毎食後に1錠ずつ飲んで安静にしてください。",
        romaji: "Kaze desu ne. Mikkabun no kusuri o dashimasu node, mai-shokugo ni ichijou-zutsu nonde ansei ni shite kudasai.",
        indonesianText: "Ini masuk angin/flu ya. Saya resepkan obat untuk 3 hari, tolong diminum 1 tablet setiap setelah makan dan istirahatlah yang cukup.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["分かりました", "ありがとうございました"],
        hintText: "Katakan: 分かりました。ありがとうございました。(Wakarimashita. Arigatou gozaimashita.)",
        japaneseText: "分かりました。ありがとうございました。",
        romaji: "Wakarimashita. Arigatou gozaimashita.",
        indonesianText: "Saya mengerti. Terima kasih banyak, Dokter.",
      },
    ],
  },

  // ── 11. Koban Barang Hilang (N4) ──
  {
    sourceKey: "scenario-11-koban",
    levelId: 3, // N4
    title: "Laporan Barang Hilang di Pos Polisi (Koban)",
    imageUrl: "/images/scenarios/11_Melaporkan_Barang_Hilang_di_Koban.png",
    location: "Pos Polisi Lingkungan (Koban) di Tokyo",
    userRole: "Pelapor Kehilangan",
    mascotRole: "Polisi Petugas Jaga (Omwari-san)",
    keigoType: "Formal Kepolisian & Teineigo",
    goal: "Menguraikan ciri barang hilang (dompet hitam berisi kartu zairyu & uang), lokasi terakhir, dan mengisi formulir kehilangan.",
    initialMessage: "こんにちは、交番です。何か落とし物ですか？",
    targetGrammar: ["〜を落としました", "〜の中に〜が入っています", "見つかったら連絡します"],
    maxTurns: 10,
    sortOrder: 11,
    status: "published" as const,
    systemPrompt:
      "Anda adalah polisi di Koban yang ramah namun disiplin. Tanyakan apa barang yang hilang (dompet), warna, isi di dalamnya, dan lokasi terakhir sebelum membuat surat laporan kehilangan.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "こんにちは、交番です。何か落とし物ですか？",
        romaji: "Konnichiwa, kouban desu. Nani ka otoshimono desu ka?",
        indonesianText: "Halo, pos polisi. Apakah ada barang yang hilang atau terjatuh?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["財布を落としました", "財布", "落としました"],
        hintText: "Katakan: すみません、財布を落としてしまいました。(Sumimasen, saifu o otoshite shimaimashita.)",
        japaneseText: "すみません、財布を落としてしまいました。",
        romaji: "Sumimasen, saifu o otoshite shimaimashita.",
        indonesianText: "Permisi, dompet saya terjatuh/hilang.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "どんな財布ですか？色や形、中に入っていたものを教えてください。",
        romaji: "Donna saifu desu ka? Iro ya katachi, naka ni haitte ita mono o oshiete kudasai.",
        indonesianText: "Dompet yang seperti apa? Tolong sebutkan warna, bentuk, dan isi di dalamnya.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["黒い財布", "在留カード", "現金"],
        hintText: "Katakan: 黒い革の財布で、在留カードと現金が少し入っています。(Kuroi kawa no saifu de, zairyuu kaado to genkin ga sukoshi haitte imasu.)",
        japaneseText: "黒い革の財布で、在留カードと現金が少し入っています。",
        romaji: "Kuroi kawa no saifu de, zairyuu kaado to genkin ga sukoshi haitte imasu.",
        indonesianText: "Dompet kulit warna hitam, di dalamnya ada kartu izin tinggal (zairyu card) dan sedikit uang tunai.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "分かりました。遺失物届を作りますので、お名前と電話番号をこちらに書いてください。",
        romaji: "Wakarimashita. Ishitsubutsu-todoke o tsukurimasu node, onamae to denwa bangou o kochira ni kaite kudasai.",
        indonesianText: "Baik. Kami buatkan laporan barang hilang, tolong tuliskan nama dan nomor telepon Anda di sini.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["書きました", "よろしくお願いします"],
        hintText: "Katakan: はい、書きました。見つかったら連絡をお願いします。(Hai, kakimashita. Mitsukattara renraku o onegaishimasu.)",
        japaneseText: "はい、書きました。見つかったら連絡をお願いします。",
        romaji: "Hai, kakimashita. Mitsukattara renraku o onegaishimasu.",
        indonesianText: "Ya, sudah saya tulis. Tolong hubungi saya bila sudah ditemukan.",
      },
    ],
  },

  // ── 12. Salon Potong Rambut (N3) ──
  {
    sourceKey: "scenario-12-salon",
    levelId: 4, // N3
    title: "Konsultasi Potong Rambut di Salon Jepang",
    imageUrl: "/images/scenarios/12_Potong_Rambut_di_Salon_Jepang.png",
    location: "Kursi Pelanggan Salon di Harajuku",
    userRole: "Pelanggan Salon",
    mascotRole: "Hairstylist Salon (Biyoushi)",
    keigoType: "Sonkeigo (Stylist) & Teineigo",
    goal: "Mengomunikasikan model rambut yang diinginkan, tingkat kepanjangan (potong 2cm), dan merespons pertanyaan saat keramas.",
    initialMessage: "いらっしゃいませ！本日担当するサクラです。今日はどんなスタイルにいたしましょうか？",
    targetGrammar: ["〜くらい切ってください", "前髪は〜", "熱くないですか"],
    maxTurns: 10,
    sortOrder: 12,
    status: "published" as const,
    systemPrompt:
      "Anda adalah penata rambut (Hairstylist) di salon Tokyo yang modis dan ramah. Dengarkan permintaan model rambut pelanggan, tanyakan panjang yang ingin dipotong, dan tanyakan suhu air saat keramas ('お湯加減はいかがですか？').",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "いらっしゃいませ！本日担当するサクラです。今日はどんなスタイルにいたしましょうか？",
        romaji: "Irasshaimase! Honjitsu tantou suru Sakura desu. Kyou wa donna sutairu ni itashimashou ka?",
        indonesianText: "Selamat datang! Saya Sakura yang akan menangani Anda hari ini. Hari ini ingin model rambut seperti apa?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["全体的に", "2センチくらい切って", "すいてください"],
        hintText: "Katakan: 全体的に2センチくらい切って、少し軽くしてください。(Zentaiteki ni ni-senchi kurai kitte, sukoshi karuku shite kudasai.)",
        japaneseText: "全体的に2センチくらい切って、少し軽くしてください。",
        romaji: "Zentaiteki ni ni-senchi kurai kitte, sukoshi karuku shite kudasai.",
        indonesianText: "Tolong potong sekitar 2 cm secara keseluruhan, dan tolong ditipiskan sedikit.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "かしこまりました。前髪の長さはいかがなさいますか？目にかからないくらいがよろしいですか？",
        romaji: "Kashikomarimashita. Maegami no nagasa wa ikaga nasaimasu ka? Me ni kakaranai kurai ga yoroshii desu ka?",
        indonesianText: "Baik. Untuk poni depannya bagaimana? Apakah pas di atas alis agar tidak mengenai mata?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["目にかからない", "お願いします"],
        hintText: "Katakan: はい、眉毛の下あたりで、目にかからないようにお願いします。",
        japaneseText: "はい、眉毛の下あたりで、目にかからないようにお願いします。",
        romaji: "Hai, mayuge no shita atari de, me ni kakaranai you ni onegaishimasu.",
        indonesianText: "Ya, sekitar di bawah alis dan tidak menutupi mata ya.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "承知いたしました。ではシャンプー台へご案内します。...お湯加減はいかがですか？熱くないですか？",
        romaji: "Shouchi itashimashita. Dewa shanpuu-dai e goannai shimasu. ...Oyukagen wa ikaga desu ka? Atsukunai desu ka?",
        indonesianText: "Baik, dimengerti. Mari ke tempat keramas dulu. ...Bagaimana suhu airnya? Apakah terlalu panas?",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["ちょうどいいです", "大丈夫です"],
        hintText: "Katakan: ちょうどいい温度です。大丈夫です。(Choudo ii ondo desu. Daijoubu desu.)",
        japaneseText: "ちょうどいい温度です。大丈夫です。",
        romaji: "Choudo ii ondo desu. Daijoubu desu.",
        indonesianText: "Suhunya pas sekali. Tidak apa-apa.",
      },
    ],
  },

  // ── 13. Anime & Pop Culture Akihabara (N3) ──
  {
    sourceKey: "scenario-13-akihabara",
    levelId: 4, // N3
    title: "Diskusi Hobi Pop Culture di Akihabara",
    imageUrl: "/images/scenarios/13_Nonton_Anime_dan_Bahas_Hobi_di_Akihabara.png",
    location: "Kawasan Toko Merchandise Anime di Akihabara",
    userRole: "Penggemar Anime (Siswa)",
    mascotRole: "Teman Wibu / Otaku Jepang (Daisuke)",
    keigoType: "Futsuukei Kasual & Slang Hobi",
    goal: "Menceritakan anime favorit musim ini, berdiskusi tentang merchandise karakter, dan merekomendasikan toko figure.",
    initialMessage: "秋葉原着いたね！まずどのアニメイトかラジオ会館行く？今期何のアニメ観てる？",
    targetGrammar: ["〜にハマっている", "〜推し", "〜のが一番面白い"],
    maxTurns: 10,
    sortOrder: 13,
    status: "published" as const,
    systemPrompt:
      "Anda adalah Daisuke, teman otaku anime di Akihabara yang antusias. Gunakan bahasa kasual Jepang sehari-hari (Futsuukei). Diskusikan anime favorit, tanyakan siapa karakter favorit (Oshi), dan pandu mencari figure anime.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "秋葉原着いたね！まずどのアニメイトかラジオ会館行く？今期何のアニメ観てる？",
        romaji: "Akihabara tsuita ne! Mazu dono Animeito ka Rajio Kaikan iku? Konki nani no anime miteru?",
        indonesianText: "Sampai juga di Akihabara! Mau ke Animate dulu atau ke Radio Kaikan? Musim ini kamu lagi nonton anime apa?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["観てる", "ハマってる", "アニメ"],
        hintText: "Katakan: 今はフリーレンと呪術廻戦にすごくハマってるよ！(Ima wa Furiiren to Jujutsu Kaisen ni sugoku hamatteru yo!)",
        japaneseText: "今はフリーレンと呪術廻戦にすごくハマってるよ！",
        romaji: "Ima wa Furiiren to Jujutsu Kaisen ni sugoku hamatteru yo!",
        indonesianText: "Sekarang aku lagi gandrung banget sama Frieren dan Jujutsu Kaisen!",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "おお、フリーレン最高だよね！作画もストーリーも神がかってる。誰推し？",
        romaji: "Oo, Furiiren saikou da yo ne! Sakuga mo sutoorii mo kamigakatteru. Dare oshi?",
        indonesianText: "Wih, Frieren emang keren banget ya! Animasinya maupun ceritanya dewa banget. Karakter favoritmu (oshi) siapa?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["推し", "フェルン", "好き"],
        hintText: "Katakan: 私はフェルン推し！あそこでおすすめのフィギュアあるかな？",
        japaneseText: "私はフェルン推し！あそこでおすすめのフィギュアあるかな？",
        romaji: "Watashi wa Ferun oshi! Asoko de osusume no figyua aru ka na?",
        indonesianText: "Aku oshi Fern! Kira-kira di sana ada figure rekomendasi nggak ya?",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "ラジオ会館の4階にフェルンの新作フィギュアあったよ！見に行こうぜ！",
        romaji: "Rajio Kaikan no yonkai ni Ferun no shinsaku figyua atta yo! Mi ni ikou ze!",
        indonesianText: "Di lantai 4 Radio Kaikan ada figure terbarunya Fern lho! Yuk langsung ke sana liat!",
      },
    ],
  },

  // ── 14. Menolak Ajakan Halus (N3) ──
  {
    sourceKey: "scenario-14-penolakan",
    levelId: 4, // N3
    title: "Menolak Ajakan dengan Halus (Etika Nuansa Jepang)",
    imageUrl: "/images/scenarios/14_Menolak_Ajakan_dengan_Halus.png",
    location: "Koridor Kampus / Kantor Tokyo",
    userRole: "Teman Sejawat / Siswa",
    mascotRole: "Teman Mengajak (Yuki-san)",
    keigoType: "Futsuukei & Ungkapan Tersirat (Kuuki o Yomu)",
    goal: "Menolak ajakan pergi nonton atau makan malam secara tidak langsung menggunakan ungkapan 'Chotto...' dan alasan halus tanpa menyakiti perasaan.",
    initialMessage: "今週の土曜日、渋谷で新しい映画観に行かない？その後ご飯でもどう？",
    targetGrammar: ["土曜日はちょっと...", "予定があって", "また誘ってね"],
    maxTurns: 10,
    sortOrder: 14,
    status: "published" as const,
    systemPrompt:
      "Anda adalah teman Jepang (Yuki-san) yang mengajak jalan-jalan di hari Sabtu. Pahami etika penolakan halus Jepang saat siswa merespons dengan kata 'Chotto...' atau alasan ujian/tugas, dan tanggapi dengan santai serta pengertian ('Mata kondo ne!').",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "今週の土曜日、渋谷で新しい映画観に行かない？その後ご飯でもどう？",
        romaji: "Konshuu no doyoubi, Shibuya de atarashii eiga mi ni ikanai? Sono ato gohan demo dou?",
        indonesianText: "Sabtu minggu ini mau nonton film baru di Shibuya bareng nggak? Terus abis itu makan malam bareng gimana?",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["土曜日はちょっと", "予定があって", "ごめんね"],
        hintText: "Katakan: せっかく誘ってくれたのにごめんね。土曜日はちょっと予定があって...(Sekkaku sasotte kureta noni gomen ne. Doyoubi wa chotto yotei ga atte...)",
        japaneseText: "せっかく誘ってくれたのにごめんね。土曜日はちょっと先約があって...",
        romaji: "Sekkaku sasotte kureta noni gomen ne. Doyoubi wa chotto sen'yaku ga atte...",
        indonesianText: "Maaf ya padahal udah diajak. Hari Sabtu itu agak... ada janji lain sebelumnya...",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "あ、そうなんだ！全然気にしないで。用事があるなら仕方ないよ。",
        romaji: "A, sou nan da! Zenzen ki ni shinaide. Youji ga aru nara shikatanai yo.",
        indonesianText: "Oh, begitu ya! Santai aja nggak usah dipikirin. Kalo lagi ada keperluan ya nggak apa-apa kok.",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["また今度", "誘ってね", "ありがとう"],
        hintText: "Katakan: ありがとう！また今度ぜひ誘ってね。(Arigatou! Mata kondo zehi sasotte ne.)",
        japaneseText: "ありがとう！また今度ぜひ誘ってね。",
        romaji: "Arigatou! Mata kondo zehi sasotte ne.",
        indonesianText: "Makasih ya! Lain kali ajak aku lagi ya.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "うん！来月あたり落ち着いたらまた声かけるね。楽しみにしてるよ！",
        romaji: "Un! Raigetsu atari ochitsuitara mata koe kakeru ne. Tanoshimi ni shiteru yo!",
        indonesianText: "Sip! Bulan depan kalo urusanmu udah selesai nanti aku kabari lagi ya!",
      },
    ],
  },

  // ── 15. Wawancara Kerja Formal (N2) ──
  {
    sourceKey: "scenario-15-wawancara",
    levelId: 5, // N2
    title: "Wawancara Kerja Formal di Perusahaan Jepang",
    imageUrl: "/images/scenarios/15_Wawancara_Kerja_di_Perusahaan_Jepang.png",
    location: "Ruang Wawancara Direksi di Chiyoda, Tokyo",
    userRole: "Pelamar Kerja (Shuukatsusei)",
    mascotRole: "Pewawancara Utama (Mensetsukan)",
    keigoType: "Sonkeigo & Kenjougo Bisnis Tingkat Tinggi",
    goal: "Menyampaikan salam masuk ruang wawancara (Shitsurei itashimasu), perkenalan diri formal (Jikopr), dan menjelaskan alasan melamar (Shibou Douki).",
    initialMessage: "どうぞお入りください。お掛けになってください。",
    targetGrammar: ["失礼いたします", "〜と申します", "志望いたしました"],
    maxTurns: 12,
    sortOrder: 15,
    status: "published" as const,
    systemPrompt:
      "Anda adalah pewawancara senior di perusahaan teknologi Jepang. Gunakan bahasa bisnis Sonkeigo/Kenjougo yang sangat formal. Tanyakan perkenalan diri pelamar dan alasan melamar perusahaan (志望動機). Evaluasi kesantunan dan logika jawaban pelamar.",
    dialogueScript: [
      {
        step: 1,
        speaker: "AI",
        japaneseText: "どうぞお入りください。お掛けになってください。",
        romaji: "Douzo ohairi kudasai. Okake ni natte kudasai.",
        indonesianText: "Silakan masuk. Silakan duduk.",
      },
      {
        step: 2,
        speaker: "USER",
        expectedKeyPhrases: ["失礼いたします", "田中と申します"],
        hintText: "Katakan: 失礼いたします。本日面接の機会をいただき、誠にありがとうございます。田中と申します。",
        japaneseText: "失礼いたします。本日面接の機会をいただき、誠にありがとうございます。田中と申します。",
        romaji: "Shitsurei itashimasu. Honjitsu mensetsu no kikai o itadaki, makoto ni arigatou gozaimasu. Tanaka to moushimasu.",
        indonesianText: "Permisi. Terima kasih yang sebesar-besarnya telah memberi kesempatan wawancara hari ini. Saya Tanaka.",
      },
      {
        step: 3,
        speaker: "AI",
        japaneseText: "ではまず、簡単に自己紹介と、弊社を志望された動機をお聞かせいただけますか？",
        romaji: "Dewa mazu, kantan ni jikoshoukai to, heisha o shibou sareta douki o okikase itadakemasu ka?",
        indonesianText: "Baik, pertama-tama, bisakah Anda ceritakan perkenalan diri singkat dan motivasi melamar ke perusahaan kami?",
      },
      {
        step: 4,
        speaker: "USER",
        expectedKeyPhrases: ["貴社", "志望いたしました", "貢献したい"],
        hintText: "Katakan: 貴社の革新的なAI技術に強く感銘を受け、私の技術力を活かしてグローバル事業の発展に貢献したいと考え、志望いたしました。",
        japaneseText: "貴社の革新的なAI技術に強く感銘を受け、私の技術力を活かしてグローバル事業の発展に貢献したいと考え、志望いたしました。",
        romaji: "Kisha no kakushinteki na AI gijutsu ni tsuyoku kanmei o uke, watashi no gijutsuryoku o ikashite guroobaru jigyou no hatten ni kouken shitai to kangae, shibou itashimashita.",
        indonesianText: "Saya sangat terkesan dengan teknologi AI inovatif dari perusahaan Anda (Kisha), dan saya melamar karena ingin berkontribusi pada perkembangan bisnis global dengan memanfaatkan keahlian teknis saya.",
      },
      {
        step: 5,
        speaker: "AI",
        japaneseText: "なるほど。面接の結果は1週間以内にメールにてご連絡いたします。",
        romaji: "Naruhodo. Mensetsu no kekka wa isshuukan inai ni meeru ni te gorenraku itashimasu.",
        indonesianText: "Saya mengerti. Hasil wawancara akan kami kabarkan via email dalam jangka waktu satu minggu.",
      },
      {
        step: 6,
        speaker: "USER",
        expectedKeyPhrases: ["かしこまりました", "ありがとうございました", "お時間をいただき"],
        hintText: "Katakan: かしこまりました。本日はお時間をいただき、誠にありがとうございました。",
        japaneseText: "かしこまりました。本日はお時間をいただき、誠にありがとうございました。",
        romaji: "Kashikomarimashita. Honjitsu wa ojikan o itadaki, makoto ni arigatou gozaimashita.",
        indonesianText: "Dimengerti. Terima kasih banyak atas waktu yang telah diberikan hari ini.",
      },
    ],
  },
];

async function main() {
  console.log("=== SINKRONISASI SKENARIO SESUAI GAMBAR ===");

  // 1. Dapatkan daftar sourceKey dan gambar valid
  const validKeys = ALL_15_SCENARIOS.map((s) => s.sourceKey);
  const validImages = ALL_15_SCENARIOS.map((s) => s.imageUrl);

  console.log(`Jumlah skenario gambar valid: ${validKeys.length}`);

  // 2. Putuskan relasi riwayat chat ke skenario yang akan dihapus agar tidak melanggar foreign key
  const invalidScenarios = await prisma.scenario.findMany({
    where: {
      OR: [
        { imageUrl: null },
        { imageUrl: "" },
        { sourceKey: { notIn: validKeys } },
      ],
    },
    select: { id: true, title: true, imageUrl: true },
  });

  const invalidIds = invalidScenarios.map((s) => s.id);
  console.log(`Ditemukan ${invalidIds.length} skenario tanpa gambar / tidak sesuai.`);

  if (invalidIds.length > 0) {
    const detachedSessions = await prisma.conversationSession.updateMany({
      where: { scenarioId: { in: invalidIds } },
      data: { scenarioId: null },
    });
    console.log(`Memutuskan relasi scenarioId pada ${detachedSessions.count} riwayat chat.`);

    const deleted = await prisma.scenario.deleteMany({
      where: { id: { in: invalidIds } },
    });
    console.log(`Berhasil menghapus ${deleted.count} skenario tanpa gambar dari basis data.`);
  }

  // 3. Upsert 15 skenario berbasis gambar situasi nyata
  const admin = await prisma.user.findFirst({
    where: { role: { in: ["admin", "super_admin"] } },
  });

  for (const s of ALL_15_SCENARIOS) {
    const existing = await prisma.scenario.findUnique({
      where: { sourceKey: s.sourceKey },
    });

    const data = {
      levelId: s.levelId,
      title: s.title,
      goal: s.goal,
      mascotRole: s.mascotRole,
      userRole: s.userRole,
      location: s.location,
      keigoType: s.keigoType,
      imageUrl: s.imageUrl,
      initialMessage: s.initialMessage,
      targetGrammar: s.targetGrammar,
      maxTurns: s.maxTurns,
      sortOrder: s.sortOrder,
      status: s.status,
      systemPrompt: s.systemPrompt,
      dialogueScript: s.dialogueScript,
      createdById: admin?.id,
    };

    if (existing) {
      await prisma.scenario.update({
        where: { id: existing.id },
        data,
      });
      console.log(`[UPDATED] ${s.sourceKey} -> ${s.title}`);
    } else {
      await prisma.scenario.create({
        data: {
          sourceKey: s.sourceKey,
          ...data,
        },
      });
      console.log(`[CREATED] ${s.sourceKey} -> ${s.title}`);
    }
  }

  // 4. Verifikasi jumlah akhir skenario di database
  const finalScenarios = await prisma.scenario.findMany({
    select: { id: true, sourceKey: true, title: true, imageUrl: true, level: { select: { code: true } } },
    orderBy: { sortOrder: "asc" },
  });

  console.log("\n=== DAFTAR SKENARIO AKTIF AKHIR ===");
  finalScenarios.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.level.code}] ${s.title} -> ${s.imageUrl}`);
  });
  console.log(`\nTotal skenario di basis data sekarang: ${finalScenarios.length} (Semua memiliki gambar resmi)`);
}

main()
  .catch((e) => {
    console.error("Gagal sinkronisasi skenario:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

