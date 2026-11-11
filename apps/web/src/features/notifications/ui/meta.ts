import type { NotificationType } from "../domain/types";

export type NotificationCategoryTab = "all" | "srs" | "exam" | "system";

export const TYPE_META: Record<
  NotificationType,
  { seal: string; label: string; category: Exclude<NotificationCategoryTab, "all"> }
> = {
  study_reminder: { seal: "学", label: "Pengingat belajar", category: "srs" },
  srs_due: { seal: "復", label: "Ulasan SRS", category: "srs" },
  streak: { seal: "火", label: "Streak", category: "srs" },
  achievement: { seal: "賞", label: "Lencana", category: "exam" },
  exam: { seal: "合", label: "Ujian & Tulis", category: "exam" },
  announcement: { seal: "お", label: "Pengumuman", category: "system" },
  system: { seal: "！", label: "Sistem", category: "system" },
};

export function notificationCategory(type: NotificationType): Exclude<NotificationCategoryTab, "all"> {
  return TYPE_META[type]?.category ?? "system";
}

export function notificationDayGroup(iso: string): "Hari Ini" | "Kemarin" | "Sebelumnya" {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sebelumnya";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (targetStart >= todayStart) return "Hari Ini";
  if (targetStart >= yesterdayStart) return "Kemarin";
  return "Sebelumnya";
}

export function notificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec >= 0 && diffSec < 60) return "Baru saja";
  if (diffSec >= 60 && diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec >= 3600 && diffSec < 86400 && notificationDayGroup(iso) === "Hari Ini") {
    return `${Math.floor(diffSec / 3600)} jam lalu`;
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
