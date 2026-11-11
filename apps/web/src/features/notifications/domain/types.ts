export type NotificationType = "study_reminder" | "srs_due" | "streak" | "achievement" | "exam" | "announcement" | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  metadata?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  studyReminder: boolean;
  srsReminder: boolean;
  streak: boolean;
  achievement: boolean;
  exam: boolean;
  announcement: boolean;
  reminderTime: string;
  quietHourStart: string | null;
  quietHourEnd: string | null;
  timezone: string;
}

export interface PushConfig {
  enabled: boolean;
  publicKey: string;
}

export type PushState = "unsupported" | "inactive" | "subscribed" | "denied" | "loading";
