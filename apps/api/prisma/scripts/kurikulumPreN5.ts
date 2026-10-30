/**
 * Level Pre-N5 (Pemula): 10 sesi hiragana, modul fonetik, dan 100 kosakata kana murni — tanpa tata bahasa.
 * Sumber: spesifikasi "Modul Implementasi Pre-N5" (docs). Soal dibangkitkan dari data per sesi secara
 * deterministik (pengecoh diambil dari huruf/kata yang sudah dipelajari), jadi impor ulang menghasilkan soal sama.
 */
import type { KBlock, KChapter, KQuiz, KVocab } from "./kurikulumData";

/** Nilai lulus kuis setiap bab Pre-N5. */
const PASS_SCORE = 90;

const MODULE_1 = "Tahap 1 · Hiragana Dasar & Fonetik Audio";
const MODULE_2 = "Tahap 2 · Hiragana Lengkap & Kosakata Kana";
const MODULE_3 = "Tahap 3 · Penguasaan Kana & Telinga Jepang";
const MODULE_VOCAB = "100 Kosakata Kana";

/** [huruf, romaji, mnemonik] */
type Kana = [string, string, string];
/** [kata kana, romaji, arti] */
type Word = [string, string, string];

const S1: Kana[] = [
  ["あ", "a", "Antena bersilang dengan perut bulat, seperti orang berseru \"Aa!\""],
  ["い", "i", "Dua garis berdiri berdampingan seperti dua ekor ikan belut."],
  ["う", "u", "Orang membungkuk memegangi perut sambil mengeluh \"Uu…\""],
  ["え", "e", "Burung elang berjambul yang sedang menukik."],
  ["お", "o", "Mirip あ dengan titik di kanan atas, seperti orang terkejut \"Oh!\""],
];
const S2: Kana[] = [
  ["か", "ka", "Orang mengayunkan kapak, percikannya terbang ke samping: \"Ka!\""],
  ["き", "ki", "Anak kunci dengan dua gerigi mendatar."],
  ["く", "ku", "Paruh burung yang terbuka berbunyi \"kuk-kuk\"."],
  ["け", "ke", "Kendi yang berdiri di samping tiang."],
  ["こ", "ko", "Dua keping koin yang bertumpuk."],
];
const S3: Kana[] = [
  ["さ", "sa", "Sapu terbalik dengan gagang menyilang."],
  ["し", "shi", "Kail pancing panjang yang menunggu ikan."],
  ["す", "su", "Tali ayunan bersimpul di tengah, siap berayun: \"swing\"."],
  ["せ", "se", "Mulut terbuka lebar memperlihatkan gigi: \"se-nyum!\""],
  ["そ", "so", "Sungai yang berkelok zig-zag turun ke bawah."],
];
const S4: Kana[] = [
  ["た", "ta", "Huruf t dan a kecil yang duduk berdampingan: \"ta\"."],
  ["ち", "chi", "Wajah ceria yang mengangkat dagu: \"cheese!\""],
  ["つ", "tsu", "Satu gelombang tsunami yang melengkung."],
  ["て", "te", "Tangan (te) yang terulur ke depan."],
  ["と", "to", "Duri kecil yang menancap di jari kaki (toe)."],
];
const S5: Kana[] = [
  ["な", "na", "Orang berlutut berdoa di samping salib: \"na-masté\"."],
  ["に", "ni", "Tiang dan dua garis seperti lutut (knee) yang ditekuk."],
  ["ぬ", "nu", "Mi (noodle) yang kusut di sumpit, ujungnya menggulung."],
  ["ね", "ne", "Mirip ぬ, tapi ekornya melingkar seperti ekor kucing (ねこ)."],
  ["の", "no", "Satu lingkaran seperti tanda larangan: \"No!\""],
];
const S6: Kana[] = [
  ["は", "ha", "Orang tertawa \"ha-ha\" di samping tiang. Sebagai partikel dibaca \"wa\"."],
  ["ひ", "hi", "Senyum lebar orang terkikik \"hi-hi\"."],
  ["ふ", "fu", "Gunung Fuji yang dikelilingi awan."],
  ["へ", "he", "Atap rumah atau bukit kecil. Sebagai partikel arah dibaca \"e\"."],
  ["ほ", "ho", "Mirip は dengan garis tambahan, tertawa lebih keras: \"ho-ho\"."],
];
const S7: Kana[] = [
  ["ま", "ma", "Mama yang menggendong bayi di bawahnya."],
  ["み", "mi", "Angka 21 yang ditulis bersambung."],
  ["む", "mu", "Sapi bertanduk yang melenguh \"muu\"."],
  ["め", "me", "Mata (め) dengan bulu mata panjang; mirip ぬ tanpa ekor."],
  ["も", "mo", "Kail dengan dua umpan: mau ikan lebih banyak (more)."],
];
const S8: Kana[] = [
  ["や", "ya", "Yak (sapi gunung) dengan tanduk menjulang."],
  ["ゆ", "yu", "Ikan hiu (ikan yu) yang berenang memutar."],
  ["よ", "yo", "Orang ber-yoga dengan satu kaki ditekuk."],
  ["ら", "ra", "Rapper bertopi yang sedang membungkuk."],
  ["り", "ri", "Dua aliran sungai (river) yang sejajar."],
  ["る", "ru", "Jalan berkelok yang ujungnya menggulung seperti bundaran (route)."],
  ["れ", "re", "Orang berlutut mengulurkan tangan sambil beristirahat (rest)."],
  ["ろ", "ro", "Mirip る tanpa gulungan, seperti jalan (road) berkelok."],
  ["わ", "wa", "Mirip ね tanpa ekor, seperti air (water) yang mengalir."],
  ["を", "wo", "Orang yang tersandung \"wo-ah!\". Partikel objek, diucapkan \"o\"."],
  ["ん", "n", "Seperti huruf n kecil yang ditulis bersambung."],
];
const S9: Kana[] = [
  ["が", "ga", "か + ゛"], ["ぎ", "gi", "き + ゛"], ["ぐ", "gu", "く + ゛"], ["げ", "ge", "け + ゛"], ["ご", "go", "こ + ゛"],
  ["ざ", "za", "さ + ゛"], ["じ", "ji", "し + ゛"], ["ず", "zu", "す + ゛"], ["ぜ", "ze", "せ + ゛"], ["ぞ", "zo", "そ + ゛"],
  ["だ", "da", "た + ゛"], ["ぢ", "ji", "ち + ゛ (jarang; bunyinya sama dengan じ)"], ["づ", "zu", "つ + ゛ (jarang; bunyinya sama dengan ず)"], ["で", "de", "て + ゛"], ["ど", "do", "と + ゛"],
  ["ば", "ba", "は + ゛"], ["び", "bi", "ひ + ゛"], ["ぶ", "bu", "ふ + ゛"], ["べ", "be", "へ + ゛"], ["ぼ", "bo", "ほ + ゛"],
  ["ぱ", "pa", "は + ゜"], ["ぴ", "pi", "ひ + ゜"], ["ぷ", "pu", "ふ + ゜"], ["ぺ", "pe", "へ + ゜"], ["ぽ", "po", "ほ + ゜"],
];
const YOON_ROWS: [string, string][] = [
  ["き", "ky"], ["し", "sh"], ["ち", "ch"], ["に", "ny"], ["ひ", "hy"], ["み", "my"], ["り", "ry"],
  ["ぎ", "gy"], ["じ", "j"], ["び", "by"], ["ぴ", "py"], ["ぢ", "j"],
];
const S10: Kana[] = YOON_ROWS.flatMap(([base, c]) =>
  (["ゃ", "ゅ", "ょ"] as const).map((small, i): Kana => [base + small, c + ["a", "u", "o"][i], `${base} + ${small} kecil, diucapkan satu ketukan${base === "ぢ" ? " (jarang dipakai)" : ""}`]),
);

/** Huruf yang dipelajari sampai sesi tertentu (kumulatif), untuk pengecoh soal. */
const LEARNED = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10];
const learnedUpTo = (n: number) => LEARNED.slice(0, n).flat();

/** Pilih `count` pengecoh berbeda dari kandidat, mulai dari posisi `seed` (deterministik). */
function distractors(answer: string, candidates: string[], count: number, seed: number): string[] {
  const pool = [...new Set(candidates.filter((c) => c !== answer))];
  const out: string[] = [];
  for (let i = 0; out.length < Math.min(count, pool.length); i++) out.push(pool[(seed * 7 + i * 3) % pool.length]);
  return [...new Set(out)];
}

/** Sisipkan jawaban di posisi yang berganti-ganti agar tidak selalu di depan. */
function withAnswer(answer: string, others: string[], seed: number): string[] {
  const opts = [...others];
  opts.splice(seed % (opts.length + 1), 0, answer);
  return opts;
}

const SMALL_KANA = /[ゃゅょっ]/;
const huruf = (rows: Kana[]): KBlock => ({ type: "huruf", title: "Kenali hurufnya", body: rows.map(([c, r, m]) => `${c} | ${r} | ${m}`).join("\n") });
const kanaCards = (rows: Kana[], script = "hiragana"): KVocab[] => rows.map(([c, r, m]) => [c, c, `Dibaca "${r}" (${script})`, undefined, m]);
const words = (rows: Word[]): KVocab[] => rows.map(([w, r, arti]) => [w, w, arti, undefined, `Dibaca: ${r}`]);

function sessionQuiz(n: number, rows: Kana[], sessionWords: Word[]): KQuiz[] {
  const pool = learnedUpTo(n).filter(([c]) => c !== "ぢ" && c !== "づ");
  const usable = rows.filter(([c]) => c !== "ぢ" && c !== "づ");
  const pick = usable.length <= 5 ? usable : usable.filter((_, i) => i % Math.ceil(usable.length / 5) === 0).slice(0, 5);
  const romajiPool = pool.map(([, r]) => r);
  const charPool = pool.map(([c]) => c);
  const quiz: KQuiz[] = [];

  pick.slice(0, 4).forEach(([c, r], i) => {
    quiz.push({ type: "pilihan_ganda", question: `Huruf ${c} dibaca…`, options: withAnswer(r, distractors(r, romajiPool, 3, n + i), n + i), answer: r });
  });
  pick.slice(0, 2).forEach(([c, r], i) => {
    quiz.push({
      type: "mendengar",
      audio: c,
      question: "Huruf mana yang kamu dengar?",
      options: withAnswer(c, distractors(c, charPool, 3, n * 2 + i), n * 2 + i),
      answer: c,
    });
  });
  // Menulis tangan: huruf dasar dan bertenten (yōon kecil sulit dikenali dari tulisan tangan)
  if (!SMALL_KANA.test(pick.map(([c]) => c).join(""))) {
    pick.slice(-2).forEach(([c, r]) => quiz.push({ type: "menulis", question: r, answer: c, hint: `Tulis hiragana untuk "${r}"` }));
  }
  sessionWords.forEach(([w, r, arti], i) => {
    const pieces = w.match(/.[ゃゅょ]?/gu) ?? [...w];
    quiz.push({ type: "susun_huruf", question: r, pieces, extras: distractors(pieces[0], charPool, 1, n + i), hint: arti });
  });
  const [w0, , a0] = sessionWords[0];
  quiz.push({
    type: "pilihan_ganda",
    question: `${w0} artinya…`,
    options: withAnswer(a0, distractors(a0, ALL_WORD_MEANINGS, 3, n), n + 1),
    answer: a0,
  });
  const [w1, r1, a1] = sessionWords[sessionWords.length - 1];
  quiz.push({ type: "berbicara", answer: w1, question: `Ucapkan: ${r1} (${a1})` });
  return quiz;
}

// ───────────── 100 kosakata kana (bagian 4 spesifikasi) ─────────────

const V_BENDA: Word[] = [
  ["ねこ", "neko", "Kucing"], ["いぬ", "inu", "Anjing"], ["ほん", "hon", "Buku"], ["みず", "mizu", "Air"], ["さくら", "sakura", "Bunga sakura"],
  ["はな", "hana", "Bunga / hidung"], ["さかな", "sakana", "Ikan"], ["いえ", "ie", "Rumah"], ["まち", "machi", "Kota"], ["やま", "yama", "Gunung"],
  ["かわ", "kawa", "Sungai"], ["そら", "sora", "Langit"], ["あめ", "ame", "Hujan / permen"], ["くるま", "kuruma", "Mobil"], ["でんしゃ", "densha", "Kereta api"],
  ["えき", "eki", "Stasiun"], ["つくえ", "tsukue", "Meja"], ["いす", "isu", "Kursi"], ["かぎ", "kagi", "Kunci"], ["まど", "mado", "Jendela"],
  ["ともだち", "tomodachi", "Teman"], ["せんせい", "sensei", "Guru"], ["がくせい", "gakusei", "Siswa / mahasiswa"], ["かぞく", "kazoku", "Keluarga"], ["て", "te", "Tangan"],
  ["め", "me", "Mata"], ["くち", "kuchi", "Mulut"], ["みみ", "mimi", "Telinga"], ["おかね", "okane", "Uang"], ["たべもの", "tabemono", "Makanan"],
];
const V_WAKTU: Word[] = [
  ["いち", "ichi", "Satu (1)"], ["に", "ni", "Dua (2)"], ["さん", "san", "Tiga (3)"], ["よん", "yon", "Empat (4), juga dibaca し (shi)"], ["ご", "go", "Lima (5)"],
  ["ろく", "roku", "Enam (6)"], ["なな", "nana", "Tujuh (7), juga dibaca しち (shichi)"], ["はち", "hachi", "Delapan (8)"], ["きゅう", "kyuu", "Sembilan (9), juga dibaca く (ku)"], ["じゅう", "juu", "Sepuluh (10)"],
  ["ひゃく", "hyaku", "Seratus (100)"], ["せん", "sen", "Seribu (1.000)"], ["まん", "man", "Sepuluh ribu (10.000)"], ["いま", "ima", "Sekarang"], ["きょう", "kyou", "Hari ini"],
  ["あした", "ashita", "Besok"], ["きのう", "kinou", "Kemarin"], ["あさ", "asa", "Pagi"], ["ひる", "hiru", "Siang"], ["よる", "yoru", "Malam"],
];
const V_SIFAT: Word[] = [
  ["あかい", "akai", "Merah"], ["あおい", "aoi", "Biru"], ["しろい", "shiroi", "Putih"], ["くろい", "kuroi", "Hitam"], ["きいろい", "kiiroi", "Kuning"],
  ["おおきい", "ookii", "Besar"], ["ちいさい", "chiisai", "Kecil"], ["たかい", "takai", "Tinggi / mahal"], ["ひくい", "hikui", "Rendah"], ["やすい", "yasui", "Murah"],
  ["あたらしい", "atarashii", "Baru"], ["ふるい", "furui", "Lama / tua (benda)"], ["いい", "ii", "Bagus / baik, juga よい (yoi)"], ["わるい", "warui", "Buruk / jahat"], ["あつい", "atsui", "Panas"],
  ["つめたい", "tsumetai", "Dingin (benda)"], ["すずしい", "suzushii", "Sejuk"], ["むずかしい", "muzukashii", "Sulit"], ["やさしい", "yasashii", "Mudah / ramah"], ["たのしい", "tanoshii", "Menyenangkan"],
];
const V_KERJA: Word[] = [
  ["たべる", "taberu", "Makan"], ["のむ", "nomu", "Minum"], ["みる", "miru", "Melihat / menonton"], ["きく", "kiku", "Mendengar / bertanya"], ["かく", "kaku", "Menulis"],
  ["よむ", "yomu", "Membaca"], ["いく", "iku", "Pergi"], ["くる", "kuru", "Datang"], ["かえる", "kaeru", "Pulang"], ["ならう", "narau", "Belajar (dari seseorang)"],
  ["はなす", "hanasu", "Berbicara"], ["ねる", "neru", "Tidur"], ["おきる", "okiru", "Bangun tidur"], ["かう", "kau", "Membeli"], ["あう", "au", "Bertemu"],
];
const V_SALAM: Word[] = [
  ["おはよう", "ohayou", "Selamat pagi (santai)"], ["こんにちは", "konnichiwa", "Selamat siang / halo"], ["こんばんは", "konbanwa", "Selamat malam"], ["ありがとう", "arigatou", "Terima kasih"], ["すみません", "sumimasen", "Maaf / permisi"],
  ["さようなら", "sayounara", "Selamat tinggal"], ["じゃあね", "jaa ne", "Sampai jumpa (santai)"], ["はい", "hai", "Ya / hadir"], ["いいえ", "iie", "Tidak"], ["おねがいします", "onegaishimasu", "Tolong / mohon"],
  ["わかりました", "wakarimashita", "Saya paham"], ["わかりません", "wakarimasen", "Saya tidak paham"], ["だいじょうぶ", "daijoubu", "Tidak apa-apa / aman"], ["はじめまして", "hajimemashite", "Salam kenal"], ["どうぞ", "douzo", "Silakan"],
];
const ALL_WORDS = [...V_BENDA, ...V_WAKTU, ...V_SIFAT, ...V_KERJA, ...V_SALAM];
const ALL_WORD_MEANINGS = ALL_WORDS.map(([, , a]) => a);

function vocabQuiz(list: Word[], seed: number): KQuiz[] {
  const kana = list.map(([w]) => w);
  const meanings = list.map(([, , a]) => a);
  const step = Math.max(1, Math.floor(list.length / 4));
  const at = (k: number) => list[(k * step + seed) % list.length];
  const quiz: KQuiz[] = [];
  for (let k = 0; k < 4; k++) {
    const [w, , a] = at(k);
    quiz.push({ type: "pilihan_ganda", question: `${w} artinya…`, options: withAnswer(a, distractors(a, meanings, 3, seed + k), seed + k), answer: a });
  }
  for (let k = 4; k < 7; k++) {
    const [w] = at(k);
    quiz.push({ type: "mendengar", audio: w, question: "Kata mana yang kamu dengar?", options: withAnswer(w, distractors(w, kana, 3, seed + k), seed + k), answer: w });
  }
  const writable = list.filter(([w]) => !SMALL_KANA.test(w) && [...w].length <= 5);
  for (let k = 0; k < 2; k++) {
    const [w, r, a] = writable[(k * 5 + seed) % writable.length];
    quiz.push({ type: "menulis", question: r, answer: w, hint: a });
  }
  for (let k = 7; k < 9; k++) {
    const [w, r, a] = at(k);
    const pieces = w.match(/.[ゃゅょ]?/gu) ?? [...w];
    quiz.push({ type: "susun_huruf", question: r, pieces, extras: distractors(pieces[0], kana.join("").split(""), 1, seed + k), hint: a });
  }
  const [w, r, a] = at(9);
  quiz.push({ type: "berbicara", answer: w, question: `Ucapkan: ${r} (${a})` });
  return quiz;
}

function session(n: number, module: string, title: string, rows: Kana[], sessionWords: Word[], extra: KBlock[] = []): KChapter {
  return {
    key: `pren5:sesi-${n}`,
    level: "PEMULA",
    module,
    passScore: PASS_SCORE,
    title,
    explanation: `Sesi ${n}: kenali bentuk dan bunyi ${rows.length} huruf, ingat lewat mnemonik, latih menulis, lalu uji refleksmu.`,
    blocks: [
      huruf(rows),
      ...extra,
      {
        type: "tips",
        title: "Latihan menulis",
        body: "Tulis setiap huruf 5 kali sambil mengucapkan bunyinya. Latih urutan goresan di menu Huruf, atau cetak lembarnya di Belajar → Tulis di Buku.",
      },
    ],
    vocab: [...kanaCards(rows), ...words(sessionWords)],
    kanji: [],
    grammar: [],
    quiz: sessionQuiz(n, rows, sessionWords),
  };
}

function vocabChapter(n: number, title: string, intro: string, list: Word[], seed: number): KChapter {
  return {
    key: `pren5:kosakata-${n}`,
    level: "PEMULA",
    module: MODULE_VOCAB,
    passScore: PASS_SCORE,
    title,
    explanation: intro,
    blocks: [
      {
        type: "tips",
        title: "Cara menghafal",
        body: "Dengarkan setiap kata, ucapkan ulang 3 kali, lalu tutup artinya dan coba ingat. Kata yang sering lupa akan muncul lagi di Flashcard (SRS).",
      },
    ],
    vocab: words(list),
    kanji: [],
    grammar: [],
    quiz: vocabQuiz(list, seed),
  };
}

export const KURIKULUM_PRE_N5: KChapter[] = [
  session(1, MODULE_1, "Sesi 1 · Vokal Dasar (あ行)", S1, [["あい", "ai", "Cinta"], ["いえ", "ie", "Rumah"], ["うえ", "ue", "Atas"]], [
    {
      type: "teks",
      title: "Lima vokal, lima bunyi",
      body: "Bahasa Jepang hanya punya 5 vokal: a, i, u, e, o — diucapkan pendek dan jelas seperti bahasa Indonesia.\n\nSemua huruf hiragana lain adalah konsonan + salah satu vokal ini. Kuasai lima huruf ini dulu, sisanya tinggal mengikuti polanya.",
    },
  ]),
  session(2, MODULE_1, "Sesi 2 · Baris K (か行)", S2, [["かき", "kaki", "Kesemek"], ["きく", "kiku", "Mendengar"], ["あかい", "akai", "Merah"]]),
  session(3, MODULE_1, "Sesi 3 · Baris S (さ行)", S3, [["あさ", "asa", "Pagi"], ["すし", "sushi", "Sushi"], ["おそい", "osoi", "Lambat"]], [
    { type: "tips", title: "Perhatikan", body: "し dibaca \"shi\", bukan \"si\". Bunyi lain di baris ini teratur: sa, su, se, so." },
  ]),
  session(4, MODULE_2, "Sesi 4 · Baris T (た行)", S4, [["たこ", "tako", "Gurita"], ["つくえ", "tsukue", "Meja"], ["て", "te", "Tangan"]], [
    { type: "tips", title: "Perhatikan", body: "ち dibaca \"chi\" dan つ dibaca \"tsu\". Ucapkan \"tsu\" dengan ujung lidah menempel di belakang gigi depan." },
  ]),
  session(5, MODULE_2, "Sesi 5 · Baris N (な行)", S5, [["なに", "nani", "Apa"], ["いぬ", "inu", "Anjing"], ["ねこ", "neko", "Kucing"]], [
    { type: "tips", title: "Pasangan mirip", body: "ぬ (nu) dan め (me): ぬ punya gulungan kecil di ujung, め tidak. ね (ne) dan れ (re) juga mirip — ね ujungnya menggulung." },
  ]),
  session(6, MODULE_2, "Sesi 6 · Baris H (は行)", S6, [["はな", "hana", "Bunga"], ["ひかり", "hikari", "Cahaya"], ["ほし", "hoshi", "Bintang"]], [
    { type: "tips", title: "Perhatikan", body: "ふ dibaca \"fu\" dengan bibir hampir tertutup, di antara bunyi \"hu\" dan \"fu\"." },
  ]),
  session(7, MODULE_2, "Sesi 7 · Baris M (ま行)", S7, [["まち", "machi", "Kota"], ["みず", "mizu", "Air"], ["め", "me", "Mata"]]),
  session(8, MODULE_3, "Sesi 8 · Baris Y, R, W & ん", S8, [["やま", "yama", "Gunung"], ["さくら", "sakura", "Bunga sakura"], ["ほん", "hon", "Buku"]], [
    {
      type: "teks",
      title: "Huruf istimewa",
      body: "Baris Y hanya punya 3 huruf: や, ゆ, よ. Baris W hanya わ dan を.\n\nを hanya dipakai sebagai partikel dan diucapkan \"o\". ん adalah satu-satunya huruf konsonan tanpa vokal, dan tetap dihitung satu ketukan.",
    },
  ]),
  session(9, MODULE_3, "Sesi 9 · Dakuon & Handakuon (゛゜)", S9, [["かぎ", "kagi", "Kunci"], ["まど", "mado", "Jendela"], ["さんぽ", "sanpo", "Jalan-jalan"]], [
    {
      type: "teks",
      title: "Tenten & maru",
      body: "Dua titik kecil (゛, tenten) membuat bunyi menjadi berat: か→が, さ→ざ, た→だ, は→ば.\n\nLingkaran kecil (゜, maru) hanya untuk baris H dan mengubahnya menjadi P: は→ぱ, ひ→ぴ.\n\nぢ dan づ jarang dipakai; bunyinya sama dengan じ dan ず.",
    },
  ]),
  session(10, MODULE_3, "Sesi 10 · Yōon & Sokuon (ゃゅょ・っ)", S10, [["きゃく", "kyaku", "Tamu"], ["きっぷ", "kippu", "Tiket"], ["がっこう", "gakkou", "Sekolah"]], [
    {
      type: "teks",
      title: "Huruf kecil",
      body: "ゃ ゅ ょ kecil digabung dengan huruf berakhiran -i dan diucapkan sebagai satu ketukan: き + ゃ = きゃ (kya), し + ゅ = しゅ (shu).\n\nっ kecil (sokuon) adalah jeda satu ketukan yang menggandakan konsonan berikutnya: きっぷ = ki-(jeda)-pu = kippu.",
    },
  ]),
  {
    key: "pren5:fonetik",
    level: "PEMULA",
    module: MODULE_3,
    passScore: PASS_SCORE,
    title: "Telinga Dulu: Vokal Panjang, Jeda & Bunyi Gabungan",
    explanation: "Melatih telinga membedakan ketukan (mora) yang mengubah arti kata: vokal panjang, っ kecil, dan bunyi gabungan.",
    blocks: [
      {
        type: "teks",
        title: "Mora: ketukan bahasa Jepang",
        body: "Bahasa Jepang diukur dengan ketukan yang sama panjang (mora). Setiap huruf hiragana besar = 1 ketukan; ん dan っ kecil juga 1 ketukan; huruf kecil ゃゅょ menempel pada huruf sebelumnya.\n\nTepuk tangan setiap ketukan saat mengucapkan kata: が・っ・こ・う = 4 tepukan.",
      },
      {
        type: "teks",
        title: "Vokal panjang (chōon)",
        body: "Memanjangkan vokal menambah satu ketukan dan bisa mengubah arti:\nお・じ・さ・ん (4 ketukan) = paman\nお・じ・い・さ・ん (5 ketukan) = kakek\nゆ・き (2 ketukan) = salju\nゆ・う・き (3 ketukan) = keberanian",
      },
      {
        type: "teks",
        title: "Konsonan rangkap (sokuon)",
        body: "っ kecil adalah jeda satu ketukan sebelum k, s, t, atau p:\nい・た (2 ketukan) = ada (lampau)\nい・っ・た (3 ketukan) = pergi (lampau)\nか・こ (2 ketukan) = masa lalu\nか・っ・こ (3 ketukan) = tanda kurung",
      },
      {
        type: "teks",
        title: "Bunyi gabungan (yōon)",
        body: "Huruf kecil ゃゅょ tidak menambah ketukan:\nきょ・う・し・つ (4 ketukan) = ruang kelas\nひゃ・く (2 ketukan) = seratus",
      },
      { type: "tips", body: "Saat mendengarkan, fokus pada panjang bunyinya, bukan hurufnya. Putar audio berulang kali dan tepuk tangan mengikuti ketukannya." },
    ],
    vocab: words([
      ["おじさん", "ojisan", "Paman"],
      ["おじいさん", "ojiisan", "Kakek"],
      ["ゆき", "yuki", "Salju"],
      ["ゆうき", "yuuki", "Keberanian"],
      ["いった", "itta", "Pergi (lampau)"],
      ["かっこ", "kakko", "Tanda kurung"],
      ["きょうしつ", "kyoushitsu", "Ruang kelas"],
      ["ひゃく", "hyaku", "Seratus"],
    ]),
    kanji: [],
    grammar: [],
    quiz: [
      { type: "mendengar", audio: "おじいさん", question: "Kata mana yang kamu dengar?", options: ["おじさん", "おじいさん"], answer: "おじいさん" },
      { type: "mendengar", audio: "おじさん", question: "Kata mana yang kamu dengar?", options: ["おじいさん", "おじさん"], answer: "おじさん" },
      { type: "mendengar", audio: "ゆうき", question: "Kata mana yang kamu dengar?", options: ["ゆき", "ゆうき"], answer: "ゆうき" },
      { type: "mendengar", audio: "いった", question: "Kata mana yang kamu dengar?", options: ["いた", "いった"], answer: "いった" },
      { type: "mendengar", audio: "かっこ", question: "Kata mana yang kamu dengar?", options: ["かこ", "かっこ"], answer: "かっこ" },
      { type: "mendengar", audio: "きょうしつ", question: "Kata mana yang kamu dengar?", options: ["きょうしつ", "きょしつ", "きようしつ"], answer: "きょうしつ" },
      { type: "pilihan_ganda", question: "Berapa ketukan (mora) kata がっこう?", options: ["3", "4", "5"], answer: "4", explanation: "が・っ・こ・う: っ kecil dan vokal panjang masing-masing satu ketukan." },
      { type: "pilihan_ganda", question: "Berapa ketukan (mora) kata ひゃく?", options: ["2", "3", "4"], answer: "2", explanation: "ひゃ・く: ゃ kecil menempel pada ひ, jadi tidak menambah ketukan." },
      { type: "pilihan_ganda", question: "おじいさん artinya…", options: ["Kakek", "Paman", "Kakak laki-laki"], answer: "Kakek" },
      { type: "susun_huruf", question: "kippu", pieces: ["き", "っ", "ぷ"], extras: ["つ"], hint: "Tiket — perhatikan つ besar vs っ kecil" },
      { type: "berbicara", answer: "がっこう", question: "Ucapkan: gakkou (sekolah) — beri jeda pada っ" },
      { type: "berbicara", answer: "おじいさん", question: "Ucapkan: ojiisan (kakek) — panjangkan \"ii\"" },
    ],
  },
  vocabChapter(1, "Kosakata Kana 1 · Benda, Alam & Sekitar", "30 kata benda sehari-hari: hewan, alam, rumah, sekolah, dan anggota tubuh.", V_BENDA, 0),
  vocabChapter(2, "Kosakata Kana 2 · Angka, Waktu & Hari", "Angka 1 sampai 10.000 dan kata waktu sehari-hari.", V_WAKTU, 1),
  vocabChapter(3, "Kosakata Kana 3 · Warna & Kondisi", "Kata sifat untuk warna, ukuran, harga, suhu, dan perasaan.", V_SIFAT, 2),
  vocabChapter(4, "Kosakata Kana 4 · Kata Kerja Aksi Dasar", "15 kata kerja paling dasar dalam bentuk kamus.", V_KERJA, 3),
  vocabChapter(5, "Kosakata Kana 5 · Salam & Ekspresi Kelas", "Salam harian dan ungkapan yang paling sering dipakai di kelas.", V_SALAM, 4),
];

/** Prompt Miu-chan untuk level Pre-N5 (zero-grammar drill). */
export const PRE_N5_AI = {
  maxSentenceWords: 7,
  furiganaRule: "full" as const,
  speechRate: 0.7,
  systemPrompt: [
    "Level Pre-N5 (pemula absolut, mode zero-grammar). Peranmu: partner tebak kata hiragana (Vocabulary Flash Drill) dan penerima salam (Aisatsu Listener).",
    "1. JANGAN menjelaskan aturan tata bahasa, konjugasi kata kerja, atau fungsi partikel.",
    "2. Bicara terutama dalam Bahasa Indonesia; setiap kata Jepang ditulis dalam hiragana pendek disertai romaji lengkap, mis. ねこ (neko).",
    "3. Jawaban sangat singkat: 1 kalimat, maksimal 7 kata.",
    "4. Sering memuji dengan ekspresi kucing (\"Nya~\") saat siswa menebak atau membaca dengan benar.",
    "5. Bila siswa salah membaca hiragana, cukup beri romaji yang benar dengan lembut, tanpa ceramah.",
    "Gunakan hanya kosakata kana dasar (salam, angka, benda sekitar, warna). Jangan memakai kanji.",
  ].join("\n"),
};
