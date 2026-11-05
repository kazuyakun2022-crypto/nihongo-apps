import type { TourKey } from "./tours";

/**
 * Peta maksud ucapan → tur Miu-chan (lihat tours.ts). Dicocokkan dengan kata kunci di klien (tanpa LLM, tanpa kuota);
 * ucapan yang tidak cocok diteruskan ke Miu-chan sebagai pertanyaan biasa.
 */
export interface NavIntent {
  /** Tur yang dijalankan; "page" = tur halaman yang sedang dibuka. */
  tour: TourKey | "page";
  /**
   * Frasa penanda. Frasa ≥2 kata selalu dihitung (skor 2); kata tunggal hanya dihitung bila kalimatnya
   * memang berbentuk permintaan pindah/tunjuk (lihat NAV_CUE), supaya pertanyaan materi tidak salah dibelokkan.
   */
  keywords: string[];
}

export const INTENTS: NavIntent[] = [
  {
    tour: "page",
    keywords: ["halaman ini", "jelaskan halaman", "jelasin halaman", "layar ini", "cara pakai aplikasi", "cara pakainya", "cara menggunakan aplikasi", "tunjukkan fitur", "fitur apa", "tombol apa", "panduan aplikasi", "tur", "tour"],
  },
  {
    tour: "kana-writing",
    keywords: ["menulis huruf", "latihan menulis", "belajar menulis", "nulis huruf", "tulis hiragana", "tulis katakana", "latihan nulis", "goresan", "kanvas", "かく", "kaku"],
  },
  {
    tour: "kana-quiz",
    keywords: ["kuis huruf", "quiz huruf", "tes huruf", "uji hafalan huruf", "kuis hiragana", "kuis katakana"],
  },
  {
    tour: "kana-table",
    keywords: ["tabel huruf", "daftar huruf", "huruf jepang", "tabel hiragana", "tabel katakana", "belajar huruf", "lihat huruf", "hiragana", "katakana", "kana", "ひらがな", "カタカナ"],
  },
  {
    tour: "workbook",
    keywords: ["lembar kerja", "buku tulis", "tulis tangan", "tulisan tangan", "foto tulisan", "scan tulisan", "cetak lembar", "tulis di buku", "menulis di buku", "nulis di buku", "di buku", "di kertas", "pakai pensil", "pensil", "kertas", "pindai", "workbook"],
  },
  {
    tour: "review",
    keywords: ["kartu hafalan", "ulang kosakata", "mengulang kata", "review kosakata", "flashcard", "review", "hafalan", "srs", "ふくしゅう", "fukushuu"],
  },
  {
    tour: "level-test",
    keywords: ["naik level", "naik tahap", "tes naik", "ujian naik", "ujian kelulusan", "tes kenaikan", "level berikutnya"],
  },
  {
    tour: "jlpt-sim",
    keywords: ["simulasi jlpt", "latihan jlpt", "tryout jlpt", "try out jlpt", "ujian jlpt", "tes jlpt", "soal jlpt", "simulasi ujian", "mogi shiken", "もぎしけん", "模擬試験"],
  },
  {
    tour: "gate",
    keywords: ["gerbang tulis", "gerbang"],
  },
  {
    tour: "roleplay",
    keywords: ["latihan ngomong", "latihan bicara", "latihan percakapan", "role play", "di konbini", "di restoran", "roleplay", "skenario", "percakapan", "かいわ", "kaiwa"],
  },
  {
    tour: "voice",
    keywords: ["ngobrol suara", "pakai suara", "bicara langsung", "ngomong langsung", "obrolan suara", "telepon", "voice"],
  },
  {
    tour: "ask",
    keywords: ["tanya ai", "tanya sensei", "nanya tertulis", "chat ai"],
  },
  {
    tour: "dict-kanji",
    keywords: ["kamus kanji", "cari kanji"],
  },
  {
    tour: "dict-grammar",
    keywords: ["kamus tata bahasa", "daftar tata bahasa", "pola kalimat", "daftar partikel"],
  },
  {
    tour: "dict-phrases",
    keywords: ["kamus ungkapan", "daftar ungkapan", "ungkapan sehari"],
  },
  {
    tour: "dictionary",
    // Sengaja tanpa "artinya"/"arti kata": pertanyaan arti lebih baik dijawab langsung oleh Miu-chan
    keywords: ["buka kamus", "cari kata", "cari arti", "kamus", "じしょ", "jisho"],
  },
  {
    tour: "progress",
    keywords: ["lihat progres", "progres belajar", "progress", "progres", "streak", "xp"],
  },
  {
    tour: "profile",
    keywords: ["ganti foto", "ganti nama", "target harian", "profil", "akun", "pengaturan"],
  },
  {
    tour: "home",
    keywords: ["halaman utama", "beranda", "home"],
  },
  {
    // "lanjut belajar", "harus ngapain", "mulai dari mana" → bab yang sedang dipelajari
    tour: "continue",
    keywords: ["lanjut belajar", "mulai belajar", "memulai belajar", "tempat belajar", "bab berikutnya", "bab selanjutnya", "lanjut pelajaran", "harus ngapain", "mulai dari mana", "tahu harus", "peta belajar", "daftar bab", "lanjutkan", "pelajaran", "べんきょう", "benkyou"],
  },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[!?.,、。！？~～"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Kalimat berbentuk permintaan pindah/tunjuk jalan. */
const NAV_CUE = /(^|\s)(buka|bukain|ke|mau|ingin|pengen|pingin|tunjukkan|tunjukin|antar|anterin|pergi|cara|gimana|bagaimana|dimana|dimanakah|di mana|di manakah|letak|mana|latihan|mulai|memulai|lihat|lanjut|lanjutkan|kembali|balik|cari|tempat)(\s|$)/;
/** Pertanyaan materi: biarkan AI yang menjawab (AI tetap bisa menawarkan tunjuk jalan). */
const CONTENT_QUESTION = /^(apa itu|apa arti|apa bedanya|beda|kenapa|mengapa|artinya|arti|bagaimana cara (membaca|baca|mengucapkan)|gimana cara (baca|bacanya|ngucapin))(\s|$)/;
/** Kata tanya materi di mana pun dalam kalimat ("di buku ini artinya apa") juga berarti pertanyaan, bukan minta pindah. */
const CONTENT_ANYWHERE = /(^|\s)(artinya|apa arti|apa bedanya|apa itu|maksudnya|kenapa|mengapa|dibaca apa|bacanya)(\s|$)/;

/** Maksud dengan skor tertinggi; null kalau tidak ada yang cocok (lalu diteruskan ke AI). */
export function matchIntent(utterance: string): NavIntent | null {
  const text = normalize(utterance);
  if (!text || CONTENT_QUESTION.test(text) || CONTENT_ANYWHERE.test(text)) return null;
  const padded = ` ${text} `;
  const cue = NAV_CUE.test(text);
  let best: { intent: NavIntent; score: number } | null = null;
  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keywords) {
      const key = normalize(k);
      const multi = key.includes(" ");
      if (!multi && !cue) continue;
      // Kata pendek berhuruf latin harus utuh ("kana" tidak cocok di "rekanan")
      const hit = /^[a-z]{1,5}$/.test(key) ? new RegExp(`(^|\\s)${key}(\\s|$)`).test(padded) : padded.includes(key);
      // Frasa lebih panjang lebih spesifik: "kamus tata bahasa" (3) mengalahkan "buka kamus" (2)
      if (hit) score += key.split(" ").length;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

/** Kelompok gaya bahasa penuntun menurut level JLPT pengguna. */
export type LevelBand = "PRE_N5" | "N5" | "N4" | "N3" | "N2N1";

/** id level di database: 1 Pemula, 2 N5, 3 N4, 4 N3, 5 N2, 6 N1. */
export function bandForLevel(levelId: number | null | undefined): LevelBand {
  switch (levelId) {
    case 2:
      return "N5";
    case 3:
      return "N4";
    case 4:
      return "N3";
    case 5:
    case 6:
      return "N2N1";
    default:
      return "PRE_N5";
  }
}

/** Rute ujian: widget dibekukan total (tak terlihat, mikrofon & suara dihentikan). */
export const EXAM_ROUTES = [/^\/belajar\/tes-naik-tahap/, /^\/belajar\/simulasi-jlpt/, /^\/belajar\/gerbang-tulis/, /^\/belajar\/gerbang-hiragana/, /^\/mulai\/tes-penempatan/];
/** Rute yang sudah punya Miu-chan sendiri (obrolan suara/teks): widget disembunyikan supaya tidak ganda. */
export const OWN_MASCOT_ROUTES = [/^\/suara/, /^\/tanya/, /^\/ngobrol\/skenario\//];
