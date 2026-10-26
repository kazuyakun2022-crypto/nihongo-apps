export interface HiraganaStrokeInfo {
  char: string;
  romaji: string;
  strokeCount: number;
  strokeTips: string[];
}

export const HIRAGANA_STROKE_DATA: Record<string, HiraganaStrokeInfo> = {
  "あ": {
    char: "あ",
    romaji: "a",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar pendek dari kiri ke kanan.",
      "2. Garis tegak vertikal sedikit melengkung ke kiri melintasi garis pertama.",
      "3. Tarikan kurva melingkar besar menyerupai angka 8 terbuka."
    ]
  },
  "い": {
    char: "い",
    romaji: "i",
    strokeCount: 2,
    strokeTips: [
      "1. Garis melengkung ke bawah di kiri diakhiri kaitan kecil (hane) ke atas.",
      "2. Garis melengkung sedikit lebih pendek di sisi kanan."
    ]
  },
  "う": {
    char: "う",
    romaji: "u",
    strokeCount: 2,
    strokeTips: [
      "1. Titik garis miring pendek di bagian atas.",
      "2. Lengkungan besar membulat ke kanan lalu turun ke bawah."
    ]
  },
  "え": {
    char: "え",
    romaji: "e",
    strokeCount: 2,
    strokeTips: [
      "1. Garis miring pendek di bagian atas.",
      "2. Garis sambung zig-zag: miring ke bawah, lalu mendatar seperti ombak."
    ]
  },
  "お": {
    char: "お",
    romaji: "o",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar pendek di atas.",
      "2. Garis tegak ke bawah, berputar melingkar membentuk lingkaran di kanan bawah.",
      "3. Titik miring di kanan atas sebagai penutup."
    ]
  },
  "か": {
    char: "か",
    romaji: "ka",
    strokeCount: 3,
    strokeTips: [
      "1. Garis melintang lalu menekuk ke bawah dengan kaitan kecil.",
      "2. Garis miring menyilang dari atas kiri ke bawah kanan.",
      "3. Titik garis miring di sisi kanan atas."
    ]
  },
  "き": {
    char: "き",
    romaji: "ki",
    strokeCount: 4,
    strokeTips: [
      "1. Garis mendatar pertama di bagian atas.",
      "2. Garis mendatar kedua sejajar di bawahnya.",
      "3. Garis miring vertikal menyilang dengan kaitan ke kiri.",
      "4. Lengkungan bawah terpisah dari kiri ke kanan."
    ]
  },
  "く": {
    char: "く",
    romaji: "ku",
    strokeCount: 1,
    strokeTips: [
      "1. Satu tarikan membentuk sudut tumpul dari kanan atas ke kiri bawah lalu ke kanan bawah."
    ]
  },
  "け": {
    char: "け",
    romaji: "ke",
    strokeCount: 3,
    strokeTips: [
      "1. Garis tegak di kiri dengan kaitan di ujung bawah.",
      "2. Garis mendatar pendek di bagian kanan atas.",
      "3. Garis tegak melengkung lembut menyilang garis mendatar."
    ]
  },
  "こ": {
    char: "こ",
    romaji: "ko",
    strokeCount: 2,
    strokeTips: [
      "1. Garis mendatar atas dengan kaitan kecil ke kiri bawah.",
      "2. Garis mendatar bawah melengkung lembut ke atas."
    ]
  },
  "さ": {
    char: "さ",
    romaji: "sa",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar sedikit menanjak.",
      "2. Garis miring menyilang dengan kaitan ke kiri.",
      "3. Lengkungan bawah terpisah menghadap ke kiri."
    ]
  },
  "し": {
    char: "し",
    romaji: "shi",
    strokeCount: 1,
    strokeTips: [
      "1. Tarik garis lurus dari atas ke bawah, lalu melengkung ke kanan atas seperti mata kail."
    ]
  },
  "す": {
    char: "す",
    romaji: "su",
    strokeCount: 2,
    strokeTips: [
      "1. Garis mendatar dari kiri ke kanan.",
      "2. Garis tegak ke bawah, membuat simpul melingkar di tengah, lalu turun melengkung."
    ]
  },
  "せ": {
    char: "せ",
    romaji: "se",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar panjang dari kiri ke kanan.",
      "2. Garis tegak kanan menekuk mendatar ke kiri dengan kaitan.",
      "3. Garis tegak kiri memotong garis pertama ke bawah."
    ]
  },
  "そ": {
    char: "そ",
    romaji: "so",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan berkesinambungan: mendatar, miring ke kiri bawah, mendatar, lalu membulat besar."
    ]
  },
  "た": {
    char: "た",
    romaji: "ta",
    strokeCount: 4,
    strokeTips: [
      "1. Garis mendatar di sisi kiri.",
      "2. Garis miring menyilang ke bawah.",
      "3. Garis mendatar pendek di kanan atas.",
      "4. Lengkungan bawah menyerupai huruf こ di sisi kanan."
    ]
  },
  "ち": {
    char: "ち",
    romaji: "chi",
    strokeCount: 2,
    strokeTips: [
      "1. Garis mendatar menanjak di atas.",
      "2. Garis miring ke kiri lalu berbalik melengkung besar menyerupai angka 5."
    ]
  },
  "つ": {
    char: "つ",
    romaji: "tsu",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan melengkung lebar dari kiri atas membulat ke kanan lalu meluncur ke kiri bawah."
    ]
  },
  "て": {
    char: "て",
    romaji: "te",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan: tarik mendatar ke kanan lalu melengkung besar ke kiri bawah."
    ]
  },
  "と": {
    char: "と",
    romaji: "to",
    strokeCount: 2,
    strokeTips: [
      "1. Garis miring pendek dari atas ke kanan bawah.",
      "2. Lengkungan besar terbuka dari kanan atas memotong garis pertama."
    ]
  },
  "な": {
    char: "な",
    romaji: "na",
    strokeCount: 4,
    strokeTips: [
      "1. Garis mendatar di sisi kiri.",
      "2. Garis miring memotong garis pertama.",
      "3. Titik miring di kanan atas.",
      "4. Garis tegak di kanan dengan simpul melingkar di ujung bawah."
    ]
  },
  "に": {
    char: "に",
    romaji: "ni",
    strokeCount: 3,
    strokeTips: [
      "1. Garis tegak vertikal di kiri dengan kaitan.",
      "2. Garis mendatar atas di kanan.",
      "3. Garis mendatar bawah di kanan sejajar."
    ]
  },
  "ぬ": {
    char: "ぬ",
    romaji: "nu",
    strokeCount: 2,
    strokeTips: [
      "1. Garis miring lembut dari kiri atas ke kanan bawah.",
      "2. Tarikan melingkar besar menyilang lalu membentuk simpul lingkaran kecil di kanan bawah."
    ]
  },
  "ね": {
    char: "ね",
    romaji: "ne",
    strokeCount: 2,
    strokeTips: [
      "1. Garis lurus tegak dari atas ke bawah.",
      "2. Goresan zig-zag dari kiri ke kanan lalu melingkar dengan simpul kecil di ujung kanan."
    ]
  },
  "の": {
    char: "の",
    romaji: "no",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan kurva spiral lembut dari tengah melingkar searah jarum jam."
    ]
  },
  "は": {
    char: "は",
    romaji: "ha",
    strokeCount: 3,
    strokeTips: [
      "1. Garis tegak di kiri dengan kaitan di bawah.",
      "2. Garis mendatar pendek di sisi kanan.",
      "3. Garis tegak kanan dengan simpul membulat di bawah."
    ]
  },
  "ひ": {
    char: "ひ",
    romaji: "hi",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan: mendatar ke kanan, turun membulat besar seperti mangkuk, lalu naik dan turun."
    ]
  },
  "ふ": {
    char: "ふ",
    romaji: "fu",
    strokeCount: 4,
    strokeTips: [
      "1. Titik garis miring pendek di bagian atas tengah.",
      "2. Garis lengkung utama di tengah seperti hidung.",
      "3. Titik miring di sisi kiri.",
      "4. Titik miring di sisi kanan luar."
    ]
  },
  "へ": {
    char: "へ",
    romaji: "he",
    strokeCount: 1,
    strokeTips: [
      "1. Satu tarikan membentuk bukit: miring naik ke kanan lalu turun lebih panjang ke kanan bawah."
    ]
  },
  "ほ": {
    char: "ほ",
    romaji: "ho",
    strokeCount: 4,
    strokeTips: [
      "1. Garis tegak di kiri dengan kaitan.",
      "2. Garis mendatar atas di kanan.",
      "3. Garis mendatar bawah di kanan.",
      "4. Garis tegak vertikal dari garis mendatar atas dengan simpul di bawah (tidak menembus atas)."
    ]
  },
  "ま": {
    char: "ま",
    romaji: "ma",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar pertama di atas.",
      "2. Garis mendatar kedua di bawahnya.",
      "3. Garis tegak vertikal memotong kedua garis lalu membentuk simpul lingkaran di ujung bawah."
    ]
  },
  "み": {
    char: "み",
    romaji: "mi",
    strokeCount: 2,
    strokeTips: [
      "1. Garis mendatar, miring ke kiri, memutar membuat simpul, lalu mendatar ke kanan.",
      "2. Garis miring menyilang garis lengkung sebelumnya."
    ]
  },
  "む": {
    char: "む",
    romaji: "mu",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar pendek.",
      "2. Garis tegak memotong, membuat simpul di kiri bawah, lalu melengkung ke kanan atas.",
      "3. Titik miring di kanan atas."
    ]
  },
  "め": {
    char: "め",
    romaji: "me",
    strokeCount: 2,
    strokeTips: [
      "1. Garis miring lembut dari kiri atas ke kanan bawah.",
      "2. Tarikan melingkar besar menyilang garis pertama tanpa simpul."
    ]
  },
  "も": {
    char: "も",
    romaji: "mo",
    strokeCount: 3,
    strokeTips: [
      "1. Garis tegak dari atas melengkung ke kanan bawah seperti mata pancing.",
      "2. Garis mendatar pertama di atas menyilang garis tegak.",
      "3. Garis mendatar kedua di bawahnya menyilang sejajar."
    ]
  },
  "や": {
    char: "や",
    romaji: "ya",
    strokeCount: 3,
    strokeTips: [
      "1. Garis lengkung utama dengan kaitan di kanan atas.",
      "2. Titik miring pendek di bagian atas.",
      "3. Garis miring menyilang dari kiri atas ke kanan bawah."
    ]
  },
  "ゆ": {
    char: "ゆ",
    romaji: "yu",
    strokeCount: 2,
    strokeTips: [
      "1. Garis tegak melengkung ke kiri, memutar naik lalu turun melengkung ke kanan.",
      "2. Garis vertikal tegak memotong bagian tengah."
    ]
  },
  "よ": {
    char: "よ",
    romaji: "yo",
    strokeCount: 2,
    strokeTips: [
      "1. Garis mendatar pendek di sisi kiri atas.",
      "2. Garis tegak dari atas, membuat simpul melingkar ke kiri, lalu mendatar ke kanan."
    ]
  },
  "ら": {
    char: "ら",
    romaji: "ra",
    strokeCount: 2,
    strokeTips: [
      "1. Titik garis miring pendek di bagian atas.",
      "2. Lengkungan vertikal membulat ke kanan menyerupai angka 5 lembut."
    ]
  },
  "り": {
    char: "り",
    romaji: "ri",
    strokeCount: 2,
    strokeTips: [
      "1. Garis tegak pendek di kiri dengan kaitan kecil ke kanan atas.",
      "2. Garis tegak lebih panjang di kanan melengkung lembut ke bawah."
    ]
  },
  "る": {
    char: "る",
    romaji: "ru",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan: mendatar, miring ke kiri bawah, melengkung membulat, dan diakhiri simpul lingkaran kecil di dalam."
    ]
  },
  "れ": {
    char: "れ",
    romaji: "re",
    strokeCount: 2,
    strokeTips: [
      "1. Garis lurus tegak dari atas ke bawah.",
      "2. Goresan zig-zag dari kiri ke kanan lalu melengkung ke kanan atas terbuka."
    ]
  },
  "ろ": {
    char: "ろ",
    romaji: "ro",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan: mirip dengan huruf 'る' namun di bagian akhir terbuka tanpa simpul lingkaran."
    ]
  },
  "わ": {
    char: "わ",
    romaji: "wa",
    strokeCount: 2,
    strokeTips: [
      "1. Garis lurus tegak dari atas ke bawah di sisi kiri.",
      "2. Goresan zig-zag lalu membulat besar ke kanan terbuka."
    ]
  },
  "を": {
    char: "を",
    romaji: "wo",
    strokeCount: 3,
    strokeTips: [
      "1. Garis mendatar pendek di atas.",
      "2. Garis miring ke kiri bawah lalu melengkung terbuka ke kanan.",
      "3. Garis lengkung bawah menyilang seperti huruf 'c' terbalik."
    ]
  },
  "ん": {
    char: "ん",
    romaji: "n",
    strokeCount: 1,
    strokeTips: [
      "1. Satu goresan: miring ke bawah, lalu naik dan melengkung menyerupai huruf 'n' kecil latin."
    ]
  }
};
