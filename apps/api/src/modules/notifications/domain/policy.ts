import { STREAK_TIMEZONE, dayFromDbDate, daysBetween, localDay } from "../../progress/domain/streak";
import type { NotificationPreferenceSettings, NotificationType, ReminderCandidate, NotifyInput } from "./types";

const PREFERENCE_BY_TYPE: Record<NotificationType, keyof NotificationPreferenceSettings | null> = {
  study_reminder: "studyReminder",
  srs_due: "srsReminder",
  streak: "streak",
  achievement: "achievement",
  exam: "exam",
  announcement: "announcement",
  system: null,
};

export function preferenceFor(type: NotificationType): keyof NotificationPreferenceSettings | null {
  return PREFERENCE_BY_TYPE[type];
}

export function isTypeEnabled(preferences: NotificationPreferenceSettings, type: NotificationType): boolean {
  const key = PREFERENCE_BY_TYPE[type];
  return key ? Boolean(preferences[key]) : true;
}

/** Jam lokal (0–1439) dan tanggal kalender di zona waktu pengguna. */
export function localClock(at: Date, timeZone: string): { day: string; minutes: number } {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(at);
  } catch {
    zone = STREAK_TIMEZONE;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const value = (kind: string) => Number(parts.find((p) => p.type === kind)?.value ?? 0);
  return {
    day: localDay(at, zone),
    minutes: value("hour") * 60 + value("minute"),
  };
}

export function parseReminderTime(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function firstName(displayName: string): string {
  const name = displayName.trim().split(/\s+/)[0];
  return name || "Sobat Nihongo";
}

export function isWithinQuietHours(
  minutes: number,
  startStr?: string | null,
  endStr?: string | null,
): boolean {
  if (!startStr || !endStr) return false;
  const start = parseReminderTime(startStr);
  const end = parseReminderTime(endStr);
  if (start === null || end === null || start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  // Rentang melewati tengah malam (mis. 22:00 → 07:00)
  return minutes >= start || minutes < end;
}

/**
 * Pengingat hanya dibuat setelah jam pengingat pengguna lewat (atau peringatan streak darurat
 * dalam 3 jam terakhir sebelum tengah malam), mematuhi jam tenang untuk pengingat non-darurat,
 * dan tidak dibuat bila pengguna sudah belajar hari itu.
 */
export function planReminder(candidate: ReminderCandidate, now: Date): NotifyInput | null {
  const preferences = candidate.preferences;
  const { day, minutes } = localClock(now, preferences.timezone);
  const target = parseReminderTime(preferences.reminderTime);

  const alreadyActiveToday =
    candidate.lastActiveDate !== null && dayFromDbDate(candidate.lastActiveDate) === day;
  if (alreadyActiveToday) return null;

  const dedupeKey = `daily:${candidate.id}:${day}`;
  const streakAtRisk =
    candidate.streakCount >= 2 &&
    candidate.lastActiveDate !== null &&
    daysBetween(dayFromDbDate(candidate.lastActiveDate), day) === 1;
  const lastThreeHoursBeforeMidnight = minutes >= 21 * 60;

  // Peringatan streak darurat boleh menembus jam tenang malam bila tersisa ≤3 jam sebelum ganti hari
  if (
    streakAtRisk &&
    preferences.streak &&
    ((target !== null && minutes >= target) || lastThreeHoursBeforeMidnight)
  ) {
    return {
      type: "streak",
      title: `Streak ${candidate.streakCount} hari dalam bahaya! 🔥`,
      body: "Malam akan segera berganti! Selesaikan 1 latihan mini sekarang agar api streak belajarmu tidak padam.",
      url: "/belajar",
      metadata: { streakCount: candidate.streakCount },
      dedupeKey,
    };
  }

  // Hormati jam tenang pengguna untuk pengingat non-darurat
  if (isWithinQuietHours(minutes, preferences.quietHourStart, preferences.quietHourEnd)) {
    return null;
  }

  if (target === null || minutes < target) return null;

  if ((candidate.dueSrsCount ?? 0) > 0 && preferences.srsReminder) {
    const dueCount = candidate.dueSrsCount!;
    return {
      type: "srs_due",
      title: `${dueCount} Kosakata Menunggumu! 🌸`,
      body: "Nya~! Otakmu sedang dalam momen terbaik untuk mengingat materi hari ini. Ulas 3 menit yuk sebelum lupa!",
      url: "/review",
      metadata: { dueCount },
      dedupeKey,
    };
  }

  if (!preferences.studyReminder) return null;

  return {
    type: "study_reminder",
    title: "Waktunya belajar sebentar 🌸",
    body: `${firstName(candidate.displayName)}, Miu-chan sudah menunggu. Lima menit latihan hari ini sudah cukup untuk menjaga kebiasaan.`,
    url: "/beranda",
    dedupeKey,
  };
}
