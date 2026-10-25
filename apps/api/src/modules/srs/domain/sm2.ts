/**
 * Algoritma pengulangan berjeda SM-2 (dasar dari Anki), versi sederhana.
 * Fungsi murni: mudah diuji dan bebas dari database (lihat tests/sm2.test.ts).
 */
export type ReviewGrade = "lupa" | "sulit" | "bisa" | "mudah";

export interface CardSchedule {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapseCount: number;
}

const QUALITY: Record<ReviewGrade, number> = { lupa: 1, sulit: 3, bisa: 4, mudah: 5 };

/** Kartu dianggap "kata lemah" jika sudah lupa sebanyak ini (dipakai maskot, dokumen 8.3). */
export const WEAK_LAPSE_THRESHOLD = 3;

export function review(card: CardSchedule, grade: ReviewGrade): CardSchedule & { isWeak: boolean } {
  const q = QUALITY[grade];
  let { easeFactor, intervalDays, repetitions, lapseCount } = card;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapseCount += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    if (grade === "mudah") intervalDays = Math.max(intervalDays, Math.round(intervalDays * 1.3));
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    lapseCount,
    isWeak: lapseCount >= WEAK_LAPSE_THRESHOLD,
  };
}
