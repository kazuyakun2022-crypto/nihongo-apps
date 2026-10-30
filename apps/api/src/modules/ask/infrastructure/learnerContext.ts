/** Kana dan kanji (U+3040–U+30FF, U+3400–U+9FFF) — dipakai untuk mengenali bagian Jepang di teks campuran. */
const JAPANESE = /[぀-ヿ㐀-鿿]/g;

export function japaneseRatio(text: string): number {
  const letters = text.match(/\p{L}/gu) ?? [];
  const japanese = text.match(JAPANESE) ?? [];
  return letters.length > 0 ? japanese.length / letters.length : 0;
}

export function containsJapanese(text: string): boolean {
  return /[぀-ヿ㐀-鿿]/.test(text);
}

/**
 * Teks dari akun/memori/STT dibersihkan dulu supaya tidak bisa menyisipkan instruksi ke prompt.
 * ">" dibiarkan karena catatan kesalahan disimpan sebagai "salah => benar".
 */
export function sanitizeForPrompt(text: string, max = 40): string {
  return text.replace(/[\r\n\[\]{}<`"]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export interface AskUser {
  name: string;
  gender?: "male" | "female" | "other" | null;
  /** Kode level dari tabel levels: PEMULA, N5, N4, N3, N2, N1. */
  level?: string | null;
  /** Memori bertipe interest (hobi/minat). */
  interests?: string[];
  /** Memori bertipe mistake (kesalahan yang sering muncul). */
  weakTopics?: string[];
  /** Panduan level dari admin (Konfig AI): prompt, batas kata, aturan furigana, kecepatan bicara. */
  levelGuide?: { systemPrompt: string; maxSentenceWords: number; furiganaRule: "full" | "hard_only" | "none"; speechRate: number } | null;
  /** Bab yang sedang dipelajari user beserta pola tata bahasanya. */
  lesson?: { title: string; grammar: string[] } | null;
  /** Tujuan belajar dari pendaftaran (mis. "Kerja atau magang di Jepang"). */
  goal?: string | null;
}

export type LevelBand = "pemula" | "dasar" | "menengah" | "mahir";

/** Tamu atau level belum diketahui diperlakukan sebagai pemula supaya selalu ada penjelasan bahasa Indonesia. */
export function levelBand(code?: string | null): LevelBand {
  switch (code?.toUpperCase()) {
    case "N4":
      return "dasar";
    case "N3":
      return "menengah";
    case "N2":
    case "N1":
      return "mahir";
    default:
      return "pemula";
  }
}

export function levelLabel(code?: string | null): string {
  if (!code) return "belum diketahui (anggap pemula N5)";
  return code.toUpperCase() === "PEMULA" ? "Pemula total (di bawah N5)" : `JLPT ${code.toUpperCase()}`;
}

const FURIGANA_TEXT: Record<"full" | "hard_only" | "none", string> = {
  full: "Setiap kanji diberi furigana dalam kurung tepat setelahnya, format 漢字(かんじ).",
  hard_only: "Furigana 漢字(かんじ) hanya untuk kanji yang sulit atau di atas level user.",
  none: "Tanpa furigana.",
};

/**
 * Panduan level dari admin dan bab yang sedang dipelajari. Teks admin dipercaya (bukan input user),
 * jadi baris barunya dipertahankan; judul bab dan pola tetap disaring karena berasal dari konten.
 */
export function levelGuideSection(user: AskUser | undefined, mode: "text" | "voice"): string {
  const lines: string[] = [];
  const guide = user?.levelGuide;
  if (guide) {
    lines.push(`\n\nPANDUAN LEVEL DARI ADMIN (ikuti selama tidak bertentangan dengan aturan wajib di atas):\n${guide.systemPrompt.slice(0, 2000)}`);
    // 0 = tanpa batas (N2–N1)
    if (guide.maxSentenceWords > 0) lines.push(`- Kalimat Jepangmu maksimal ${guide.maxSentenceWords} kata.`);
    if (mode === "text") lines.push(`- ${FURIGANA_TEXT[guide.furiganaRule]}`);
  }
  if (user?.goal) {
    lines.push(`\n\nTUJUAN BELAJAR USER: ${sanitizeForPrompt(user.goal, 80)}. Pilih contoh dan topik yang mendukung tujuan ini (mis. situasi kerja bila tujuannya kerja).`);
  }
  const lesson = user?.lesson;
  if (lesson) {
    const grammar = lesson.grammar.map((g) => sanitizeForPrompt(g, 60)).filter(Boolean);
    lines.push(
      `\n\nBAB YANG SEDANG DIPELAJARI USER: ${sanitizeForPrompt(lesson.title, 100)}.` +
        (grammar.length ? ` Pola target: ${grammar.join("; ")}.` : "") +
        " Kalau nyambung dengan obrolan, ajak user memakai pola ini dan puji kalau dia berhasil.",
    );
  }
  return lines.join("\n");
}

/** Hobi dan kesalahan yang sering muncul, untuk dipakai sebagai contoh kalimat dan fokus koreksi. */
export function memorySection(user?: AskUser): string {
  const interests = (user?.interests ?? []).map((m) => sanitizeForPrompt(m, 60)).filter(Boolean);
  const weak = (user?.weakTopics ?? []).map((m) => sanitizeForPrompt(m, 80)).filter(Boolean);
  if (!interests.length && !weak.length) return "";
  const lines = ["\n\nYANG KAMU INGAT TENTANG USER (pakai seperlunya, jangan disebut semua sekaligus):"];
  if (interests.length) lines.push(`- Hobi/minat: ${interests.join("; ")}. Pakai sebagai bahan contoh kalimat atau topik obrolan kalau nyambung.`);
  if (weak.length) {
    lines.push(`- Kesalahan yang pernah dia buat: ${weak.join("; ")}. Kalau pola yang sama muncul lagi, koreksi dengan lembut dan ingatkan bahwa ini pernah dibahas.`);
  }
  return lines.join("\n");
}
