/**
 * Jenis latihan dalam bab dan cara menilainya.
 * - pilihan_ganda / mendengar: options = pilihan, correctAnswer = salah satunya
 * - susun_huruf / susun_kalimat: options = semua kepingan (jawaban + pengecoh), correctAnswer = gabungan kepingan yang benar
 * - menulis: question = romaji, correctAnswer = tulisan Jepang yang ditulis tangan siswa
 * - berbicara: correctAnswer = kalimat yang diucapkan, options = variasi tulisan lain yang juga diterima (mis. versi kanji)
 */
export const EXERCISE_TYPES = ["pilihan_ganda", "mendengar", "susun_huruf", "susun_kalimat", "menulis", "berbicara"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const CHOICE_TYPES: readonly ExerciseType[] = ["pilihan_ganda", "mendengar"];
export const TILE_TYPES: readonly ExerciseType[] = ["susun_huruf", "susun_kalimat"];

/** Kemiripan minimal transkrip suara dengan kalimat target agar dianggap benar. */
export const SPEAKING_MIN_SIMILARITY = 0.8;

const PUNCTUATION = /[\s　。、．，,.!！?？「」『』（）()・~〜…"'“”]/gu;

/** Samakan bentuk teks sebelum dibandingkan: lebar karakter, spasi, dan tanda baca diabaikan. */
export function normalizeAnswer(text: string): string {
  return text.normalize("NFKC").replace(PUNCTUATION, "").toLowerCase();
}

/** Katakana → hiragana (ー dibiarkan), agar ucapan "コーヒー" dan "こーひー" dianggap sama. */
export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const KANA = /^[ぁ-ゖァ-ヺー]$/u;
export function isKana(char: string): boolean {
  return KANA.test(char);
}

/** Aksara jawaban soal menulis; "ー" ikut aksara mana pun. */
export function scriptOf(text: string): "hiragana" | "katakana" | "campuran" {
  const chars = [...text].filter((c) => c !== "ー");
  if (chars.length > 0 && chars.every((c) => /[ぁ-ゖ]/.test(c))) return "hiragana";
  if (chars.length > 0 && chars.every((c) => /[ァ-ヺ]/.test(c))) return "katakana";
  return "campuran";
}

function levenshtein(a: string[], b: string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0–1; 1 berarti sama persis setelah dinormalisasi. */
export function speechSimilarity(spoken: string, target: string): number {
  const a = [...toHiragana(normalizeAnswer(spoken))];
  const b = [...toHiragana(normalizeAnswer(target))];
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return 1 - levenshtein(a, b) / longest;
}

/** Apakah target bisa dibentuk dari sebagian kepingan (masing-masing dipakai paling banyak sekali). */
export function canCompose(target: string, tiles: string[]): boolean {
  const used = new Array<boolean>(tiles.length).fill(false);
  const walk = (rest: string): boolean => {
    if (rest === "") return true;
    for (let i = 0; i < tiles.length; i++) {
      if (used[i] || !tiles[i] || !rest.startsWith(tiles[i])) continue;
      used[i] = true;
      if (walk(rest.slice(tiles[i].length))) return true;
      used[i] = false;
    }
    return false;
  };
  return walk(target);
}

export interface ExerciseKey {
  type: ExerciseType;
  correctAnswer: string;
  options: string[];
}

export function isAnswerCorrect(key: ExerciseKey, answer: string): boolean {
  switch (key.type) {
    case "pilihan_ganda":
    case "mendengar":
      return answer.trim() === key.correctAnswer;
    case "berbicara":
      return [key.correctAnswer, ...key.options].some((t) => speechSimilarity(answer, t) >= SPEAKING_MIN_SIMILARITY);
    default:
      return normalizeAnswer(answer) !== "" && normalizeAnswer(answer) === normalizeAnswer(key.correctAnswer);
  }
}

/** Aturan isi soal per jenis; mengembalikan pesan kesalahan atau null bila valid. */
export function exerciseProblem(ex: ExerciseKey, chapterKanji: string[]): string | null {
  const { type, correctAnswer, options } = ex;
  if (!correctAnswer.trim()) return "Jawaban benar wajib diisi.";
  if (CHOICE_TYPES.includes(type)) {
    if (options.length < 2 || options.length > 6) return "Isi 2–6 pilihan jawaban.";
    if (new Set(options).size !== options.length || !options.includes(correctAnswer)) {
      return "Pilihan harus unik dan jawaban benar harus ada di antara pilihan.";
    }
  }
  if (TILE_TYPES.includes(type)) {
    if (options.length < 2 || options.length > 16) return "Isi 2–16 kepingan.";
    if (!canCompose(correctAnswer, options)) return "Jawaban benar harus bisa disusun dari kepingan yang tersedia.";
  }
  if (type === "menulis") {
    const chars = [...correctAnswer];
    if (chars.length > 12) return "Jawaban latihan menulis maksimal 12 huruf.";
    const unknown = chars.filter((c) => !isKana(c) && !chapterKanji.includes(c));
    if (unknown.length > 0) {
      return `Huruf ${unknown.join(" ")} tidak bisa dikenali dari tulisan tangan. Gunakan hiragana/katakana, atau tambahkan kanjinya ke daftar kanji bab ini.`;
    }
  }
  if (type === "berbicara" && options.length > 5) return "Maksimal 5 variasi jawaban.";
  return null;
}
