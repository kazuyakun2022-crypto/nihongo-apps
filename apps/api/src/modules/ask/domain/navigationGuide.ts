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
  /** User sedang mengerjakan latihan/kuis: boleh menjelaskan & memberi petunjuk, dilarang memberi jawaban. */
  assessment?: "latihan" | "kuis";
  /** Soal yang sedang dikerjakan (untuk memeriksa kebocoran kunci jawaban). */
  questionId?: string;
  /** Diisi server saat jawaban pertama membocorkan kunci: kata yang dilarang muncul. */
  avoid?: string[];
}

const clean = (s: string, max: number) => s.replace(/[\r\n\[\]{}<>`"]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function appSection(app?: AppContext | null): string {
  if (!app) return "";
  const parts: string[] = [];
  if (app.screen) {
    parts.push(
      `- Yang sedang tampil di layar user: ${clean(app.screen, 560)}. Isi layar ini adalah SUMBER KEBENARAN tentang apa yang sedang dipelajari: kalau user bertanya "ini apa", "soal ini", "aku bingung", atau "sedang belajar apa", jawab tepat tentang isi layar ini (huruf, kata, pola, atau soal yang tertulis di atas), jangan materi lain. Sebutkan dulu apa yang sedang tampil, lalu jelaskan bagian yang dibutuhkan (arti, cara baca, pola, fungsi) dengan contoh singkat. Kalau isi layarnya tidak cukup jelas, katakan saja dan tanyakan bagian mana yang dimaksud.`,
    );
  }
  if (app.assessment) {
    parts.push(
      `- User sedang mengerjakan ${app.assessment === "kuis" ? "KUIS (dinilai)" : "LATIHAN"}. ATURAN KERAS: jangan pernah memberi jawaban soal, menyebut atau menunjuk pilihan yang benar, mengonfirmasi apakah jawaban user benar/salah, menuliskan kata/huruf yang diminta soal, atau menerjemahkan kalimat soal kalau terjemahan itu sendiri adalah jawabannya. Yang BOLEH: menjelaskan maksud soal, mengingatkan konsep/pola/aturan dari materi bab, arti kata pendukung yang bukan inti jawaban, dan petunjuk bertahap (mulai dari yang paling samar). Petunjuk TIDAK BOLEH memuat kata, terjemahan, atau sinonim langsung dari jawaban yang benar (mis. untuk soal arti salam pagi, jangan sebut "pagi"); arahkan ke cara berpikir atau materi yang perlu diingat. Kalau user minta jawaban langsung, tolak dengan lembut ("Itu harus kamu temukan sendiri ya") lalu beri satu petunjuk.`,
    );
  }
  if (app.assessment && app.avoid?.length) {
    parts.push(`- Jawabanmu sebelumnya membocorkan jawaban soal. Tulis ulang petunjuknya TANPA menyebut kata berikut, artinya, atau sinonimnya: ${app.avoid.map((w) => clean(w, 40)).join(", ")}.`);
  }
  if (app.widget) {
    parts.push(
      "- Kamu sedang menjawab sebagai asisten belajar di gelembung kecil yang melayang di atas layar. Jawab ringkas, paling banyak 4 kalimat pendek, tanpa tabel atau judul. Bantu langkah belajar berikutnya dengan sabar; kalau user bingung, pecah jadi langkah kecil.",
    );
  }
  // Saat latihan/kuis tidak ada tunjuk jalan: pindah layar di tengah soal bisa menghilangkan jawaban
  if (app.guide && !app.assessment) {
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

/**
 * Jawaban yang disertai tunjuk jalan dipangkas jadi kalimat pertama (maks ±120 huruf): user ingin langsung
 * ditunjukkan, bukan membaca paragraf. Tanda emosi di depan ([senang]) dipertahankan untuk mode suara.
 */
export function shortGuideReply(text: string): string {
  const t = text.trim();
  const tag = t.match(/^\[[a-z]+\]\s*/)?.[0] ?? "";
  const body = t.slice(tag.length).replace(/\s+/g, " ");
  const first = body.match(/^.+?[.!?。！？](?=\s|$)/)?.[0] ?? body;
  const short = first.length > 120 ? `${first.slice(0, 117).replace(/\s+\S*$/, "")}…` : first;
  return (tag + (short || "Ayo, aku tunjukkan jalannya!")).trim();
}

/**
 * Pertanyaan dari widget ditempeli isi layar SAAT INI. Info layar di prompt sistem saja kalah oleh riwayat
 * obrolan (uji: setelah pindah dari と ke た, "cara nulisnya gimana?" tetap dijawab tentang と).
 */
export function withScreen(question: string, app?: AppContext | null): string {
  if (!app?.widget || !app.screen) return question;
  return `${question}\n\n(Yang sedang tampil di layarku SEKARANG: ${clean(app.screen, 560)}. Jawab tentang ini, bukan tentang layar sebelumnya.)`;
}
