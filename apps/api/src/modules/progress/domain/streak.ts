/**
 * Aturan streak harian. Hari dihitung menurut zona waktu Indonesia bagian barat (WIB),
 * karena belajar jam 23.30 WIB tetap dianggap hari itu oleh pengguna, bukan hari berikutnya (UTC).
 */
export const STREAK_TIMEZONE = "Asia/Jakarta";

/** Tanggal kalender (YYYY-MM-DD) di zona waktu streak. */
export function localDay(at: Date, timeZone = STREAK_TIMEZONE): string {
  // en-CA memformat tanggal sebagai YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

/** Kolom last_active_date bertipe DATE: Prisma mengembalikannya sebagai tengah malam UTC tanggal tersebut. */
export function dayFromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dbDateFromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((dbDateFromDay(toDay).getTime() - dbDateFromDay(fromDay).getTime()) / 86_400_000);
}

/** Streak baru setelah pengguna menyelesaikan aktivitas belajar hari ini. */
export function nextStreak(current: number, lastActive: Date | null, now: Date): { streak: number; today: string; isNewDay: boolean } {
  const today = localDay(now);
  if (!lastActive) return { streak: 1, today, isNewDay: true };
  const gap = daysBetween(dayFromDbDate(lastActive), today);
  if (gap <= 0) return { streak: Math.max(current, 1), today, isNewDay: false };
  if (gap === 1) return { streak: current + 1, today, isNewDay: true };
  return { streak: 1, today, isNewDay: true };
}

/**
 * Streak yang ditampilkan. Kolom streak_count baru berubah saat pengguna belajar lagi,
 * jadi pengguna yang melewatkan satu hari penuh harus melihat 0, bukan angka lama.
 */
export function visibleStreak(current: number, lastActive: Date | null, now: Date): number {
  if (!lastActive || current <= 0) return 0;
  const gap = daysBetween(dayFromDbDate(lastActive), localDay(now));
  return gap <= 1 ? current : 0;
}
