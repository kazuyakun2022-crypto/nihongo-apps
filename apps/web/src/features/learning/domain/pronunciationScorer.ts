/**
 * Pronunciation Scorer & Phonetic Target Matching
 *
 * Menilai akurasi pelafalan bahasa Jepang menggunakan normalisasi fonetik
 * dan Levenshtein Distance dengan 3 tier umpan balik:
 * - 90–100%: Sangat tepat / penutur asli (Ding-dong sound + pujian)
 * - 60–89%: Bagus, umpan balik konstruktif (mis. panjang harakat / sokuon)
 * - < 60%: Belum pas, memotivasi tanpa menyalahkan secara kasar
 */

const PUNCTUATION = /[\s　。、．，,.!！?？「」『』（）()・~〜…"'“”\-—_+=/\\|*^%$#@!~`]/gu;

/** Normalisasi: NFKC, buang tanda baca, ubah Katakana ke Hiragana agar fonem setara */
export function normalizeJapaneseSpeech(text: string): string {
  return text
    .normalize("NFKC")
    .replace(PUNCTUATION, "")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .trim();
}

/** Hitung Levenshtein Distance antara dua array karakter */
export function phoneticDistance(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

export interface PronunciationScoreResult {
  score: number; // 0..100
  tier: "perfect" | "good" | "needs_work";
  isCorrect: boolean;
  tip: string;
  bestTarget: string;
  spokenNormalized: string;
  targetNormalized: string;
}

/** Periksa apakah perbedaan utama terletak pada panjang vokal (chouon) atau konsonan ganda (sokuon) */
function isVowelOrSokuonDifference(spoken: string, target: string): boolean {
  const vowels = new Set(["あ", "い", "う", "え", "お", "ー", "っ"]);
  const sChars = [...spoken];
  const tChars = [...target];
  // Jika panjang berbeda karena adanya vokal tambahan/kurang
  return Math.abs(sChars.length - tChars.length) <= 2 &&
    (sChars.some((c) => vowels.has(c)) || tChars.some((c) => vowels.has(c)));
}

/**
 * Menilai ucapan terhadap satu atau lebih target (mis. bacaan hiragana dan tulisan kanji).
 */
export function scorePronunciation(
  spoken: string,
  targets: string[],
): PronunciationScoreResult {
  const cleanSpoken = spoken.trim();
  const normSpoken = normalizeJapaneseSpeech(cleanSpoken);

  if (!normSpoken) {
    return {
      score: 0,
      tier: "needs_work",
      isCorrect: false,
      tip: "Suara tidak terdengar jelas. Ucapkan lagi lebih dekat ke mikrofon ya.",
      bestTarget: targets[0] ?? "",
      spokenNormalized: "",
      targetNormalized: normalizeJapaneseSpeech(targets[0] ?? ""),
    };
  }

  let bestScore = -1;
  let bestTarget = targets[0] ?? "";
  let bestTargetNorm = "";

  for (const t of targets) {
    if (!t) continue;
    const normTarget = normalizeJapaneseSpeech(t);
    if (!normTarget) continue;

    if (normSpoken === normTarget) {
      bestScore = 100;
      bestTarget = t;
      bestTargetNorm = normTarget;
      break;
    }

    const a = [...normSpoken];
    const b = [...normTarget];
    const maxLen = Math.max(a.length, b.length);
    const dist = phoneticDistance(a, b);
    const sim = Math.max(0, Math.round(((maxLen - dist) / maxLen) * 100));

    // Beri bonus jika salah satunya adalah substring penuh (mis. siswa melafalkan kata dalam partikel)
    const substringBonus = (normSpoken.includes(normTarget) || normTarget.includes(normSpoken)) && sim < 85 ? 85 : sim;

    if (substringBonus > bestScore) {
      bestScore = substringBonus;
      bestTarget = t;
      bestTargetNorm = normTarget;
    }
  }

  const finalScore = Math.max(0, bestScore);

  if (finalScore >= 90) {
    return {
      score: finalScore,
      tier: "perfect",
      isCorrect: true,
      tip: "Bagus sekali! Pelafalan dan intonasi penutur aslimu sangat tepat!",
      bestTarget,
      spokenNormalized: normSpoken,
      targetNormalized: bestTargetNorm,
    };
  }

  if (finalScore >= 60) {
    const vowelIssue = isVowelOrSokuonDifference(normSpoken, bestTargetNorm);
    const tip = vowelIssue
      ? "Bagus! Tapi perhatikan panjang harakat dan ketukan katanya ya (mis. membedakan vokal panjang)."
      : "Bagus! Sedikit lagi tepat, perhatikan kejelasan bunyi hurufnya ya.";

    return {
      score: finalScore,
      tier: "good",
      isCorrect: true,
      tip,
      bestTarget,
      spokenNormalized: normSpoken,
      targetNormalized: bestTargetNorm,
    };
  }

  return {
    score: finalScore,
    tier: "needs_work",
    isCorrect: false,
    tip: "Belum pas. Dengarkan contoh pelafalan Miu-chan dan coba lagi ya.",
    bestTarget,
    spokenNormalized: normSpoken,
    targetNormalized: bestTargetNorm,
  };
}

