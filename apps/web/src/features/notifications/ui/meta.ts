import type { NotificationType } from "../domain/types";

export const TYPE_META: Record<NotificationType, { seal: string; label: string }> = {
  study_reminder: { seal: "学", label: "Pengingat belajar" },
  streak: { seal: "火", label: "Streak" },
  achievement: { seal: "賞", label: "Lencana" },
  exam: { seal: "合", label: "Ujian" },
  announcement: { seal: "お", label: "Pengumuman" },
  system: { seal: "！", label: "Sistem" },
};

export function notificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
