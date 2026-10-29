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
