import { STREAK_TIMEZONE, dayFromDbDate, daysBetween, localDay } from "../../progress/domain/streak";
import type { NotificationPreferenceSettings, NotificationType, ReminderCandidate, NotifyInput } from "./types";

const PREFERENCE_BY_TYPE: Record<NotificationType, keyof NotificationPreferenceSettings | null> = {
  study_reminder: "studyReminder",
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

/**
 * Pengingat hanya dibuat setelah jam pengingat pengguna lewat, dan tidak dibuat sama sekali
 * bila pengguna sudah belajar hari itu. dedupe harian mencegah cron 15 menit mengirim berulang.
 */
export function planReminder(candidate: ReminderCandidate, now: Date): NotifyInput | null {
  const preferences = candidate.preferences;
  const { day, minutes } = localClock(now, preferences.timezone);
  const target = parseReminderTime(preferences.reminderTime);
  if (target === null || minutes < target) return null;

  if (candidate.lastActiveDate && dayFromDbDate(candidate.lastActiveDate) === day) return null;

  const dedupeKey = `daily:${candidate.id}:${day}`;
  const streakAtRisk =
    candidate.streakCount >= 2 &&
    candidate.lastActiveDate !== null &&
    daysBetween(dayFromDbDate(candidate.lastActiveDate), day) === 1;

  if (streakAtRisk && preferences.streak) {
    return {
      type: "streak",
      title: `Streak ${candidate.streakCount} hari hampir putus`,
      body: "Belum ada latihan hari ini. Satu sesi singkat sudah cukup untuk menjaga streak-mu tetap hidup.",
      url: "/beranda",
      dedupeKey,
    };
  }

  if (!preferences.studyReminder) return null;

  return {
    type: "study_reminder",
    title: "Waktunya belajar sebentar",
    body: `${firstName(candidate.displayName)}, Miu-chan sudah menunggu. Lima menit latihan hari ini sudah cukup untuk menjaga kebiasaan.`,
    url: "/beranda",
    dedupeKey,
  };
}
