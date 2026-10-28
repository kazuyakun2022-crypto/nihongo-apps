/** Konten level Pemula, ditulis khusus untuk aplikasi ini. Romaji dipakai di sini karena memang materi cara baca huruf. */
export interface PemulaChapter {
  key: string;
  kind: "kana" | "kata";
  title: string;
  explanation: string;
  vocab: { word: string; reading: string; meaningId: string; exampleSentence?: string }[];
}

/** "あa いi うu" → baris kana; reading = romaji, arti = keterangan baris. */
function kana(rows: string, note: string) {
  return rows
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [, word, reading] = pair.match(/^([^a-z]+)([a-z]+)$/) ?? [];
      return { word, reading, meaningId: `Dibaca "${reading}" (${note})` };
    });
}

export const PEMULA_CHAPTERS: PemulaChapter[] = [
  {
    key: "pemula:hiragana:1",
    kind: "kana",
    title: "Hiragana 1: あ – こ",
    explanation: "Hiragana adalah huruf dasar bahasa Jepang. Mulai dari lima vokal あいうえお, lalu baris か. Setiap huruf mewakili satu suku kata.",
    vocab: kana("あa いi うu えe おo かka きki くku けke こko", "hiragana"),
  },
  {
    key: "pemula:hiragana:2",
    kind: "kana",
    title: "Hiragana 2: さ – と",
    explanation: "Baris さ dan た. Perhatikan pengecualian: し dibaca shi, ち dibaca chi, dan つ dibaca tsu.",
    vocab: kana("さsa しshi すsu せse そso たta ちchi つtsu てte とto", "hiragana"),
  },
  {
    key: "pemula:hiragana:3",
    kind: "kana",
    title: "Hiragana 3: な – ほ",
    explanation: "Baris な dan は. Huruf ふ dibaca fu, di antara bunyi f dan h. Saat menjadi partikel, は dibaca wa.",
    vocab: kana("なna にni ぬnu ねne のno はha ひhi ふfu へhe ほho", "hiragana"),
  },
  {
    key: "pemula:hiragana:4",
    kind: "kana",
    title: "Hiragana 4: ま – ん",
    explanation: "Baris ま, や, ら, わ, dan huruf ん. Huruf を dipakai sebagai partikel objek dan dibaca o.",
    vocab: kana("まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をwo んn", "hiragana"),
  },
  {
    key: "pemula:hiragana:5",
    kind: "kana",
    title: "Hiragana 5: Dakuten & Handakuten",
    explanation: "Tanda ゛ (dakuten) membuat bunyi menjadi berat: か→が, さ→ざ, た→だ, は→ば. Tanda ゜ (handakuten) mengubah は menjadi ぱ.",
    vocab: kana("がga ぎgi ぐgu げge ごgo ざza じji ずzu ぜze ぞzo だda でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo", "hiragana bertanda"),
  },
  {
    key: "pemula:hiragana:6",
    kind: "kana",
    title: "Hiragana 6: Bunyi Gabungan (Yōon)",
    explanation: "Huruf kecil ゃ ゅ ょ digabung dengan huruf berakhiran i untuk membentuk satu suku kata, misalnya き＋ゃ＝きゃ (kya).",
    vocab: kana("きゃkya きゅkyu きょkyo しゃsha しゅshu しょsho ちゃcha ちゅchu ちょcho にゃnya りょryo ぎょgyo じゃja びょbyo ぴょpyo", "gabungan"),
  },
  {
    key: "pemula:katakana:1",
    kind: "kana",
    title: "Katakana 1: ア – ト",
    explanation: "Katakana dipakai untuk kata serapan asing dan nama. Bunyinya sama dengan hiragana, hanya bentuknya lebih kaku dan bersudut.",
    vocab: kana("アa イi ウu エe オo カka キki クku ケke コko サsa シshi スsu セse ソso タta チchi ツtsu テte トto", "katakana"),
  },
  {
    key: "pemula:katakana:2",
    kind: "kana",
    title: "Katakana 2: ナ – ン",
    explanation: "Sisa katakana dasar. Hati-hati dengan pasangan yang mirip: シ (shi) dan ツ (tsu), ソ (so) dan ン (n).",
    vocab: kana("ナna ニni ヌnu ネne ノno ハha ヒhi フfu ヘhe ホho マma ミmi ムmu メme モmo ヤya ユyu ヨyo ラra リri ルru レre ロro ワwa ヲwo ンn", "katakana"),
  },
  {
    key: "pemula:katakana:3",
    kind: "kana",
    title: "Katakana 3: Bunyi Panjang & Kata Serapan",
    explanation: "Di katakana, garis ー memanjangkan vokal sebelumnya. Huruf kecil ッ menggandakan konsonan berikutnya, misalnya ベッド (beddo).",
    vocab: kana("ガga ザza ダda バba パpa コーヒーkoohii テレビterebi パンpan ベッドbeddo カメラkamera", "katakana"),
  },
  {
    key: "pemula:salam",
    kind: "kata",
    title: "Salam Sehari-hari",
    explanation: "Ungkapan salam yang paling sering dipakai orang Jepang dalam keseharian. Hafalkan beserta situasi pemakaiannya.",
    vocab: [
      { word: "おはようございます", reading: "おはようございます", meaningId: "Selamat pagi (sopan)" },
      { word: "こんにちは", reading: "こんにちは", meaningId: "Halo / Selamat siang" },
      { word: "こんばんは", reading: "こんばんは", meaningId: "Selamat malam (saat bertemu)" },
      { word: "おやすみなさい", reading: "おやすみなさい", meaningId: "Selamat tidur" },
      { word: "ありがとうございます", reading: "ありがとうございます", meaningId: "Terima kasih (sopan)" },
      { word: "すみません", reading: "すみません", meaningId: "Maaf / Permisi" },
      { word: "ごめんなさい", reading: "ごめんなさい", meaningId: "Maaf (meminta maaf)" },
      { word: "さようなら", reading: "さようなら", meaningId: "Selamat tinggal" },
      { word: "いただきます", reading: "いただきます", meaningId: "Ucapan sebelum makan" },
      { word: "ごちそうさまでした", reading: "ごちそうさまでした", meaningId: "Ucapan setelah makan" },
    ],
  },
  {
    key: "pemula:perkenalan",
    kind: "kata",
    title: "Perkenalan Diri",
    explanation: "Kalimat dasar untuk memperkenalkan diri. Pola: わたしは＋nama＋です。Diakhiri dengan どうぞよろしくおねがいします.",
    vocab: [
      { word: "はじめまして", reading: "はじめまして", meaningId: "Salam kenal (pertama bertemu)", exampleSentence: "はじめまして、リナです。" },
      { word: "わたし", reading: "わたし", meaningId: "Saya", exampleSentence: "わたしはインドネシアじんです。" },
      { word: "なまえ", reading: "なまえ", meaningId: "Nama", exampleSentence: "おなまえはなんですか。" },
      { word: "インドネシア", reading: "インドネシア", meaningId: "Indonesia" },
      { word: "〜じん", reading: "〜じん", meaningId: "Orang (kewarganegaraan)", exampleSentence: "にほんじんです。" },
      { word: "がくせい", reading: "がくせい", meaningId: "Pelajar / Mahasiswa", exampleSentence: "わたしはがくせいです。" },
      { word: "かいしゃいん", reading: "かいしゃいん", meaningId: "Karyawan perusahaan" },
      { word: "よろしくおねがいします", reading: "よろしくおねがいします", meaningId: "Mohon bantuannya / Senang berkenalan" },
    ],
  },
  {
    key: "pemula:angka",
    kind: "kata",
    title: "Angka 1–10",
    explanation: "Angka dasar bahasa Jepang. Angka 4, 7, dan 9 punya dua cara baca: よん/し, なな/しち, きゅう/く.",
    vocab: [
      { word: "いち", reading: "いち", meaningId: "Satu (1)" },
      { word: "に", reading: "に", meaningId: "Dua (2)" },
      { word: "さん", reading: "さん", meaningId: "Tiga (3)" },
      { word: "よん", reading: "よん", meaningId: "Empat (4)" },
      { word: "ご", reading: "ご", meaningId: "Lima (5)" },
      { word: "ろく", reading: "ろく", meaningId: "Enam (6)" },
      { word: "なな", reading: "なな", meaningId: "Tujuh (7)" },
      { word: "はち", reading: "はち", meaningId: "Delapan (8)" },
      { word: "きゅう", reading: "きゅう", meaningId: "Sembilan (9)" },
      { word: "じゅう", reading: "じゅう", meaningId: "Sepuluh (10)" },
    ],
  },
];
