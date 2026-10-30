/**
 * Mastery Gate Pre-N5: uji refleks 46 hiragana + 10 kosakata kana sebelum level N5 dibuka.
 * Setiap soal harus dijawab benar dalam batas waktu; lulus bila akurasi mencapai ambang.
 */
export const MASTERY_GATE = {
  minAccuracyPercent: 95,
  maxResponseMs: 1500,
  vocabItems: 10,
  /** Kelonggaran jaringan/perangkat di atas batas waktu yang terlihat siswa. */
  graceMs: 150,
} as const;

/** 46 hiragana dasar (seion) dengan romaji Hepburn. */
export const HIRAGANA_BASIC: [string, string][] = [
  ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
  ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
  ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
  ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
  ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
  ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
  ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
  ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
  ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
  ["わ", "wa"], ["を", "wo"], ["ん", "n"],
];

export interface GateItem {
  kind: "huruf" | "kata";
  prompt: string;
  options: string[];
  answer: string;
  vocabId?: string;
}

export interface GateAnswer {
  index: number;
  answer: string | null;
  ms: number;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Tiga pengecoh acak dari kumpulan jawaban lain, ditambah jawaban benar, diacak. */
function optionsFor(answer: string, pool: string[]): string[] {
  const distractors = shuffle([...new Set(pool.filter((p) => p !== answer))]).slice(0, 3);
  return shuffle([answer, ...distractors]);
}

export function buildGateItems(vocab: { id: string; word: string; meaning: string }[]): GateItem[] {
  const romaji = HIRAGANA_BASIC.map(([, r]) => r);
  const huruf: GateItem[] = HIRAGANA_BASIC.map(([char, r]) => ({ kind: "huruf", prompt: char, answer: r, options: optionsFor(r, romaji) }));
  const meanings = vocab.map((v) => v.meaning);
  const kata: GateItem[] = shuffle(vocab)
    .slice(0, MASTERY_GATE.vocabItems)
    .map((v) => ({ kind: "kata", prompt: v.word, answer: v.meaning, options: optionsFor(v.meaning, meanings), vocabId: v.id }));
  return shuffle([...huruf, ...kata]);
}

export function gradeGate(items: GateItem[], answers: GateAnswer[]) {
  const byIndex = new Map(answers.map((a) => [a.index, a]));
  const limit = MASTERY_GATE.maxResponseMs + MASTERY_GATE.graceMs;
  const results = items.map((item, index) => {
    const a = byIndex.get(index);
    const right = !!a && a.answer === item.answer;
    const slow = !a || a.ms > limit;
    return { index, kind: item.kind, prompt: item.prompt, answer: item.answer, given: a?.answer ?? null, ms: a?.ms ?? null, correct: right && !slow, slow: right && slow };
  });
  const correct = results.filter((r) => r.correct).length;
  const accuracy = items.length ? Math.round((correct / items.length) * 100) : 0;
  const timed = results.filter((r) => r.ms != null);
  const avgMs = timed.length ? Math.round(timed.reduce((s, r) => s + (r.ms ?? 0), 0) / timed.length) : 0;
  return { results, accuracy, avgMs, passed: accuracy >= MASTERY_GATE.minAccuracyPercent };
}
