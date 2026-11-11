/** Jenis notifikasi yang dikenal aplikasi. Harus sama dengan enum NotificationType di Prisma. */
export const NOTIFICATION_TYPES = [
  "study_reminder",
  "srs_due",
  "streak",
  "achievement",
  "exam",
  "announcement",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationPreferenceSettings {
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

export const DEFAULT_PREFERENCES: NotificationPreferenceSettings = {
  pushEnabled: true,
  studyReminder: true,
  srsReminder: true,
  streak: true,
  achievement: true,
  exam: true,
  announcement: true,
  reminderTime: "19:00",
  quietHourStart: "22:00",
  quietHourEnd: "07:00",
  timezone: "Asia/Jakarta",
};

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  url: string | null;
  metadata?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string | null;
  createdAt: Date;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failureCount: number;
}

export interface ReminderCandidate {
  id: string;
  displayName: string;
  streakCount: number;
  lastActiveDate: Date | null;
  preferences: NotificationPreferenceSettings;
  hasSubscription: boolean;
  dueSrsCount?: number;
}

export interface NotificationRepository {
  list(userId: string, limit: number): Promise<NotificationView[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(userId: string, id: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
  create(input: NotificationInput & { userId: string }): Promise<boolean>;
  getPreferences(userId: string): Promise<NotificationPreferenceSettings | null>;
  savePreferences(userId: string, preferences: NotificationPreferenceSettings): Promise<NotificationPreferenceSettings>;
  listSubscriptions(userId: string): Promise<PushSubscriptionRecord[]>;
  saveSubscription(userId: string, data: { endpoint: string; p256dh: string; auth: string; userAgent?: string | null }): Promise<void>;
  deleteSubscription(userId: string, endpoint: string): Promise<void>;
  deleteSubscriptionById(id: string): Promise<void>;
  incrementFailure(id: string): Promise<number>;
  reminderCandidates(): Promise<ReminderCandidate[]>;
  announcementRecipients(): Promise<{ id: string; preferences: NotificationPreferenceSettings }[]>;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export interface PushSender {
  readonly enabled: boolean;
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<"ok" | "gone" | "error">;
}

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  metadata?: Record<string, unknown> | null;
  dedupeKey?: string;
}

export interface NotifyResult {
  created: boolean;
  pushSent: number;
}

/** Port untuk modul lain (progress, ujian) agar bisa memicu notifikasi tanpa tahu penyimpanannya. */
export interface Notifier {
  notify(userId: string, input: NotifyInput): Promise<NotifyResult>;
}
