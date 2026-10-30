/**
 * Tempo bicara Miu-chan per bagian kalimat. AI menandai bagian yang perlu dibacakan pelan
 * (contoh kalimat, koreksi) atau cepat (seruan spontan, demo kecepatan penutur asli):
 * "Jadi <pelan>学校に行きます</pelan>. Coba ulangi!". Bagian tanpa tanda mengikuti bahasanya:
 * bahasa Indonesia selalu normal, bahasa Jepang sedikit diperlambat sesuai level user.
 */
export type PaceMark = "pelan" | "cepat";

export interface SpeechRun {
  text: string;
  /** Pengali kecepatan bicara (1 = normal). */
  tempo: number;
  mark?: PaceMark;
}

const MARKS: Record<string, PaceMark> = { pelan: "pelan", lambat: "pelan", slow: "pelan", cepat: "cepat", fast: "cepat" };
const MARKED = /<\s*(pelan|lambat|slow|cepat|fast)\s*>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
const ANY_TAG = /<\s*\/?\s*(?:pelan|lambat|slow|cepat|fast)\s*>/gi;
const JAPANESE_LETTER = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ々]/;
const LETTER = /\p{L}/u;

const MIN_JAPANESE_RUN = 3;

export const FAST_TEMPO = 1.15;
/** Batas tempo "pelan": level lanjut pun tetap diperlambat saat memberi contoh untuk ditirukan. */
const SLOW_CAP = 0.85;

const clampTempo = (t: number) => Math.round(Math.min(1.5, Math.max(0.5, t)) * 100) / 100;

/** `levelRate`: kecepatan bicara level user dari Konfig AI (mis. 0.7 Pemula, 1.0 N1). */
export function paceTempo(kind: "id" | "ja" | PaceMark, levelRate: number): number {
  switch (kind) {
    case "pelan":
      return clampTempo(Math.min(levelRate, SLOW_CAP));
    case "cepat":
      return FAST_TEMPO;
    case "ja":
      // Hanya setengah dari perlambatan level, supaya obrolan tetap terdengar alami
      return clampTempo(1 - (1 - levelRate) / 2);
    default:
      return 1;
  }
}

export function stripPaceTags(text: string): string {
  return text.replace(ANY_TAG, "");
}

function countJapanese(text: string): number {
  let n = 0;
  for (const ch of text) if (JAPANESE_LETTER.test(ch)) n++;
  return n;
}

/** Pecah teks jadi potongan Jepang dan non-Jepang; spasi, angka, dan tanda baca ikut potongan sebelumnya. */
function splitByScript(text: string): { lang: "ja" | "id"; text: string }[] {
  const parts: { lang: "ja" | "id"; text: string }[] = [];
  let lang: "ja" | "id" | null = null;
  let buf = "";
  for (const ch of text) {
    const l = JAPANESE_LETTER.test(ch) ? "ja" : LETTER.test(ch) ? "id" : null;
    if (l && lang && l !== lang) {
      parts.push({ lang, text: buf });
      buf = "";
    }
    if (l) lang = l;
    buf += ch;
  }
  if (buf) parts.push({ lang: lang ?? "id", text: buf });
  return parts;
}

export function planSpeech(raw: string, levelRate = 1): SpeechRun[] {
  const runs: SpeechRun[] = [];
  // Potongan tanpa huruf (spasi, tanda baca) tidak berdiri sendiri: ikut potongan sebelum/sesudahnya
  let pending = "";
  const push = (run: SpeechRun) => {
    const text = pending + run.text;
    const prev = runs[runs.length - 1];
    if (!LETTER.test(text)) {
      if (prev) prev.text += text;
      else pending = text;
      return;
    }
    pending = "";
    if (prev && prev.tempo === run.tempo && prev.mark === run.mark) prev.text += text;
    else runs.push({ ...run, text });
  };
  const pushPlain = (text: string) => {
    for (const part of splitByScript(stripPaceTags(text))) {
      // Partikel atau kata Jepang sangat pendek di tengah penjelasan ikut tempo kalimat Indonesianya
      const lang = part.lang === "ja" && countJapanese(part.text) < MIN_JAPANESE_RUN ? "id" : part.lang;
      push({ text: part.text, tempo: paceTempo(lang, levelRate) });
    }
  };

  let last = 0;
  for (const m of raw.matchAll(MARKED)) {
    pushPlain(raw.slice(last, m.index));
    const mark = MARKS[m[1].toLowerCase()];
    push({ text: stripPaceTags(m[2]), tempo: paceTempo(mark, levelRate), mark });
    last = (m.index ?? 0) + m[0].length;
  }
  pushPlain(raw.slice(last));
  return runs;
}

/** Teks tampilan tanpa tanda tempo. */
export function speechText(runs: SpeechRun[]): string {
  return runs.map((r) => r.text).join("").replace(/[ \t]{2,}/g, " ").trim();
}
