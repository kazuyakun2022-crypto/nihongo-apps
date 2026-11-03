/**
 * Miu-chan sebagai pemandu aplikasi: AI boleh menutup jawabannya dengan tanda [[tunjuk:<tujuan>]] bila user ingin
 * pergi/diajari ke suatu fitur. Klien lalu menjalankan tur langkah demi langkah ke tujuan itu.
 * Kunci tujuan harus sama dengan TourKey di apps/web/src/features/navigator/domain/tours.ts.
 */
export const GUIDE_DESTINATIONS: Record<string, string> = {
  continue: "lanjut belajar bab yang sedang dipelajari di peta belajar (materi, praktik, kuis per bab)",
  gate: "Gerbang Tulis di ujung peta belajar, syarat naik level",
  "level-test": "kesiapan & tes naik tahap / ujian kenaikan level",
  "kana-table": "tabel huruf hiragana, katakana, dakuten, yoon, kanji beserta suaranya",
  "kana-writing": "latihan menulis huruf dengan jari di layar (kanvas) dan koreksi goresan",
  "kana-quiz": "kuis huruf untuk menguji hafalan hiragana/katakana",
  workbook: "Tulis di Buku: cetak lembar, tulis dengan pensil, foto untuk dinilai",
  review: "review kartu hafalan kosakata (SRS/flashcard)",
  dictionary: "kamus: mencari arti kata",
  "dict-kanji": "kamus kanji",
  "dict-grammar": "kamus tata bahasa (pola kalimat, partikel)",
  "dict-phrases": "kamus ungkapan dan sebutan sehari-hari",
  ask: "Tanya AI: bertanya tertulis soal tata bahasa/kanji dengan jawaban panjang",
  voice: "ngobrol pakai suara dengan Miu-chan",
  roleplay: "skenario role-play percakapan (konbini, restoran, dll.)",
  progress: "melihat progres belajar, streak, dan XP di beranda",
  profile: "profil: ganti foto/nama, target harian",
  home: "beranda",
};

export interface AppContext {
  /** Layar yang sedang dibuka user (diisi klien, sudah dibersihkan). */
  screen?: string;
  /** Boleh menunjukkan jalan ke fitur lain dengan tanda [[tunjuk:…]]. */
  guide?: boolean;
  /** Jawaban tampil di gelembung kecil asisten, jadi harus ringkas. */
  widget?: boolean;
}

const clean = (s: string, max: number) => s.replace(/[\r\n\[\]{}<>`"]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function appSection(app?: AppContext | null): string {
  if (!app) return "";
  const parts: string[] = [];
  if (app.screen) parts.push(`- Layar yang sedang dibuka user: ${clean(app.screen, 240)}. Kalau user bilang "ini", "soal ini", atau kesulitan, anggap ia membicarakan layar ini dan bantu langsung sesuai isinya.`);
  if (app.widget) {
    parts.push(
      "- Kamu sedang menjawab sebagai asisten belajar di gelembung kecil yang melayang di atas layar. Jawab ringkas, paling banyak 4 kalimat pendek, tanpa tabel atau judul. Bantu langkah belajar berikutnya dengan sabar; kalau user bingung, pecah jadi langkah kecil.",
    );
  }
  if (app.guide) {
    const list = Object.entries(GUIDE_DESTINATIONS)
      .map(([k, d]) => `  ${k}: ${d}`)
      .join("\n");
    parts.push(
      `- Kamu juga pemandu aplikasi. Kalau user ingin pergi, membuka, belajar di, atau ditunjukkan cara memakai salah satu fitur di bawah, jawab singkat bahwa kamu akan menunjukkan jalannya, lalu tulis tanda [[tunjuk:KUNCI]] di paling akhir jawaban (satu saja). Jangan pakai tanda ini untuk pertanyaan materi biasa. Fitur:\n${list}`,
    );
  }
  return parts.length ? `\n\nKONTEKS APLIKASI:\n${parts.join("\n")}` : "";
}

/** Ambil tanda [[tunjuk:…]] dari jawaban; kunci yang tidak dikenal diabaikan. */
export function extractGuide(text: string): { text: string; guide: string | null } {
  let guide: string | null = null;
  const stripped = text.replace(/\[\[\s*tunjuk\s*:\s*([a-z-]+)\s*\]\]/gi, (_, key: string) => {
    const k = key.toLowerCase();
    if (!guide && k in GUIDE_DESTINATIONS) guide = k;
    return "";
  });
  return { text: stripped.replace(/[ \t]+$/gm, "").trim(), guide };
}
