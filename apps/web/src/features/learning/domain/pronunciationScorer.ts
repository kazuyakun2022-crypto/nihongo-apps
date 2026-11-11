import {
  hasKanji,
  isSpeakingMatch,
  normalizePhoneticSpeech,
  type SpeakingTarget,
} from "./speakingTarget";

/**
 * Pronunciation Scorer & Phonetic Target Matching
 *
 * Menilai akurasi pelafalan bahasa Jepang menggunakan normalisasi fonetik,
 * Dual-Field Schema (acceptedReadings), dan Levenshtein Distance dengan 3 tier:
 * - 90–100%: Sangat tepat / penutur asli (Ding-dong sound + pujian)
 * - 60–89%: Bagus, umpan balik konstruktif (mis. panjang harakat / sokuon)
 * - < 60%: Belum pas, memotivasi tanpa menyalahkan secara kasar
 */

const PUNCTUATION = /[\s　。、．，,.!！?？「」『』（）()・~〜…"'“”\-—_+=/\\|*^%$#@!~`]/gu;

/** Normalisasi dasar: NFKC, buang tanda baca, ubah Katakana ke Hiragana agar fonem setara */
export function normalizeJapaneseSpeech(text: string): string {
  return normalizePhoneticSpeech(text);
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
  isKanjiMatch?: boolean;
  displayFeedbackText?: string;
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
 * Menilai ucapan terhadap satu atau lebih target (mis. bacaan hiragana dan tulisan kanji)
 * atau objek SpeakingTarget berstruktur ganda.
 */
export function scorePronunciation(
  spoken: string,
  targetsInput: string[] | SpeakingTarget,
): PronunciationScoreResult {
  const cleanSpoken = spoken.trim();
  const isTargetObject = typeof targetsInput === "object" && !Array.isArray(targetsInput);
  const speakingTarget: SpeakingTarget | null = isTargetObject ? (targetsInput as SpeakingTarget) : null;
  const targets: string[] = isTargetObject
    ? (targetsInput as SpeakingTarget).acceptedReadings
    : (targetsInput as string[]);

  const normSpoken = normalizePhoneticSpeech(cleanSpoken);

  if (!normSpoken) {
    return {
      score: 0,
      tier: "needs_work",
      isCorrect: false,
      tip: "Suara tidak terdengar jelas. Ucapkan lagi lebih dekat ke mikrofon ya.",
      bestTarget: targets[0] ?? "",
      spokenNormalized: "",
      targetNormalized: normalizePhoneticSpeech(targets[0] ?? ""),
    };
  }

  // 1. Cek kecocokan instan Dual-Field Schema bila target adalah SpeakingTarget
  if (speakingTarget && isSpeakingMatch(cleanSpoken, speakingTarget)) {
    const isKanji = hasKanji(cleanSpoken) && !hasKanji(speakingTarget.displayText);
    const feedbackText = `Pelafalanmu tepat! ${speakingTarget.displayText}${
      speakingTarget.romaji ? ` (${speakingTarget.romaji})` : ""
    } 🎉`;

    return {
      score: 100,
      tier: "perfect",
      isCorrect: true,
      tip: isKanji ? feedbackText : "Bagus sekali! Pelafalan dan intonasi penutur aslimu sangat tepat!",
      bestTarget: speakingTarget.displayText,
      spokenNormalized: normSpoken,
      targetNormalized: normalizePhoneticSpeech(speakingTarget.phoneticTarget),
      isKanjiMatch: isKanji,
      displayFeedbackText: feedbackText,
    };
  }

  let bestScore = -1;
  let bestTarget = targets[0] ?? "";
  let bestTargetNorm = "";
  let matchedKanji = false;

  for (const t of targets) {
    if (!t) continue;
    const normTarget = normalizePhoneticSpeech(t);
    if (!normTarget) continue;

    if (normSpoken === normTarget) {
      bestScore = 100;
      bestTarget = t;
      bestTargetNorm = normTarget;
      if (hasKanji(cleanSpoken) && !hasKanji(t)) matchedKanji = true;
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
      if (hasKanji(cleanSpoken) && !hasKanji(t)) matchedKanji = true;
    }
  }

  const finalScore = Math.max(0, bestScore);

  if (finalScore >= 90) {
    const displayTarget = speakingTarget?.displayText || bestTarget;
    const romajiPart = speakingTarget?.romaji ? ` (${speakingTarget.romaji})` : "";
    const feedbackText = `Pelafalanmu tepat! ${displayTarget}${romajiPart} 🎉`;

    return {
      score: finalScore,
      tier: "perfect",
      isCorrect: true,
      tip: matchedKanji ? feedbackText : "Bagus sekali! Pelafalan dan intonasi penutur aslimu sangat tepat!",
      bestTarget,
      spokenNormalized: normSpoken,
      targetNormalized: bestTargetNorm,
      isKanjiMatch: matchedKanji,
      displayFeedbackText: feedbackText,
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
      isKanjiMatch: matchedKanji,
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
    isKanjiMatch: false,
  };
}

