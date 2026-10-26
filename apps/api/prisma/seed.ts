/**
 * Data awal: level, aturan AI per level (dokumen 2, tabel adaptasi), maskot,
 * satu bab N5 contoh, satu skenario, lencana, dan akun Admin untuk development.
 * Jalankan: npm run db:seed
 */
import { PrismaClient, type FuriganaRule } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const levels = [
  { id: 1, code: "PEMULA", name: "Pemula Total", sortOrder: 1, isPremium: false },
  { id: 2, code: "N5", name: "JLPT N5", sortOrder: 2, isPremium: false },
  { id: 3, code: "N4", name: "JLPT N4", sortOrder: 3, isPremium: false },
  { id: 4, code: "N3", name: "JLPT N3", sortOrder: 4, isPremium: true },
  { id: 5, code: "N2", name: "JLPT N2", sortOrder: 5, isPremium: true },
  { id: 6, code: "N1", name: "JLPT N1", sortOrder: 6, isPremium: true },
];

const prompts: { levelId: number; systemPrompt: string; maxSentenceWords: number; furiganaRule: FuriganaRule; speechRate: number }[] = [
  { levelId: 1, systemPrompt: "Pakai kosakata sangat dasar, kalimat 3–5 kata, bentuk です/ます.", maxSentenceWords: 5, furiganaRule: "full", speechRate: 0.7 },
  { levelId: 2, systemPrompt: "Pakai kosakata dan pola tata bahasa N5 saja, bentuk sopan です/ます.", maxSentenceWords: 8, furiganaRule: "full", speechRate: 0.8 },
  { levelId: 3, systemPrompt: "Pakai kosakata N5–N4. Boleh bentuk kasual sederhana jika pengguna memakainya.", maxSentenceWords: 12, furiganaRule: "full", speechRate: 0.9 },
  { levelId: 4, systemPrompt: "Pakai kosakata sampai N3, campuran sopan dan kasual.", maxSentenceWords: 18, furiganaRule: "hard_only", speechRate: 1.0 },
  { levelId: 5, systemPrompt: "Bahasa alami tingkat N2, termasuk keigo dasar dan topik abstrak.", maxSentenceWords: 25, furiganaRule: "none", speechRate: 1.0 },
  { levelId: 6, systemPrompt: "Bahasa alami seperti penutur asli, termasuk keigo dan ungkapan idiomatis.", maxSentenceWords: 40, furiganaRule: "none", speechRate: 1.0 },
];

async function main() {
  for (const l of levels) await db.level.upsert({ where: { id: l.id }, create: l, update: l });
  for (const p of prompts) await db.aiLevelPrompt.upsert({ where: { levelId: p.levelId }, create: p, update: p });

  if (!(await db.mascot.findFirst())) {
    await db.mascot.create({
      data: { name: "Neko-sensei", personality: "kucing ramah dan sabar, suka memuji usaha kecil, sesekali menambahkan 'にゃ' di akhir kalimat" },
    });
  }

  const superAdmin = await db.user.upsert({
    where: { email: "superadmin@nihongo.local" },
    create: {
      email: "superadmin@nihongo.local",
      passwordHash: await bcrypt.hash("SuperAdmin12345", 12),
      displayName: "Super Admin",
      role: "super_admin",
      currentLevelId: 6,
      emailVerifiedAt: new Date(),
    },
    update: { role: "super_admin" },
  });

  const admin = await db.user.upsert({
    where: { email: "admin@nihongo.local" },
    create: {
      email: "admin@nihongo.local",
      passwordHash: await bcrypt.hash("Admin12345", 12),
      displayName: "Admin",
      role: "admin",
      currentLevelId: 6,
      emailVerifiedAt: new Date(),
    },
    update: {},
  });

  // ── 25 Bab N5 (idempotent per judul) ──
  const n5Chapters = [
    {
      title: "あいさつ — Salam Sehari-hari",
      explanation: "Pelajari salam dan ungkapan dasar yang digunakan setiap hari dalam bahasa Jepang.",
      sortOrder: 1,
      vocab: [
        { word: "おはようございます", reading: "おはようございます", meaningId: "selamat pagi (formal)", exampleSentence: "おはようございます！今日もいい天気ですね。" },
        { word: "こんにちは", reading: "こんにちは", meaningId: "selamat siang/halo", exampleSentence: "こんにちは、田中さん！" },
        { word: "こんばんは", reading: "こんばんは", meaningId: "selamat malam", exampleSentence: "こんばんは。今日はお疲れ様でした。" },
        { word: "さようなら", reading: "さようなら", meaningId: "selamat tinggal", exampleSentence: "さようなら、またね！" },
        { word: "ありがとうございます", reading: "ありがとうございます", meaningId: "terima kasih (formal)", exampleSentence: "助けてくれて、ありがとうございます。" },
        { word: "すみません", reading: "すみません", meaningId: "permisi / maaf", exampleSentence: "すみません、駅はどこですか？" },
        { word: "はじめまして", reading: "はじめまして", meaningId: "salam perkenalan (pertama kali bertemu)", exampleSentence: "はじめまして、アンディです。" },
        { word: "よろしくおねがいします", reading: "よろしくおねがいします", meaningId: "mohon bantuannya", exampleSentence: "よろしくおねがいします！" },
        { word: "おやすみなさい", reading: "おやすみなさい", meaningId: "selamat tidur", exampleSentence: "おやすみなさい、また明日！" },
        { word: "いただきます", reading: "いただきます", meaningId: "ucapan sebelum makan", exampleSentence: "いただきます！" },
      ],
      kanji: [
        { character: "日", onyomi: "ニチ・ジツ", kunyomi: "ひ・か", meaningId: "hari, matahari" },
        { character: "月", onyomi: "ゲツ・ガツ", kunyomi: "つき", meaningId: "bulan" },
        { character: "年", onyomi: "ネン", kunyomi: "とし", meaningId: "tahun" },
        { character: "人", onyomi: "ジン・ニン", kunyomi: "ひと", meaningId: "orang" },
      ],
      grammar: [
        { pattern: "～は～です", explanation: "Menyatakan 'A adalah B'. Partikel は dibaca 'wa'.", exampleSentence: "わたしは学生です。" },
        { pattern: "～ですか", explanation: "Membuat kalimat tanya dari kalimat pernyataan.", exampleSentence: "あなたは学生ですか？" },
      ],
      quiz: [
        { question: "「おはようございます」はいつ使いますか？", options: ["Pagi hari", "Siang hari", "Malam hari", "Tengah malam"], correctAnswer: "Pagi hari" },
        { question: "Ucapan sebelum makan adalah…", options: ["ごちそうさま", "いただきます", "おやすみ", "ただいま"], correctAnswer: "いただきます" },
        { question: "「すみません」の意味は？", options: ["Terima kasih", "Selamat malam", "Permisi/Maaf", "Sampai jumpa"], correctAnswer: "Permisi/Maaf" },
      ],
    },
    {
      title: "じこしょうかい — Perkenalan Diri",
      explanation: "Belajar memperkenalkan diri: nama, asal negara, pekerjaan, dan hobi.",
      sortOrder: 2,
      vocab: [
        { word: "わたし", reading: "わたし", meaningId: "saya", exampleSentence: "わたしはアンディです。" },
        { word: "なまえ", reading: "なまえ", meaningId: "nama", exampleSentence: "おなまえはなんですか？" },
        { word: "がくせい", reading: "がくせい", meaningId: "pelajar/mahasiswa", exampleSentence: "わたしは大学生です。" },
        { word: "せんせい", reading: "せんせい", meaningId: "guru/sensei", exampleSentence: "田中さんは日本語の先生です。" },
        { word: "かいしゃいん", reading: "かいしゃいん", meaningId: "karyawan perusahaan", exampleSentence: "ちちは会社員です。" },
        { word: "にほんご", reading: "にほんご", meaningId: "bahasa Jepang", exampleSentence: "日本語を勉強しています。" },
        { word: "すき", reading: "すき", meaningId: "suka", exampleSentence: "わたしはアニメがすきです。" },
        { word: "どうぞよろしく", reading: "どうぞよろしく", meaningId: "senang berkenalan", exampleSentence: "どうぞよろしくおねがいします。" },
        { word: "なんさい", reading: "なんさい", meaningId: "berapa umur", exampleSentence: "なんさいですか？" },
        { word: "〜さい", reading: "〜さい", meaningId: "usia (tahun)", exampleSentence: "わたしは二十歳です。" },
      ],
      kanji: [
        { character: "本", onyomi: "ホン", kunyomi: "もと", meaningId: "buku, asal" },
        { character: "国", onyomi: "コク", kunyomi: "くに", meaningId: "negara" },
        { character: "語", onyomi: "ゴ", kunyomi: "かた(る)", meaningId: "bahasa, cerita" },
        { character: "名", onyomi: "メイ・ミョウ", kunyomi: "な", meaningId: "nama" },
      ],
      grammar: [
        { pattern: "～から来ました", explanation: "Mengatakan asal dari mana. 'Saya berasal dari ~'.", exampleSentence: "インドネシアから来ました。" },
        { pattern: "～を勉強しています", explanation: "Menyatakan sedang mempelajari sesuatu.", exampleSentence: "日本語を勉強しています。" },
      ],
      quiz: [
        { question: "「がくせい」の意味は？", options: ["Guru", "Pelajar", "Dokter", "Karyawan"], correctAnswer: "Pelajar" },
        { question: "Cara mengatakan 'saya berasal dari Indonesia':", options: ["インドネシアに来ました", "インドネシアで来ました", "インドネシアから来ました", "インドネシアを来ました"], correctAnswer: "インドネシアから来ました" },
        { question: "「にほんご」を漢字で書くと？", options: ["日本後", "日本語", "日本五", "二本語"], correctAnswer: "日本語" },
      ],
    },
    {
      title: "すうじ① — Angka 1 sampai 100",
      explanation: "Pelajari cara membaca dan menulis angka dalam bahasa Jepang dari 1 hingga 100.",
      sortOrder: 3,
      vocab: [
        { word: "いち", reading: "いち", meaningId: "satu (1)", exampleSentence: "いち、に、さん！" },
        { word: "に", reading: "に", meaningId: "dua (2)", exampleSentence: "にほんは二つの島ではありません。" },
        { word: "さん", reading: "さん", meaningId: "tiga (3)", exampleSentence: "さんびきのこぶた。" },
        { word: "し・よん", reading: "し・よん", meaningId: "empat (4)", exampleSentence: "よんじかんかかります。" },
        { word: "ご", reading: "ご", meaningId: "lima (5)", exampleSentence: "ごにんかぞくです。" },
        { word: "ろく", reading: "ろく", meaningId: "enam (6)", exampleSentence: "ろっぽんのえんぴつ。" },
        { word: "しち・なな", reading: "しち・なな", meaningId: "tujuh (7)", exampleSentence: "ならびましょう、なな！" },
        { word: "はち", reading: "はち", meaningId: "delapan (8)", exampleSentence: "はちじにおきます。" },
        { word: "きゅう・く", reading: "きゅう・く", meaningId: "sembilan (9)", exampleSentence: "きゅうじかんねました。" },
        { word: "じゅう", reading: "じゅう", meaningId: "sepuluh (10)", exampleSentence: "じゅうえんです。" },
      ],
      kanji: [
        { character: "一", onyomi: "イチ", kunyomi: "ひと(つ)", meaningId: "satu" },
        { character: "二", onyomi: "ニ", kunyomi: "ふた(つ)", meaningId: "dua" },
        { character: "三", onyomi: "サン", kunyomi: "みっ(つ)", meaningId: "tiga" },
        { character: "四", onyomi: "シ", kunyomi: "よ(っつ)", meaningId: "empat" },
      ],
      grammar: [
        { pattern: "〜枚 / 〜本 / 〜冊", explanation: "Kata bantu bilangan untuk menghitung benda. 枚=lembar, 本=benda panjang, 冊=buku.", exampleSentence: "かみを三枚ください。" },
        { pattern: "なんですか", explanation: "Menanyakan jumlah: 'berapa...'", exampleSentence: "なんまいですか？" },
      ],
      quiz: [
        { question: "「六」はなんと読みますか？", options: ["ご", "ろく", "なな", "はち"], correctAnswer: "ろく" },
        { question: "8 + 2 = ?", options: ["じゅういち", "じゅう", "きゅう", "じゅうに"], correctAnswer: "じゅう" },
        { question: "「じゅうご」は漢字で？", options: ["十四", "十六", "十五", "十七"], correctAnswer: "十五" },
      ],
    },
    {
      title: "すうじ② — Angka Besar & Harga",
      explanation: "Pelajari angka ratusan, ribuan, dan cara menanyakan harga barang.",
      sortOrder: 4,
      vocab: [
        { word: "ひゃく", reading: "ひゃく", meaningId: "seratus (100)", exampleSentence: "ひゃくえんです。" },
        { word: "せん", reading: "せん", meaningId: "seribu (1000)", exampleSentence: "せんえんさつ。" },
        { word: "まん", reading: "まん", meaningId: "sepuluh ribu (10.000)", exampleSentence: "いちまんえんです。" },
        { word: "えん", reading: "えん", meaningId: "yen (mata uang Jepang)", exampleSentence: "このほんは五百円です。" },
        { word: "いくら", reading: "いくら", meaningId: "berapa harganya", exampleSentence: "これはいくらですか？" },
        { word: "やすい", reading: "やすい", meaningId: "murah", exampleSentence: "このお店はやすいですね。" },
        { word: "たかい", reading: "たかい", meaningId: "mahal / tinggi", exampleSentence: "このかばんはたかいです。" },
        { word: "おつり", reading: "おつり", meaningId: "kembalian", exampleSentence: "おつりをください。" },
        { word: "〜をください", reading: "〜をください", meaningId: "tolong berikan ~", exampleSentence: "みずをください。" },
        { word: "ちょうど", reading: "ちょうど", meaningId: "pas / tepat", exampleSentence: "ちょうど千円です。" },
      ],
      kanji: [
        { character: "五", onyomi: "ゴ", kunyomi: "いつ(つ)", meaningId: "lima" },
        { character: "六", onyomi: "ロク", kunyomi: "む(っつ)", meaningId: "enam" },
        { character: "七", onyomi: "シチ", kunyomi: "なな(つ)", meaningId: "tujuh" },
        { character: "八", onyomi: "ハチ", kunyomi: "やっ(つ)", meaningId: "delapan" },
      ],
      grammar: [
        { pattern: "〜はいくらですか", explanation: "Menanyakan harga: '~ berapa harganya?'", exampleSentence: "このりんごはいくらですか？" },
        { pattern: "〜をください", explanation: "Meminta sesuatu: 'Tolong berikan ~'.", exampleSentence: "コーヒーをください。" },
      ],
      quiz: [
        { question: "「三百円」はいくらですか？", options: ["30 yen", "300 yen", "3000 yen", "130 yen"], correctAnswer: "300 yen" },
        { question: "「いくら」の意味は？", options: ["Di mana", "Berapa harganya", "Apa ini", "Siapa"], correctAnswer: "Berapa harganya" },
        { question: "「やすい」の反対は？", options: ["ちいさい", "たかい", "おおきい", "ひろい"], correctAnswer: "たかい" },
      ],
    },
    {
      title: "じかん — Waktu & Jam",
      explanation: "Pelajari cara membaca jam dan menanyakan waktu dalam bahasa Jepang.",
      sortOrder: 5,
      vocab: [
        { word: "いま", reading: "いま", meaningId: "sekarang", exampleSentence: "いまなんじですか？" },
        { word: "〜じ", reading: "〜じ", meaningId: "jam ~ (menunjukkan jam)", exampleSentence: "さんじです。" },
        { word: "〜ふん / 〜ぷん", reading: "〜ふん/〜ぷん", meaningId: "menit ~", exampleSentence: "じゅうごふんです。" },
        { word: "はん", reading: "はん", meaningId: "setengah (30 menit)", exampleSentence: "にじはんです。" },
        { word: "ごぜん", reading: "ごぜん", meaningId: "pagi (AM)", exampleSentence: "ごぜんはちじにおきます。" },
        { word: "ごご", reading: "ごご", meaningId: "sore/siang (PM)", exampleSentence: "ごごさんじにかえります。" },
        { word: "なんじ", reading: "なんじ", meaningId: "jam berapa", exampleSentence: "いまなんじですか？" },
        { word: "〜ごろ", reading: "〜ごろ", meaningId: "sekitar (waktu)", exampleSentence: "にじごろいきます。" },
        { word: "まえ", reading: "まえ", meaningId: "sebelum / depan", exampleSentence: "ごじまえにきてください。" },
        { word: "すぎ", reading: "すぎ", meaningId: "lewat (waktu)", exampleSentence: "にじすぎです。" },
      ],
      kanji: [
        { character: "九", onyomi: "キュウ・ク", kunyomi: "ここの(つ)", meaningId: "sembilan" },
        { character: "十", onyomi: "ジュウ", kunyomi: "とお", meaningId: "sepuluh" },
        { character: "時", onyomi: "ジ", kunyomi: "とき", meaningId: "waktu, jam" },
        { character: "分", onyomi: "フン・ブン", kunyomi: "わ(かる)", meaningId: "menit, mengerti" },
      ],
      grammar: [
        { pattern: "〜時〜分です", explanation: "Menyatakan waktu: jam ~ menit ~.", exampleSentence: "いまさんじじゅうごふんです。" },
        { pattern: "〜時に〜します", explanation: "Melakukan sesuatu pada jam tertentu.", exampleSentence: "はちじにがっこうへいきます。" },
      ],
      quiz: [
        { question: "「ごぜん」の意味は？", options: ["Sore hari (PM)", "Pagi hari (AM)", "Malam hari", "Tengah malam"], correctAnswer: "Pagi hari (AM)" },
        { question: "2時30分 は日本語で？", options: ["にじはん", "さんじはん", "にじさんじゅう", "さんじに"], correctAnswer: "にじはん" },
        { question: "「なんじ」の意味は？", options: ["Berapa lama", "Jam berapa", "Hari apa", "Kapan"], correctAnswer: "Jam berapa" },
      ],
    },
    {
      title: "ひにち・ようび — Tanggal & Hari",
      explanation: "Pelajari nama-nama hari dalam seminggu, bulan, dan cara menyebut tanggal.",
      sortOrder: 6,
      vocab: [
        { word: "きょう", reading: "きょう", meaningId: "hari ini", exampleSentence: "きょうはなんようびですか？" },
        { word: "あした", reading: "あした", meaningId: "besok", exampleSentence: "あしたはやすみです。" },
        { word: "きのう", reading: "きのう", meaningId: "kemarin", exampleSentence: "きのうなにをしましたか？" },
        { word: "にちようび", reading: "にちようび", meaningId: "Minggu", exampleSentence: "にちようびはやすみです。" },
        { word: "げつようび", reading: "げつようび", meaningId: "Senin", exampleSentence: "げつようびからしごとです。" },
        { word: "かようび", reading: "かようび", meaningId: "Selasa", exampleSentence: "かようびにかいぎがあります。" },
        { word: "すいようび", reading: "すいようび", meaningId: "Rabu", exampleSentence: "すいようびはひまです。" },
        { word: "もくようび", reading: "もくようび", meaningId: "Kamis", exampleSentence: "もくようびにテストがあります。" },
        { word: "きんようび", reading: "きんようび", meaningId: "Jumat", exampleSentence: "きんようびがすきです！" },
        { word: "どようび", reading: "どようび", meaningId: "Sabtu", exampleSentence: "どようびはともだちとあいます。" },
      ],
      kanji: [
        { character: "百", onyomi: "ヒャク", kunyomi: "-", meaningId: "seratus" },
        { character: "千", onyomi: "セン", kunyomi: "ち", meaningId: "seribu" },
        { character: "万", onyomi: "マン", kunyomi: "-", meaningId: "sepuluh ribu" },
        { character: "半", onyomi: "ハン", kunyomi: "なか(ば)", meaningId: "setengah" },
      ],
      grammar: [
        { pattern: "〜ようびです", explanation: "Menyatakan hari: 'Hari ini adalah ~'.", exampleSentence: "きょうはげつようびです。" },
        { pattern: "〜月〜日", explanation: "Menyatakan tanggal: bulan ke- ~ tanggal ke-.", exampleSentence: "たんじょうびはさんがつみっかです。" },
      ],
      quiz: [
        { question: "「きのう」の意味は？", options: ["Hari ini", "Besok", "Kemarin", "Lusa"], correctAnswer: "Kemarin" },
        { question: "Hari setelah 金曜日 adalah？", options: ["木曜日", "日曜日", "土曜日", "月曜日"], correctAnswer: "土曜日" },
        { question: "「にちようび」を漢字で書くと？", options: ["月曜日", "日曜日", "火曜日", "水曜日"], correctAnswer: "日曜日" },
      ],
    },
    {
      title: "かぞく — Keluarga",
      explanation: "Pelajari kosakata anggota keluarga dan perbedaan penyebutan untuk keluarga sendiri vs keluarga orang lain.",
      sortOrder: 7,
      vocab: [
        { word: "ちち", reading: "ちち", meaningId: "ayah (keluarga sendiri)", exampleSentence: "ちちはかいしゃいんです。" },
        { word: "はは", reading: "はは", meaningId: "ibu (keluarga sendiri)", exampleSentence: "はははりょうりがじょうずです。" },
        { word: "おとうさん", reading: "おとうさん", meaningId: "ayah (keluarga orang lain)", exampleSentence: "おとうさんはおげんきですか？" },
        { word: "おかあさん", reading: "おかあさん", meaningId: "ibu (keluarga orang lain)", exampleSentence: "おかあさんはいつかえりますか？" },
        { word: "あに", reading: "あに", meaningId: "kakak laki-laki (sendiri)", exampleSentence: "あにはだいがくせいです。" },
        { word: "あね", reading: "あね", meaningId: "kakak perempuan (sendiri)", exampleSentence: "あねはとうきょうにすんでいます。" },
        { word: "おとうと", reading: "おとうと", meaningId: "adik laki-laki (sendiri)", exampleSentence: "おとうとはちゅうがくせいです。" },
        { word: "いもうと", reading: "いもうと", meaningId: "adik perempuan (sendiri)", exampleSentence: "いもうとはかわいいです。" },
        { word: "かぞく", reading: "かぞく", meaningId: "keluarga", exampleSentence: "わたしのかぞくはよにんです。" },
        { word: "こども", reading: "こども", meaningId: "anak-anak", exampleSentence: "こどもがさんにんいます。" },
      ],
      kanji: [
        { character: "父", onyomi: "フ", kunyomi: "ちち", meaningId: "ayah" },
        { character: "母", onyomi: "ボ", kunyomi: "はは", meaningId: "ibu" },
        { character: "子", onyomi: "シ・ス", kunyomi: "こ", meaningId: "anak" },
        { character: "女", onyomi: "ジョ", kunyomi: "おんな", meaningId: "perempuan" },
      ],
      grammar: [
        { pattern: "〜は〜人います", explanation: "Menyatakan ada berapa orang: 'Keluarga saya ada ~ orang'.", exampleSentence: "かぞくはごにんいます。" },
        { pattern: "〜は〜が上手です", explanation: "Menyatakan seseorang mahir dalam sesuatu.", exampleSentence: "はははりょうりがじょうずです。" },
      ],
      quiz: [
        { question: "「ちち」と「おとうさん」の違いは？", options: ["Sama saja", "ちち=keluarga sendiri, おとうさん=keluarga orang lain", "おとうさん=lebih formal", "ちち=untuk anak kecil"], correctAnswer: "ちち=keluarga sendiri, おとうさん=keluarga orang lain" },
        { question: "「いもうと」の意味は？", options: ["Kakak perempuan", "Adik laki-laki", "Adik perempuan", "Kakak laki-laki"], correctAnswer: "Adik perempuan" },
        { question: "「かぞくはよにんです」の意味は？", options: ["Keluarga saya ada 4 orang", "Keluarga saya ada 40 orang", "Saya punya 4 saudara", "Ada 4 keluarga"], correctAnswer: "Keluarga saya ada 4 orang" },
      ],
    },
    {
      title: "からだ — Anggota Tubuh",
      explanation: "Pelajari nama-nama bagian tubuh dan ekspresi untuk mengatakan sakit.",
      sortOrder: 8,
      vocab: [
        { word: "あたま", reading: "あたま", meaningId: "kepala", exampleSentence: "あたまがいたいです。" },
        { word: "め", reading: "め", meaningId: "mata", exampleSentence: "めがいたいです。" },
        { word: "はな", reading: "はな", meaningId: "hidung", exampleSentence: "はながかゆいです。" },
        { word: "くち", reading: "くち", meaningId: "mulut", exampleSentence: "くちをあけてください。" },
        { word: "みみ", reading: "みみ", meaningId: "telinga", exampleSentence: "みみがいたいです。" },
        { word: "て", reading: "て", meaningId: "tangan", exampleSentence: "てをあらってください。" },
        { word: "あし", reading: "あし", meaningId: "kaki", exampleSentence: "あしがいたいです。" },
        { word: "おなか", reading: "おなか", meaningId: "perut", exampleSentence: "おなかがすきました。" },
        { word: "いたい", reading: "いたい", meaningId: "sakit (rasa sakit)", exampleSentence: "あたまがいたいです。" },
        { word: "びょうき", reading: "びょうき", meaningId: "sakit (penyakit)", exampleSentence: "びょうきです。びょういんにいきます。" },
      ],
      kanji: [
        { character: "目", onyomi: "モク・ボク", kunyomi: "め", meaningId: "mata" },
        { character: "口", onyomi: "コウ・ク", kunyomi: "くち", meaningId: "mulut" },
        { character: "手", onyomi: "シュ", kunyomi: "て", meaningId: "tangan" },
        { character: "足", onyomi: "ソク", kunyomi: "あし", meaningId: "kaki" },
      ],
      grammar: [
        { pattern: "〜が痛いです", explanation: "Menyatakan bagian tubuh yang sakit.", exampleSentence: "のどがいたいです。" },
        { pattern: "〜をください", explanation: "Meminta sesuatu kepada dokter/apoteker.", exampleSentence: "くすりをください。" },
      ],
      quiz: [
        { question: "「あし」の意味は？", options: ["Tangan", "Kepala", "Kaki", "Perut"], correctAnswer: "Kaki" },
        { question: "「おなかがすきました」の意味は？", options: ["Perut saya kenyang", "Perut saya lapar", "Perut saya sakit", "Perut saya besar"], correctAnswer: "Perut saya lapar" },
        { question: "「手」はなんと読みますか？", options: ["あし", "め", "て", "くち"], correctAnswer: "て" },
      ],
    },
    {
      title: "たべもの① — Makanan Pokok",
      explanation: "Pelajari kosakata makanan Jepang dan cara menyatakan makanan favorit.",
      sortOrder: 9,
      vocab: [
        { word: "ごはん", reading: "ごはん", meaningId: "nasi / makan (informal)", exampleSentence: "ごはんをたべます。" },
        { word: "パン", reading: "パン", meaningId: "roti", exampleSentence: "あさごはんにパンをたべます。" },
        { word: "すし", reading: "すし", meaningId: "sushi", exampleSentence: "すしがだいすきです！" },
        { word: "ラーメン", reading: "ラーメン", meaningId: "ramen", exampleSentence: "さむいひにはラーメンがたべたいです。" },
        { word: "てんぷら", reading: "てんぷら", meaningId: "tempura", exampleSentence: "てんぷらはおいしいです。" },
        { word: "おにぎり", reading: "おにぎり", meaningId: "onigiri (nasi kepal)", exampleSentence: "コンビニでおにぎりをかいます。" },
        { word: "たまご", reading: "たまご", meaningId: "telur", exampleSentence: "まいあさたまごをたべます。" },
        { word: "にく", reading: "にく", meaningId: "daging", exampleSentence: "やきとりはとりにくです。" },
        { word: "さかな", reading: "さかな", meaningId: "ikan", exampleSentence: "さかなのりょうりがすきです。" },
        { word: "おいしい", reading: "おいしい", meaningId: "enak / lezat", exampleSentence: "このすしはおいしいですね！" },
      ],
      kanji: [
        { character: "食", onyomi: "ショク", kunyomi: "た(べる)", meaningId: "makan, makanan" },
        { character: "大", onyomi: "ダイ", kunyomi: "おお(きい)", meaningId: "besar" },
        { character: "小", onyomi: "ショウ", kunyomi: "ちい(さい)", meaningId: "kecil" },
        { character: "長", onyomi: "チョウ", kunyomi: "なが(い)", meaningId: "panjang" },
      ],
      grammar: [
        { pattern: "〜が好きです", explanation: "Menyatakan kesukaan: 'Saya suka ~'.", exampleSentence: "すしがだいすきです。" },
        { pattern: "〜はおいしいです", explanation: "Mendeskripsikan rasa makanan.", exampleSentence: "このラーメンはおいしいです。" },
      ],
      quiz: [
        { question: "「おいしい」の意味は？", options: ["Mahal", "Enak/Lezat", "Panas", "Besar"], correctAnswer: "Enak/Lezat" },
        { question: "「たまご」の意味は？", options: ["Daging", "Ikan", "Telur", "Sayur"], correctAnswer: "Telur" },
        { question: "「食べます」の意味は？", options: ["Minum", "Makan", "Tidur", "Jalan"], correctAnswer: "Makan" },
      ],
    },
    {
      title: "のみもの・くだもの — Minuman & Buah",
      explanation: "Pelajari nama-nama minuman, buah, dan cara mendeskripsikan rasa.",
      sortOrder: 10,
      vocab: [
        { word: "みず", reading: "みず", meaningId: "air", exampleSentence: "みずをのみます。" },
        { word: "おちゃ", reading: "おちゃ", meaningId: "teh (Jepang)", exampleSentence: "おちゃをのみますか？" },
        { word: "コーヒー", reading: "コーヒー", meaningId: "kopi", exampleSentence: "まいあさコーヒーをのみます。" },
        { word: "ぎゅうにゅう", reading: "ぎゅうにゅう", meaningId: "susu sapi", exampleSentence: "こどもはぎゅうにゅうがすきです。" },
        { word: "ジュース", reading: "ジュース", meaningId: "jus", exampleSentence: "オレンジジュースをください。" },
        { word: "りんご", reading: "りんご", meaningId: "apel", exampleSentence: "あかいりんごがすきです。" },
        { word: "バナナ", reading: "バナナ", meaningId: "pisang", exampleSentence: "バナナはあまいです。" },
        { word: "オレンジ", reading: "オレンジ", meaningId: "jeruk", exampleSentence: "オレンジをむいてたべます。" },
        { word: "あまい", reading: "あまい", meaningId: "manis", exampleSentence: "このケーキはあまいです。" },
        { word: "すっぱい", reading: "すっぱい", meaningId: "asam", exampleSentence: "レモンはすっぱいです。" },
      ],
      kanji: [
        { character: "水", onyomi: "スイ", kunyomi: "みず", meaningId: "air" },
        { character: "火", onyomi: "カ", kunyomi: "ひ", meaningId: "api, Selasa" },
        { character: "木", onyomi: "モク", kunyomi: "き", meaningId: "pohon, Kamis" },
        { character: "金", onyomi: "キン", kunyomi: "かね", meaningId: "emas, uang, Jumat" },
      ],
      grammar: [
        { pattern: "〜と〜", explanation: "Menghubungkan dua benda: 'A dan B'.", exampleSentence: "コーヒーとケーキをください。" },
        { pattern: "〜はどうですか", explanation: "Menawarkan sesuatu: 'Bagaimana dengan ~?'", exampleSentence: "おちゃはどうですか？" },
      ],
      quiz: [
        { question: "「みず」を漢字で書くと？", options: ["木", "火", "水", "金"], correctAnswer: "水" },
        { question: "「あまい」の意味は？", options: ["Pahit", "Asam", "Manis", "Asin"], correctAnswer: "Manis" },
        { question: "「のみます」の意味は？", options: ["Makan", "Minum", "Membeli", "Membuat"], correctAnswer: "Minum" },
      ],
    },
    {
      title: "いろ・かたち — Warna & Bentuk",
      explanation: "Pelajari nama-nama warna dan kata sifat untuk mendeskripsikan benda.",
      sortOrder: 11,
      vocab: [
        { word: "しろい", reading: "しろい", meaningId: "putih", exampleSentence: "しろいシャツをきています。" },
        { word: "くろい", reading: "くろい", meaningId: "hitam", exampleSentence: "くろいくつをはいています。" },
        { word: "あかい", reading: "あかい", meaningId: "merah", exampleSentence: "あかいりんごです。" },
        { word: "あおい", reading: "あおい", meaningId: "biru", exampleSentence: "そらはあおいです。" },
        { word: "きいろい", reading: "きいろい", meaningId: "kuning", exampleSentence: "バナナはきいろいです。" },
        { word: "みどり", reading: "みどり", meaningId: "hijau", exampleSentence: "みどりのきがすきです。" },
        { word: "おおきい", reading: "おおきい", meaningId: "besar", exampleSentence: "おおきいいぬです。" },
        { word: "ちいさい", reading: "ちいさい", meaningId: "kecil", exampleSentence: "ちいさいねこです。" },
        { word: "まるい", reading: "まるい", meaningId: "bulat", exampleSentence: "つきはまるいです。" },
        { word: "ながい", reading: "ながい", meaningId: "panjang", exampleSentence: "かみがながいです。" },
      ],
      kanji: [
        { character: "白", onyomi: "ハク", kunyomi: "しろ・しろ(い)", meaningId: "putih" },
        { character: "赤", onyomi: "セキ", kunyomi: "あか・あか(い)", meaningId: "merah" },
        { character: "青", onyomi: "セイ", kunyomi: "あお・あお(い)", meaningId: "biru" },
        { character: "黒", onyomi: "コク", kunyomi: "くろ・くろ(い)", meaningId: "hitam" },
      ],
      grammar: [
        { pattern: "い形容詞 + です", explanation: "Kata sifat berakhiran -い digunakan langsung sebelum です.", exampleSentence: "このりんごはあかいです。" },
        { pattern: "どんな〜ですか", explanation: "Menanyakan deskripsi benda: 'Bagaimana bentuk/warna ~?'", exampleSentence: "どんないろですか？" },
      ],
      quiz: [
        { question: "「白」はなんと読みますか？", options: ["くろ", "あか", "しろ", "あお"], correctAnswer: "しろ" },
        { question: "「おおきい」の反対は？", options: ["ながい", "ちいさい", "まるい", "くろい"], correctAnswer: "ちいさい" },
        { question: "空の色は？", options: ["あかい", "きいろい", "あおい", "くろい"], correctAnswer: "あおい" },
      ],
    },
    {
      title: "てんき・きせつ — Cuaca & Musim",
      explanation: "Pelajari kosakata cuaca dan empat musim di Jepang.",
      sortOrder: 12,
      vocab: [
        { word: "てんき", reading: "てんき", meaningId: "cuaca", exampleSentence: "きょうのてんきはどうですか？" },
        { word: "はれ", reading: "はれ", meaningId: "cerah", exampleSentence: "きょうははれです。" },
        { word: "くもり", reading: "くもり", meaningId: "berawan", exampleSentence: "あしたはくもりです。" },
        { word: "あめ", reading: "あめ", meaningId: "hujan", exampleSentence: "あめがふっています。" },
        { word: "ゆき", reading: "ゆき", meaningId: "salju", exampleSentence: "ほっかいどうではゆきがたくさんふります。" },
        { word: "はる", reading: "はる", meaningId: "musim semi", exampleSentence: "はるはさくらがきれいです。" },
        { word: "なつ", reading: "なつ", meaningId: "musim panas", exampleSentence: "なつはあついです。" },
        { word: "あき", reading: "あき", meaningId: "musim gugur", exampleSentence: "あきはもみじがきれいです。" },
        { word: "ふゆ", reading: "ふゆ", meaningId: "musim dingin", exampleSentence: "ふゆはさむいです。" },
        { word: "あつい", reading: "あつい", meaningId: "panas", exampleSentence: "きょうはあついですね。" },
      ],
      kanji: [
        { character: "天", onyomi: "テン", kunyomi: "あめ・あま", meaningId: "langit, surga" },
        { character: "雨", onyomi: "ウ", kunyomi: "あめ", meaningId: "hujan" },
        { character: "空", onyomi: "クウ", kunyomi: "そら", meaningId: "langit, kosong" },
        { character: "花", onyomi: "カ", kunyomi: "はな", meaningId: "bunga" },
      ],
      grammar: [
        { pattern: "〜が降ります", explanation: "Menyatakan turunnya hujan/salju: '~ turun'.", exampleSentence: "あめがふります。" },
        { pattern: "〜になります", explanation: "Menyatakan perubahan keadaan: 'menjadi ~'.", exampleSentence: "さむくなります。" },
      ],
      quiz: [
        { question: "「あめ」の意味は？", options: ["Salju", "Angin", "Hujan", "Cerah"], correctAnswer: "Hujan" },
        { question: "「なつ」はどんな季節ですか？", options: ["Musim semi", "Musim panas", "Musim gugur", "Musim dingin"], correctAnswer: "Musim panas" },
        { question: "「天気」はなんと読みますか？", options: ["てんき", "あめき", "てんぎ", "あまき"], correctAnswer: "てんき" },
      ],
    },
    {
      title: "ばしょ — Tempat & Gedung",
      explanation: "Pelajari nama-nama tempat umum dan cara menanyakan lokasi.",
      sortOrder: 13,
      vocab: [
        { word: "がっこう", reading: "がっこう", meaningId: "sekolah", exampleSentence: "まいにちがっこうへいきます。" },
        { word: "びょういん", reading: "びょういん", meaningId: "rumah sakit", exampleSentence: "びょうきなのでびょういんへいきます。" },
        { word: "ゆうびんきょく", reading: "ゆうびんきょく", meaningId: "kantor pos", exampleSentence: "ゆうびんきょくはどこですか？" },
        { word: "ぎんこう", reading: "ぎんこう", meaningId: "bank", exampleSentence: "ぎんこうでおかねをおろします。" },
        { word: "スーパー", reading: "スーパー", meaningId: "supermarket", exampleSentence: "スーパーでやさいをかいます。" },
        { word: "えき", reading: "えき", meaningId: "stasiun", exampleSentence: "えきはちかいですか？" },
        { word: "こうえん", reading: "こうえん", meaningId: "taman", exampleSentence: "こうえんでさんぽします。" },
        { word: "としょかん", reading: "としょかん", meaningId: "perpustakaan", exampleSentence: "としょかんでほんをよみます。" },
        { word: "〜はどこですか", reading: "〜はどこですか", meaningId: "di mana ~?", exampleSentence: "トイレはどこですか？" },
        { word: "ちかく", reading: "ちかく", meaningId: "dekat", exampleSentence: "えきのちかくにあります。" },
      ],
      kanji: [
        { character: "東", onyomi: "トウ", kunyomi: "ひがし", meaningId: "timur" },
        { character: "西", onyomi: "セイ", kunyomi: "にし", meaningId: "barat" },
        { character: "南", onyomi: "ナン", kunyomi: "みなみ", meaningId: "selatan" },
        { character: "北", onyomi: "ホク", kunyomi: "きた", meaningId: "utara" },
      ],
      grammar: [
        { pattern: "〜はどこですか", explanation: "Menanyakan lokasi: 'Di mana ~?'", exampleSentence: "コンビニはどこですか？" },
        { pattern: "〜の近くにあります", explanation: "Menyatakan letak: 'Ada di dekat ~'.", exampleSentence: "えきのちかくにあります。" },
      ],
      quiz: [
        { question: "「びょういん」の意味は？", options: ["Sekolah", "Bank", "Rumah sakit", "Taman"], correctAnswer: "Rumah sakit" },
        { question: "「東」はなんと読みますか？", options: ["にし", "きた", "みなみ", "ひがし"], correctAnswer: "ひがし" },
        { question: "「どこ」の意味は？", options: ["Apa", "Siapa", "Di mana", "Kapan"], correctAnswer: "Di mana" },
      ],
    },
    {
      title: "のりもの — Transportasi",
      explanation: "Pelajari nama-nama alat transportasi dan cara pergi ke suatu tempat.",
      sortOrder: 14,
      vocab: [
        { word: "でんしゃ", reading: "でんしゃ", meaningId: "kereta listrik", exampleSentence: "でんしゃでがっこうへいきます。" },
        { word: "バス", reading: "バス", meaningId: "bus", exampleSentence: "バスにのります。" },
        { word: "タクシー", reading: "タクシー", meaningId: "taksi", exampleSentence: "タクシーをよびます。" },
        { word: "じてんしゃ", reading: "じてんしゃ", meaningId: "sepeda", exampleSentence: "じてんしゃでいきます。" },
        { word: "くるま", reading: "くるま", meaningId: "mobil", exampleSentence: "くるまでかいしゃへいきます。" },
        { word: "ひこうき", reading: "ひこうき", meaningId: "pesawat", exampleSentence: "ひこうきでとうきょうへいきます。" },
        { word: "のります", reading: "のります", meaningId: "naik (kendaraan)", exampleSentence: "でんしゃにのります。" },
        { word: "おります", reading: "おります", meaningId: "turun (kendaraan)", exampleSentence: "つぎのえきでおります。" },
        { word: "きっぷ", reading: "きっぷ", meaningId: "tiket", exampleSentence: "きっぷをかいます。" },
        { word: "〜で〜へいきます", reading: "〜で〜へいきます", meaningId: "pergi ke ~ dengan ~", exampleSentence: "バスでえきへいきます。" },
      ],
      kanji: [
        { character: "車", onyomi: "シャ", kunyomi: "くるま", meaningId: "mobil, kendaraan" },
        { character: "電", onyomi: "デン", kunyomi: "-", meaningId: "listrik" },
        { character: "行", onyomi: "コウ", kunyomi: "い(く)", meaningId: "pergi" },
        { character: "来", onyomi: "ライ", kunyomi: "く(る)", meaningId: "datang" },
      ],
      grammar: [
        { pattern: "〜で行きます", explanation: "Menyatakan alat transportasi: 'Pergi dengan ~'.", exampleSentence: "でんしゃでいきます。" },
        { pattern: "〜から〜まで", explanation: "Menyatakan dari mana ke mana.", exampleSentence: "えきからかいしゃまでバスでいきます。" },
      ],
      quiz: [
        { question: "「でんしゃ」を漢字で書くと？", options: ["電車", "電気", "汽車", "地下鉄"], correctAnswer: "電車" },
        { question: "「のります」の意味は？", options: ["Turun dari kendaraan", "Naik kendaraan", "Membeli tiket", "Berjalan"], correctAnswer: "Naik kendaraan" },
        { question: "「バスでいきます」の意味は？", options: ["Naik bus", "Pergi dengan bus", "Bus datang", "Menunggu bus"], correctAnswer: "Pergi dengan bus" },
      ],
    },
    {
      title: "いえ・へや — Rumah & Kamar",
      explanation: "Pelajari kosakata tentang rumah, kamar, dan perabotan.",
      sortOrder: 15,
      vocab: [
        { word: "いえ / うち", reading: "いえ/うち", meaningId: "rumah", exampleSentence: "うちにかえります。" },
        { word: "へや", reading: "へや", meaningId: "kamar", exampleSentence: "わたしのへやはちいさいです。" },
        { word: "リビング", reading: "リビング", meaningId: "ruang tamu", exampleSentence: "リビングでテレビをみます。" },
        { word: "だいどころ", reading: "だいどころ", meaningId: "dapur", exampleSentence: "だいどころでりょうりをします。" },
        { word: "テーブル", reading: "テーブル", meaningId: "meja", exampleSentence: "テーブルのうえにほんがあります。" },
        { word: "いす", reading: "いす", meaningId: "kursi", exampleSentence: "いすにすわります。" },
        { word: "ベッド", reading: "ベッド", meaningId: "tempat tidur", exampleSentence: "ベッドでねます。" },
        { word: "まど", reading: "まど", meaningId: "jendela", exampleSentence: "まどをあけてください。" },
        { word: "でんき", reading: "でんき", meaningId: "lampu / listrik", exampleSentence: "でんきをけしてください。" },
        { word: "トイレ", reading: "トイレ", meaningId: "toilet", exampleSentence: "トイレはどこですか？" },
      ],
      kanji: [
        { character: "上", onyomi: "ジョウ", kunyomi: "うえ", meaningId: "atas" },
        { character: "下", onyomi: "カ", kunyomi: "した", meaningId: "bawah" },
        { character: "左", onyomi: "サ", kunyomi: "ひだり", meaningId: "kiri" },
        { character: "右", onyomi: "ウ", kunyomi: "みぎ", meaningId: "kanan" },
      ],
      grammar: [
        { pattern: "〜の上に〜があります", explanation: "Menyatakan posisi benda: 'Ada ~ di atas ~'.", exampleSentence: "テーブルのうえにほんがあります。" },
        { pattern: "〜をあけてください / しめてください", explanation: "Meminta membuka/menutup sesuatu.", exampleSentence: "まどをあけてください。" },
      ],
      quiz: [
        { question: "「上」はなんと読みますか？", options: ["した", "うえ", "ひだり", "みぎ"], correctAnswer: "うえ" },
        { question: "「まど」の意味は？", options: ["Pintu", "Jendela", "Dinding", "Lantai"], correctAnswer: "Jendela" },
        { question: "「テーブルのしたにあります」の意味は？", options: ["Ada di atas meja", "Ada di bawah meja", "Ada di samping meja", "Ada di dalam meja"], correctAnswer: "Ada di bawah meja" },
      ],
    },
    {
      title: "がっこう — Sekolah & Belajar",
      explanation: "Pelajari kosakata yang berhubungan dengan sekolah, kelas, dan kegiatan belajar.",
      sortOrder: 16,
      vocab: [
        { word: "がっこう", reading: "がっこう", meaningId: "sekolah", exampleSentence: "がっこうはたのしいです。" },
        { word: "きょうしつ", reading: "きょうしつ", meaningId: "ruang kelas", exampleSentence: "きょうしつでべんきょうします。" },
        { word: "じゅぎょう", reading: "じゅぎょう", meaningId: "pelajaran / kelas", exampleSentence: "じゅぎょうはくじからです。" },
        { word: "しゅくだい", reading: "しゅくだい", meaningId: "pekerjaan rumah (PR)", exampleSentence: "しゅくだいをわすれました。" },
        { word: "テスト", reading: "テスト", meaningId: "tes / ujian", exampleSentence: "あしたテストがあります。" },
        { word: "ノート", reading: "ノート", meaningId: "buku catatan", exampleSentence: "ノートにかきます。" },
        { word: "えんぴつ", reading: "えんぴつ", meaningId: "pensil", exampleSentence: "えんぴつでかいてください。" },
        { word: "べんきょうします", reading: "べんきょうします", meaningId: "belajar", exampleSentence: "まいにちにほんごをべんきょうします。" },
        { word: "わかります", reading: "わかります", meaningId: "mengerti / paham", exampleSentence: "わかりますか？はい、わかります。" },
        { word: "わすれます", reading: "わすれます", meaningId: "lupa", exampleSentence: "なまえをわすれました。" },
      ],
      kanji: [
        { character: "学", onyomi: "ガク", kunyomi: "まな(ぶ)", meaningId: "belajar, ilmu" },
        { character: "校", onyomi: "コウ", kunyomi: "-", meaningId: "sekolah" },
        { character: "先", onyomi: "セン", kunyomi: "さき", meaningId: "dulu, ujung" },
        { character: "生", onyomi: "セイ・ショウ", kunyomi: "い(きる)", meaningId: "hidup, lahir" },
      ],
      grammar: [
        { pattern: "〜を勉強します", explanation: "Menyatakan apa yang dipelajari.", exampleSentence: "にほんごをべんきょうします。" },
        { pattern: "〜がわかります", explanation: "Menyatakan mengerti sesuatu.", exampleSentence: "にほんごがすこしわかります。" },
      ],
      quiz: [
        { question: "「しゅくだい」の意味は？", options: ["Ujian", "Pekerjaan rumah", "Pelajaran", "Buku"], correctAnswer: "Pekerjaan rumah" },
        { question: "「学校」はなんと読みますか？", options: ["がっこ", "がくこう", "がっこう", "がくこ"], correctAnswer: "がっこう" },
        { question: "「わかります」の意味は？", options: ["Lupa", "Mengerti", "Belajar", "Mengajar"], correctAnswer: "Mengerti" },
      ],
    },
    {
      title: "かいもの — Belanja",
      explanation: "Pelajari cara berbelanja: memilih barang, menanyakan harga, dan membayar.",
      sortOrder: 17,
      vocab: [
        { word: "みせ", reading: "みせ", meaningId: "toko", exampleSentence: "このみせはやすいです。" },
        { word: "かいます", reading: "かいます", meaningId: "membeli", exampleSentence: "スーパーでやさいをかいます。" },
        { word: "〜をください", reading: "〜をください", meaningId: "tolong berikan ~", exampleSentence: "これをひとつください。" },
        { word: "〜はありますか", reading: "〜はありますか", meaningId: "apakah ada ~?", exampleSentence: "Mサイズはありますか？" },
        { word: "サイズ", reading: "サイズ", meaningId: "ukuran", exampleSentence: "どのサイズですか？" },
        { word: "レジ", reading: "レジ", meaningId: "kasir", exampleSentence: "レジでおかねをはらいます。" },
        { word: "げんきん", reading: "げんきん", meaningId: "uang tunai", exampleSentence: "げんきんではらいます。" },
        { word: "カード", reading: "カード", meaningId: "kartu (kredit/debit)", exampleSentence: "カードでもいいですか？" },
        { word: "セール", reading: "セール", meaningId: "obral / sale", exampleSentence: "いまセールちゅうです！" },
        { word: "ほしい", reading: "ほしい", meaningId: "menginginkan", exampleSentence: "このシャツがほしいです。" },
      ],
      kanji: [
        { character: "円", onyomi: "エン", kunyomi: "まる(い)", meaningId: "yen, lingkaran" },
        { character: "高", onyomi: "コウ", kunyomi: "たか(い)", meaningId: "tinggi, mahal" },
        { character: "安", onyomi: "アン", kunyomi: "やす(い)", meaningId: "murah, aman" },
        { character: "店", onyomi: "テン", kunyomi: "みせ", meaningId: "toko" },
      ],
      grammar: [
        { pattern: "〜をください", explanation: "Meminta barang saat berbelanja.", exampleSentence: "これをふたつください。" },
        { pattern: "〜にします", explanation: "Memilih/memutuskan sesuatu.", exampleSentence: "コーヒーにします。" },
      ],
      quiz: [
        { question: "「いくらですか」の意味は？", options: ["Ada berapa?", "Apa ini?", "Berapa harganya?", "Di mana?"], correctAnswer: "Berapa harganya?" },
        { question: "「ほしい」の意味は？", options: ["Membeli", "Menginginkan", "Menjual", "Membayar"], correctAnswer: "Menginginkan" },
        { question: "「安い」はなんと読みますか？", options: ["たかい", "やすい", "やすい", "あんい"], correctAnswer: "やすい" },
      ],
    },
    {
      title: "しごと — Pekerjaan",
      explanation: "Pelajari nama-nama profesi dan cara menanyakan pekerjaan seseorang.",
      sortOrder: 18,
      vocab: [
        { word: "しごと", reading: "しごと", meaningId: "pekerjaan", exampleSentence: "しごとはなんですか？" },
        { word: "いしゃ", reading: "いしゃ", meaningId: "dokter", exampleSentence: "いしゃになりたいです。" },
        { word: "かんごし", reading: "かんごし", meaningId: "perawat", exampleSentence: "かんごしはたいへんなしごとです。" },
        { word: "エンジニア", reading: "エンジニア", meaningId: "insinyur / engineer", exampleSentence: "わたしはエンジニアです。" },
        { word: "りょうりにん", reading: "りょうりにん", meaningId: "koki / juru masak", exampleSentence: "りょうりにんのりょうりはおいしいです。" },
        { word: "うんてんしゅ", reading: "うんてんしゅ", meaningId: "pengemudi", exampleSentence: "タクシーのうんてんしゅです。" },
        { word: "アルバイト", reading: "アルバイト", meaningId: "kerja paruh waktu", exampleSentence: "コンビニでアルバイトをしています。" },
        { word: "はたらきます", reading: "はたらきます", meaningId: "bekerja", exampleSentence: "まいにちはたらきます。" },
        { word: "かいしゃ", reading: "かいしゃ", meaningId: "perusahaan", exampleSentence: "おおきいかいしゃではたらいています。" },
        { word: "〜で働きます", reading: "〜ではたらきます", meaningId: "bekerja di ~", exampleSentence: "びょういんではたらいています。" },
      ],
      kanji: [
        { character: "田", onyomi: "デン", kunyomi: "た", meaningId: "sawah" },
        { character: "山", onyomi: "サン", kunyomi: "やま", meaningId: "gunung" },
        { character: "川", onyomi: "セン", kunyomi: "かわ", meaningId: "sungai" },
        { character: "土", onyomi: "ド・ト", kunyomi: "つち", meaningId: "tanah, Sabtu" },
      ],
      grammar: [
        { pattern: "〜で働いています", explanation: "Menyatakan tempat bekerja saat ini.", exampleSentence: "びょういんではたらいています。" },
        { pattern: "〜として働きます", explanation: "Menyatakan posisi/jabatan pekerjaan.", exampleSentence: "エンジニアとしてはたらいています。" },
      ],
      quiz: [
        { question: "「いしゃ」の意味は？", options: ["Guru", "Dokter", "Polisi", "Koki"], correctAnswer: "Dokter" },
        { question: "「アルバイト」の意味は？", options: ["Kerja penuh waktu", "Kerja paruh waktu", "Liburan", "Belajar"], correctAnswer: "Kerja paruh waktu" },
        { question: "「はたらきます」の意味は？", options: ["Belajar", "Istirahat", "Bekerja", "Bermain"], correctAnswer: "Bekerja" },
      ],
    },
    {
      title: "にちじょう① — Kegiatan Sehari-hari",
      explanation: "Pelajari kata kerja dan rutinitas kehidupan sehari-hari.",
      sortOrder: 19,
      vocab: [
        { word: "おきます", reading: "おきます", meaningId: "bangun tidur", exampleSentence: "まいあさろくじにおきます。" },
        { word: "ねます", reading: "ねます", meaningId: "tidur", exampleSentence: "じゅうにじにねます。" },
        { word: "たべます", reading: "たべます", meaningId: "makan", exampleSentence: "あさごはんをたべます。" },
        { word: "のみます", reading: "のみます", meaningId: "minum", exampleSentence: "コーヒーをのみます。" },
        { word: "いきます", reading: "いきます", meaningId: "pergi", exampleSentence: "がっこうへいきます。" },
        { word: "かえります", reading: "かえります", meaningId: "pulang / kembali", exampleSentence: "うちにかえります。" },
        { word: "みます", reading: "みます", meaningId: "melihat / menonton", exampleSentence: "テレビをみます。" },
        { word: "よみます", reading: "よみます", meaningId: "membaca", exampleSentence: "まいにちほんをよみます。" },
        { word: "かきます", reading: "かきます", meaningId: "menulis / menggambar", exampleSentence: "てがみをかきます。" },
        { word: "そうじします", reading: "そうじします", meaningId: "membersihkan / menyapu", exampleSentence: "へやをそうじします。" },
      ],
      kanji: [
        { character: "毎", onyomi: "マイ", kunyomi: "-", meaningId: "setiap" },
        { character: "休", onyomi: "キュウ", kunyomi: "やす(む)", meaningId: "istirahat, libur" },
        { character: "少", onyomi: "ショウ", kunyomi: "すこ(し)", meaningId: "sedikit" },
        { character: "歩", onyomi: "ホ", kunyomi: "ある(く)", meaningId: "berjalan" },
      ],
      grammar: [
        { pattern: "〜ます / 〜ません", explanation: "Bentuk sopan kata kerja: positif dan negatif.", exampleSentence: "にほんごをべんきょうします。えいごはべんきょうしません。" },
        { pattern: "まいにち〜ます", explanation: "Menyatakan kegiatan yang dilakukan setiap hari.", exampleSentence: "まいにちさんぽします。" },
      ],
      quiz: [
        { question: "「おきます」の意味は？", options: ["Tidur", "Bangun tidur", "Istirahat", "Duduk"], correctAnswer: "Bangun tidur" },
        { question: "「毎日」はなんと読みますか？", options: ["まいにち", "まいひ", "まいじつ", "まいにる"], correctAnswer: "まいにち" },
        { question: "「かえります」の意味は？", options: ["Pergi", "Datang", "Pulang/Kembali", "Tinggal"], correctAnswer: "Pulang/Kembali" },
      ],
    },
    {
      title: "にちじょう② — Frekuensi & Waktu",
      explanation: "Pelajari kata keterangan frekuensi dan cara menyatakan kapan melakukan sesuatu.",
      sortOrder: 20,
      vocab: [
        { word: "いつも", reading: "いつも", meaningId: "selalu", exampleSentence: "いつもありがとうございます。" },
        { word: "よく", reading: "よく", meaningId: "sering", exampleSentence: "このみせによくきます。" },
        { word: "ときどき", reading: "ときどき", meaningId: "kadang-kadang", exampleSentence: "ときどきえいがをみます。" },
        { word: "あまり〜ない", reading: "あまり〜ない", meaningId: "tidak terlalu ~", exampleSentence: "あまりおさけをのみません。" },
        { word: "ぜんぜん〜ない", reading: "ぜんぜん〜ない", meaningId: "sama sekali tidak ~", exampleSentence: "ぜんぜんわかりません。" },
        { word: "まいあさ", reading: "まいあさ", meaningId: "setiap pagi", exampleSentence: "まいあさコーヒーをのみます。" },
        { word: "まいばん", reading: "まいばん", meaningId: "setiap malam", exampleSentence: "まいばんほんをよみます。" },
        { word: "〜まえに", reading: "〜まえに", meaningId: "sebelum ~", exampleSentence: "ねるまえにはをみがきます。" },
        { word: "〜あとで", reading: "〜あとで", meaningId: "setelah ~", exampleSentence: "しごとのあとでのみにいきます。" },
        { word: "〜てから", reading: "〜てから", meaningId: "setelah melakukan ~", exampleSentence: "てをあらってからたべます。" },
      ],
      kanji: [
        { character: "今", onyomi: "コン", kunyomi: "いま", meaningId: "sekarang" },
        { character: "前", onyomi: "ゼン", kunyomi: "まえ", meaningId: "sebelum, depan" },
        { character: "後", onyomi: "ゴ", kunyomi: "あと", meaningId: "setelah, belakang" },
        { character: "間", onyomi: "カン", kunyomi: "あいだ", meaningId: "antara, sela" },
      ],
      grammar: [
        { pattern: "〜てから〜します", explanation: "Melakukan B setelah A selesai.", exampleSentence: "シャワーをあびてからごはんをたべます。" },
        { pattern: "〜まえに〜します", explanation: "Melakukan B sebelum A.", exampleSentence: "ねるまえにほんをよみます。" },
      ],
      quiz: [
        { question: "「ときどき」の意味は？", options: ["Selalu", "Sering", "Kadang-kadang", "Tidak pernah"], correctAnswer: "Kadang-kadang" },
        { question: "「ぜんぜんわかりません」の意味は？", options: ["Sedikit mengerti", "Sangat mengerti", "Sama sekali tidak mengerti", "Tidak terlalu mengerti"], correctAnswer: "Sama sekali tidak mengerti" },
        { question: "「前」はなんと読みますか？", options: ["あと", "まえ", "なか", "そと"], correctAnswer: "まえ" },
      ],
    },
    {
      title: "しゅみ — Hobi & Waktu Luang",
      explanation: "Pelajari cara menyatakan hobi dan kegiatan yang disukai.",
      sortOrder: 21,
      vocab: [
        { word: "しゅみ", reading: "しゅみ", meaningId: "hobi", exampleSentence: "しゅみはなんですか？" },
        { word: "どくしょ", reading: "どくしょ", meaningId: "membaca buku", exampleSentence: "しゅみはどくしょです。" },
        { word: "おんがく", reading: "おんがく", meaningId: "musik", exampleSentence: "おんがくをきくのがすきです。" },
        { word: "えいが", reading: "えいが", meaningId: "film / bioskop", exampleSentence: "まいしゅうえいがをみます。" },
        { word: "スポーツ", reading: "スポーツ", meaningId: "olahraga", exampleSentence: "スポーツがだいすきです。" },
        { word: "りょうり", reading: "りょうり", meaningId: "memasak", exampleSentence: "りょうりをするのがたのしいです。" },
        { word: "カラオケ", reading: "カラオケ", meaningId: "karaoke", exampleSentence: "ともだちとカラオケにいきます。" },
        { word: "ゲーム", reading: "ゲーム", meaningId: "game / permainan", exampleSentence: "テレビゲームをします。" },
        { word: "たのしい", reading: "たのしい", meaningId: "menyenangkan", exampleSentence: "にほんごのべんきょうはたのしいです。" },
        { word: "〜のがすきです", reading: "〜のがすきです", meaningId: "suka melakukan ~", exampleSentence: "えいがをみるのがすきです。" },
      ],
      kanji: [
        { character: "見", onyomi: "ケン", kunyomi: "み(る)", meaningId: "melihat" },
        { character: "聞", onyomi: "ブン", kunyomi: "き(く)", meaningId: "mendengar" },
        { character: "書", onyomi: "ショ", kunyomi: "か(く)", meaningId: "menulis" },
        { character: "読", onyomi: "ドク", kunyomi: "よ(む)", meaningId: "membaca" },
      ],
      grammar: [
        { pattern: "〜のが好きです", explanation: "Menyatakan suka melakukan sesuatu: 'Suka ~'.", exampleSentence: "うたうのがだいすきです。" },
        { pattern: "〜ことができます", explanation: "Menyatakan kemampuan: 'Bisa melakukan ~'.", exampleSentence: "にほんごがはなせることができます。" },
      ],
      quiz: [
        { question: "「しゅみ」の意味は？", options: ["Pekerjaan", "Hobi", "Belajar", "Olahraga"], correctAnswer: "Hobi" },
        { question: "「たのしい」の意味は？", options: ["Sulit", "Membosankan", "Menyenangkan", "Mahal"], correctAnswer: "Menyenangkan" },
        { question: "「読む」はなんと読みますか？", options: ["かく", "みる", "よむ", "きく"], correctAnswer: "よむ" },
      ],
    },
    {
      title: "どうぶつ・しぜん — Hewan & Alam",
      explanation: "Pelajari nama-nama hewan dan alam sekitar.",
      sortOrder: 22,
      vocab: [
        { word: "いぬ", reading: "いぬ", meaningId: "anjing", exampleSentence: "いぬがいます。" },
        { word: "ねこ", reading: "ねこ", meaningId: "kucing", exampleSentence: "ねこはかわいいです。" },
        { word: "とり", reading: "とり", meaningId: "burung", exampleSentence: "そらにとりがいます。" },
        { word: "さかな", reading: "さかな", meaningId: "ikan", exampleSentence: "みずのなかにさかながいます。" },
        { word: "うし", reading: "うし", meaningId: "sapi", exampleSentence: "うしはのはらにいます。" },
        { word: "やま", reading: "やま", meaningId: "gunung", exampleSentence: "やまがみえます。" },
        { word: "かわ", reading: "かわ", meaningId: "sungai", exampleSentence: "かわでさかなをつります。" },
        { word: "うみ", reading: "うみ", meaningId: "laut", exampleSentence: "なつはうみへいきます。" },
        { word: "き", reading: "き", meaningId: "pohon", exampleSentence: "おおきいきのしたにいます。" },
        { word: "はな", reading: "はな", meaningId: "bunga", exampleSentence: "はるになるとはながさきます。" },
      ],
      kanji: [
        { character: "犬", onyomi: "ケン", kunyomi: "いぬ", meaningId: "anjing" },
        { character: "虫", onyomi: "チュウ", kunyomi: "むし", meaningId: "serangga" },
        { character: "海", onyomi: "カイ", kunyomi: "うみ", meaningId: "laut" },
        { character: "森", onyomi: "シン", kunyomi: "もり", meaningId: "hutan" },
      ],
      grammar: [
        { pattern: "〜がいます", explanation: "Menyatakan ada makhluk hidup di suatu tempat.", exampleSentence: "こうえんにいぬがいます。" },
        { pattern: "〜があります", explanation: "Menyatakan ada benda mati di suatu tempat.", exampleSentence: "つくえのうえにほんがあります。" },
      ],
      quiz: [
        { question: "「いぬ」を漢字で書くと？", options: ["猫", "犬", "牛", "鳥"], correctAnswer: "犬" },
        { question: "生き物に使う存在動詞は？", options: ["あります", "います", "あります / います どちらでも", "です"], correctAnswer: "います" },
        { question: "「うみ」の意味は？", options: ["Gunung", "Sungai", "Laut", "Hutan"], correctAnswer: "Laut" },
      ],
    },
    {
      title: "きもち — Perasaan & Emosi",
      explanation: "Pelajari cara mengungkapkan perasaan dan keadaan diri sendiri.",
      sortOrder: 23,
      vocab: [
        { word: "うれしい", reading: "うれしい", meaningId: "senang / bahagia", exampleSentence: "プレゼントをもらってうれしいです。" },
        { word: "たのしい", reading: "たのしい", meaningId: "menyenangkan", exampleSentence: "パーティーはたのしかったです。" },
        { word: "かなしい", reading: "かなしい", meaningId: "sedih", exampleSentence: "かなしいえいがをみました。" },
        { word: "こわい", reading: "こわい", meaningId: "takut / menakutkan", exampleSentence: "このえいがはこわいです。" },
        { word: "びっくりします", reading: "びっくりします", meaningId: "terkejut", exampleSentence: "とつぜんびっくりしました！" },
        { word: "つかれた", reading: "つかれた", meaningId: "lelah / capek", exampleSentence: "しごとでつかれました。" },
        { word: "ねむい", reading: "ねむい", meaningId: "mengantuk", exampleSentence: "ねむくてねられません。" },
        { word: "げんき", reading: "げんき", meaningId: "sehat / bersemangat", exampleSentence: "いつもげんきです！" },
        { word: "しんぱい", reading: "しんぱい", meaningId: "khawatir", exampleSentence: "しんぱいしないでください。" },
        { word: "〜と思います", reading: "〜とおもいます", meaningId: "saya pikir ~", exampleSentence: "いいとおもいます。" },
      ],
      kanji: [
        { character: "思", onyomi: "シ", kunyomi: "おも(う)", meaningId: "berpikir" },
        { character: "気", onyomi: "キ", kunyomi: "-", meaningId: "semangat, perasaan" },
        { character: "友", onyomi: "ユウ", kunyomi: "とも", meaningId: "teman" },
        { character: "声", onyomi: "セイ", kunyomi: "こえ", meaningId: "suara" },
      ],
      grammar: [
        { pattern: "〜と思います", explanation: "Menyatakan pendapat: 'Saya pikir / rasa ~'.", exampleSentence: "かれはやさしいとおもいます。" },
        { pattern: "〜そうです", explanation: "Menyatakan perkiraan dari penampilan: 'Kelihatannya ~'.", exampleSentence: "おいしそうですね！" },
      ],
      quiz: [
        { question: "「うれしい」の意味は？", options: ["Sedih", "Marah", "Senang/Bahagia", "Takut"], correctAnswer: "Senang/Bahagia" },
        { question: "「しんぱいしないでください」の意味は？", options: ["Tolong jangan khawatir", "Tolong khawatir", "Jangan takut", "Jangan sedih"], correctAnswer: "Tolong jangan khawatir" },
        { question: "「思う」はなんと読みますか？", options: ["かんがえる", "おもう", "きく", "みる"], correctAnswer: "おもう" },
      ],
    },
    {
      title: "どうし① — Kata Kerja Dasar",
      explanation: "Pelajari kata kerja-kata kerja penting N5 dan pola kalimat dasarnya.",
      sortOrder: 24,
      vocab: [
        { word: "します", reading: "します", meaningId: "melakukan", exampleSentence: "べんきょうをします。" },
        { word: "あります", reading: "あります", meaningId: "ada (benda mati)", exampleSentence: "つくえのうえにほんがあります。" },
        { word: "います", reading: "います", meaningId: "ada (makhluk hidup)", exampleSentence: "へやにねこがいます。" },
        { word: "わかります", reading: "わかります", meaningId: "mengerti", exampleSentence: "にほんごがすこしわかります。" },
        { word: "もちます", reading: "もちます", meaningId: "memegang / membawa", exampleSentence: "かばんをもっています。" },
        { word: "あけます", reading: "あけます", meaningId: "membuka", exampleSentence: "まどをあけてください。" },
        { word: "しめます", reading: "しめます", meaningId: "menutup", exampleSentence: "ドアをしめてください。" },
        { word: "つけます", reading: "つけます", meaningId: "menyalakan", exampleSentence: "でんきをつけます。" },
        { word: "けします", reading: "けします", meaningId: "mematikan / menghapus", exampleSentence: "でんきをけしてください。" },
        { word: "かします", reading: "かします", meaningId: "meminjamkan", exampleSentence: "えんぴつをかしてください。" },
      ],
      kanji: [
        { character: "出", onyomi: "シュツ", kunyomi: "で(る)", meaningId: "keluar" },
        { character: "入", onyomi: "ニュウ", kunyomi: "はい(る)", meaningId: "masuk" },
        { character: "立", onyomi: "リツ", kunyomi: "た(つ)", meaningId: "berdiri" },
        { character: "力", onyomi: "リョク", kunyomi: "ちから", meaningId: "kekuatan" },
      ],
      grammar: [
        { pattern: "〜てください", explanation: "Meminta seseorang melakukan sesuatu dengan sopan.", exampleSentence: "ここになまえをかいてください。" },
        { pattern: "〜てもいいですか", explanation: "Meminta izin melakukan sesuatu.", exampleSentence: "トイレにいってもいいですか？" },
      ],
      quiz: [
        { question: "「あります」と「います」の違いは？", options: ["Tidak ada bedanya", "あります=benda mati, います=makhluk hidup", "います=benda mati, あります=makhluk hidup", "あります=formal, います=informal"], correctAnswer: "あります=benda mati, います=makhluk hidup" },
        { question: "「でんきをつけます」の意味は？", options: ["Mematikan lampu", "Menyalakan lampu", "Membeli lampu", "Mengganti lampu"], correctAnswer: "Menyalakan lampu" },
        { question: "「〜てください」の意味は？", options: ["Bolehkah saya ~?", "Saya tidak mau ~", "Tolong lakukan ~", "Saya sedang ~"], correctAnswer: "Tolong lakukan ~" },
      ],
    },
    {
      title: "けいようし — Kata Sifat",
      explanation: "Pelajari kata sifat-i dan kata sifat-na, serta cara menggunakannya dalam kalimat.",
      sortOrder: 25,
      vocab: [
        { word: "あたらしい", reading: "あたらしい", meaningId: "baru", exampleSentence: "あたらしいくつをかいました。" },
        { word: "ふるい", reading: "ふるい", meaningId: "lama / tua", exampleSentence: "このほんはふるいです。" },
        { word: "おもい", reading: "おもい", meaningId: "berat", exampleSentence: "このにもつはおもいです。" },
        { word: "かるい", reading: "かるい", meaningId: "ringan", exampleSentence: "このかばんはかるいです。" },
        { word: "むずかしい", reading: "むずかしい", meaningId: "sulit", exampleSentence: "かんじはむずかしいです。" },
        { word: "やさしい", reading: "やさしい", meaningId: "mudah / ramah", exampleSentence: "このもんだいはやさしいです。" },
        { word: "きれいな", reading: "きれいな", meaningId: "cantik / bersih (kata sifat-na)", exampleSentence: "きれいなはなですね。" },
        { word: "しずかな", reading: "しずかな", meaningId: "tenang / sepi (kata sifat-na)", exampleSentence: "このへやはしずかです。" },
        { word: "にぎやかな", reading: "にぎやかな", meaningId: "ramai / meriah (kata sifat-na)", exampleSentence: "あのまちはにぎやかです。" },
        { word: "べんりな", reading: "べんりな", meaningId: "praktis / nyaman (kata sifat-na)", exampleSentence: "このアプリはべんりです。" },
      ],
      kanji: [
        { character: "話", onyomi: "ワ", kunyomi: "はな(す)", meaningId: "bicara, cerita" },
        { character: "文", onyomi: "ブン", kunyomi: "ふみ", meaningId: "tulisan, kalimat" },
        { character: "字", onyomi: "ジ", kunyomi: "じ", meaningId: "huruf, karakter" },
        { character: "門", onyomi: "モン", kunyomi: "かど", meaningId: "gerbang" },
      ],
      grammar: [
        { pattern: "〜くない / 〜じゃない", explanation: "Bentuk negatif kata sifat: -i→くない, -na→じゃない.", exampleSentence: "むずかしくないです。きれいじゃないです。" },
        { pattern: "〜くて / 〜で", explanation: "Menggabungkan dua kata sifat: -i→くて, -na→で.", exampleSentence: "あたらしくてきれいなへやです。" },
      ],
      quiz: [
        { question: "「むずかしい」の反対は？", options: ["ふるい", "おもい", "やさしい", "くらい"], correctAnswer: "やさしい" },
        { question: "「きれい」は何形容詞？", options: ["い形容詞", "な形容詞", "どちらでもない", "動詞"], correctAnswer: "な形容詞" },
        { question: "「新しい」はなんと読みますか？", options: ["ふるい", "あたらしい", "あたらしい", "たかい"], correctAnswer: "あたらしい" },
      ],
    },
  ];

  for (const ch of n5Chapters) {
    if (await db.chapter.findFirst({ where: { levelId: 2, title: ch.title } })) continue;
    await db.chapter.create({
      data: {
        levelId: 2,
        title: ch.title,
        explanation: ch.explanation,
        sortOrder: ch.sortOrder,
        status: "published",
        createdById: admin.id,
        approvedById: admin.id,
        publishedAt: new Date(),
        vocabularies: { create: ch.vocab },
        kanji: { create: ch.kanji },
        grammarPoints: { create: ch.grammar },
        quizQuestions: {
          create: ch.quiz.map((q) => ({
            type: "pilihan_ganda" as const,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
          })),
        },
      },
    });
  }

  // Soal tes penempatan N5 (untuk masuk ke N4 ke atas).
  // Disimpan di chapter draft agar tidak muncul di browser belajar.
  if (!(await db.chapter.findFirst({ where: { levelId: 2, title: "Tes Penempatan N5" } }))) {
    await db.chapter.create({
      data: {
        levelId: 2,
        title: "Tes Penempatan N5",
        explanation: "Soal internal untuk tes penempatan. Tidak ditampilkan ke pengguna.",
        sortOrder: 999,
        status: "draft",
        createdById: admin.id,
        quizQuestions: {
          create: [
            { type: "pilihan_ganda", question: "「わたし」の意味は？", options: ["saya", "kamu", "dia", "mereka"], correctAnswer: "saya" },
            { type: "pilihan_ganda", question: "「ありがとうございます」の意味は？", options: ["Selamat pagi", "Permisi", "Terima kasih", "Maaf"], correctAnswer: "Terima kasih" },
            { type: "pilihan_ganda", question: "「おはようございます」はいつ使いますか？", options: ["Malam hari", "Siang hari", "Pagi hari", "Sore hari"], correctAnswer: "Pagi hari" },
            { type: "pilihan_ganda", question: "「水」はなんと読みますか？", options: ["ひ", "みず", "かぜ", "つち"], correctAnswer: "みず" },
            { type: "pilihan_ganda", question: "「いくらですか」の意味は？", options: ["Di mana ini?", "Apa ini?", "Berapa harganya?", "Kapan?"], correctAnswer: "Berapa harganya?" },
            { type: "pilihan_ganda", question: "わたし＿＿＿がくせいです。", options: ["は", "を", "で", "の"], correctAnswer: "は" },
            { type: "pilihan_ganda", question: "としょかん＿＿＿ほんをよみます。（Di perpustakaan membaca buku）", options: ["に", "で", "を", "が"], correctAnswer: "で" },
            { type: "pilihan_ganda", question: "がっこう＿＿＿いきます。（Pergi ke sekolah）", options: ["を", "が", "に", "で"], correctAnswer: "に" },
            { type: "pilihan_ganda", question: "これ＿＿＿なんですか。", options: ["は", "に", "で", "を"], correctAnswer: "は" },
            { type: "pilihan_ganda", question: "わたしはりんご＿＿＿たべます。（Saya makan apel）", options: ["は", "を", "に", "が"], correctAnswer: "を" },
            { type: "pilihan_ganda", question: "「さんじ」を漢字で書くと？", options: ["2時", "3時", "4時", "5時"], correctAnswer: "3時" },
            { type: "pilihan_ganda", question: "「ひゃく」はいくつですか？", options: ["10", "100", "1000", "10000"], correctAnswer: "100" },
            { type: "pilihan_ganda", question: "「たかい」（mahal）の反対は？", options: ["おもい", "やすい", "ひろい", "ちいさい"], correctAnswer: "やすい" },
            { type: "pilihan_ganda", question: "「みます」の意味は？", options: ["Makan", "Minum", "Tidur", "Melihat"], correctAnswer: "Melihat" },
            { type: "pilihan_ganda", question: "「おおきい」の意味は？", options: ["Kecil", "Besar", "Pendek", "Panjang"], correctAnswer: "Besar" },
            { type: "pilihan_ganda", question: "「山」はなんと読みますか？", options: ["かわ", "やま", "うみ", "そら"], correctAnswer: "やま" },
            { type: "pilihan_ganda", question: "「月曜日」は何の日ですか？", options: ["Selasa", "Rabu", "Senin", "Kamis"], correctAnswer: "Senin" },
            { type: "pilihan_ganda", question: "「一週間」は何日ですか？", options: ["5日", "7日", "10日", "30日"], correctAnswer: "7日" },
            { type: "pilihan_ganda", question: "「〜がすきです」の意味は？", options: ["Tidak suka ~", "Suka ~", "~ itu bagus", "~ itu ada"], correctAnswer: "Suka ~" },
            { type: "pilihan_ganda", question: "ここにえんぴつが＿＿＿。（Ada pensil di sini）", options: ["あります", "います", "です", "します"], correctAnswer: "あります" },
          ],
        },
      },
    });
  }

  if (!(await db.scenario.findFirst())) {
    await db.scenario.create({
      data: {
        levelId: 2,
        title: "Belanja di konbini",
        goal: "Membeli onigiri dan minuman, lalu membayar.",
        mascotRole: "kasir konbini yang ramah",
        status: "published",
        createdById: admin.id,
      },
    });
  }

  const achievements = [
    { code: "first_chat", name: "Obrolan pertama", description: "Menyelesaikan sesi ngobrol pertama dengan maskot." },
    { code: "hiragana_master", name: "Hafal Hiragana", description: "Menyelesaikan semua latihan hiragana." },
    { code: "streak_7", name: "Seminggu penuh", description: "Belajar 7 hari berturut-turut." },
  ];
  for (const a of achievements) await db.achievement.upsert({ where: { code: a.code }, create: a, update: a });

  // ── Level exam configurations ──
  const levelExamConfigs = [
    // Placement tests
    { levelId: 2, type: "placement" as const, questionCount: 20, timeLimitMin: 15, passScore: 70, sectionMinScore: 50, cooldownHours: 0, minChapterCompletion: 0 },
    { levelId: 3, type: "placement" as const, questionCount: 20, timeLimitMin: 15, passScore: 70, sectionMinScore: 50, cooldownHours: 0, minChapterCompletion: 0 },
    { levelId: 4, type: "placement" as const, questionCount: 20, timeLimitMin: 15, passScore: 70, sectionMinScore: 50, cooldownHours: 0, minChapterCompletion: 0 },
    // Level-up tests
    { levelId: 2, type: "level_up" as const, questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
    { levelId: 3, type: "level_up" as const, questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
    { levelId: 4, type: "level_up" as const, questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
    { levelId: 5, type: "level_up" as const, questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
  ];
  for (const cfg of levelExamConfigs) {
    await db.levelExam.upsert({
      where: { levelId_type: { levelId: cfg.levelId, type: cfg.type } },
      update: {},
      create: cfg,
    });
  }

  console.info("Seed selesai. Akun Admin: admin@nihongo.local / Admin12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
