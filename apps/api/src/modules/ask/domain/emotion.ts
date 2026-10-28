/**
 * Emosi maskot Miu-chan saat menjawab di mode suara.
 * AI menulis tanda seperti "[senang]" di awal jawaban; tanda itu dipisahkan di sini
 * sebelum teks dikirim ke aplikasi dan dibacakan TTS.
 */
export const EMOTIONS = [
  "biasa",
  "senang",
  "semangat",
  "sedih",
  "nangis",
  "kesal",
  "marah",
  "rese",
  "kaget",
  "bingung",
  "malu",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** Sinonim yang mungkin ditulis AI, dipetakan ke emosi resmi. */
const ALIASES: Record<string, Emotion> = {
  biasa: "biasa",
  normal: "biasa",
  netral: "biasa",
  senang: "senang",
  gembira: "senang",
  bahagia: "senang",
  bangga: "senang",
  happy: "senang",
  semangat: "semangat",
  antusias: "semangat",
  excited: "semangat",
  sedih: "sedih",
  nangis: "nangis",
  menangis: "nangis",
  kesal: "kesal",
  sebal: "kesal",
  ngambek: "kesal",
  marah: "marah",
  rese: "rese",
  jahil: "rese",
  iseng: "rese",
  kaget: "kaget",
  terkejut: "kaget",
  shock: "kaget",
  wow: "kaget",
  bingung: "bingung",
  puzzled: "bingung",
  heran: "bingung",
  malu: "malu",
  tersipu: "malu",
  blush: "malu",
  // Tsundere: wajah tersipu sambil pura-pura cuek
  tsundere: "malu",
  cemberut: "kesal",
};

function toEmotion(word: string): Emotion | null {
  const w = word.toLowerCase();
  if ((EMOTIONS as readonly string[]).includes(w)) return w as Emotion;
  return ALIASES[w] ?? null;
}

const WORDS = [...EMOTIONS, ...Object.keys(ALIASES)].join("|");
const LEADING_TAG = new RegExp(`^\\s*[\\[【(（]\\s*(${WORDS})\\s*[\\]】)）]\\s*[:：-]?\\s*`, "i");
const ANY_TAG = new RegExp(`\\s*[\\[【]\\s*(?:${WORDS})\\s*[\\]】]\\s*`, "gi");

// Koreksi ucapan user yang ditulis AI di akhir jawaban: {{benar: 駅に行きます}}
const CORRECTION = /\{\{\s*benar\s*[:：]\s*([^}]+?)\s*\}\}/i;

/** Memisahkan kalimat yang benar dari jawaban; bagian ini ditampilkan di layar, tidak dibacakan. */
export function extractCorrection(raw: string): { text: string; correction: string | null } {
  const match = raw.match(CORRECTION);
  if (!match) return { text: raw, correction: null };
  const text = raw.replace(CORRECTION, " ").replace(/\s{2,}/g, " ").trim();
  return { text, correction: match[1].trim().slice(0, 200) || null };
}

export function extractEmotion(raw: string): { text: string; emotion: Emotion } {
  const match = raw.match(LEADING_TAG);
  const emotion = (match && toEmotion(match[1])) || "biasa";
  const body = match ? raw.slice(match[0].length) : raw;
  const text = body.replace(ANY_TAG, " ").replace(/\s{2,}/g, " ").trim();
  return { text: text || raw.trim(), emotion };
}
