export type NotificationType = "study_reminder" | "streak" | "achievement" | "exam" | "announcement" | "system";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  studyReminder: boolean;
  streak: boolean;
  achievement: boolean;
  exam: boolean;
  announcement: boolean;
  reminderTime: string;
  timezone: string;
}

export interface PushConfig {
  enabled: boolean;
  publicKey: string;
}

export type PushState = "unsupported" | "inactive" | "subscribed" | "denied" | "loading";
