export {
  scorePronunciation,
  normalizeJapaneseSpeech,
  phoneticDistance,
  type PronunciationScoreResult,
} from "./pronunciationScorer";
export {
  createSpeakingTarget,
  isSpeakingMatch,
  sanitizePreN5Kana,
  hasKanji,
  type SpeakingTarget,
} from "./speakingTarget";
import { normalizePhoneticSpeech } from "./speakingTarget";

/**
 * Kemiripan ucapan dengan kalimat target, sama dengan penilaian server (api: learning/domain/Exercise.ts),
 * dipakai untuk umpan balik langsung setelah siswa berbicara.
 */
export const SPEAKING_MIN_SIMILARITY = 0.8;

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

/** 0–1; 1 berarti sama persis setelah dinormalisasi fonetik. */
export function speechSimilarity(spoken: string, target: string): number {
  const normSpoken = normalizePhoneticSpeech(spoken);
  const normTarget = normalizePhoneticSpeech(target);
  if (normSpoken === normTarget) return 1;

  const a = [...normSpoken];
  const b = [...normTarget];
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  return 1 - levenshtein(a, b) / longest;
}

/** Apakah ucapan dianggap benar terhadap target atau salah satu variasinya. */
export function speechMatches(spoken: string, targets: string[]): boolean {
  return targets.some((t) => t && speechSimilarity(spoken, t) >= SPEAKING_MIN_SIMILARITY);
}
