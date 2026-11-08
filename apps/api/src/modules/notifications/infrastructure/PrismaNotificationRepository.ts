import type { Prisma, NotificationType as PrismaNotificationType } from "@prisma/client";
import type { Db } from "../../../shared/infrastructure/prisma";
import { DEFAULT_PREFERENCES } from "../domain/types";
import type {
  NotificationInput,
  NotificationPreferenceSettings,
  NotificationRepository,
  NotificationType,
  NotificationView,
  PushSubscriptionRecord,
  ReminderCandidate,
} from "../domain/types";

type PreferenceRow = {
  pushEnabled: boolean;
  studyReminder: boolean;
  streak: boolean;
  achievement: boolean;
  exam: boolean;
  announcement: boolean;
  reminderTime: string;
  timezone: string;
};

function toPreferences(row: PreferenceRow | null): NotificationPreferenceSettings {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    pushEnabled: row.pushEnabled,
    studyReminder: row.studyReminder,
    streak: row.streak,
    achievement: row.achievement,
    exam: row.exam,
    announcement: row.announcement,
    reminderTime: row.reminderTime,
    timezone: row.timezone,
  };
}

const preferenceSelect = {
  pushEnabled: true,
  studyReminder: true,
  streak: true,
  achievement: true,
  exam: true,
  announcement: true,
  reminderTime: true,
  timezone: true,
} satisfies Prisma.NotificationPreferenceSelect;

const learnerWhere = {
  status: "active",
  role: { in: ["student", "premium"] },
} satisfies Prisma.UserWhereInput;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  async list(userId: string, limit: number): Promise<NotificationView[]> {
    const rows = await this.db.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      url: row.url,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  unreadCount(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const result = await this.db.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  async create(input: NotificationInput & { userId: string }): Promise<boolean> {
    try {
      await this.db.notification.create({
        data: {
          userId: input.userId,
          type: input.type as PrismaNotificationType,
          title: input.title,
          body: input.body,
          url: input.url ?? null,
          dedupeKey: input.dedupeKey ?? null,
          createdAt: input.createdAt,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceSettings | null> {
    const row = await this.db.notificationPreference.findUnique({ where: { userId }, select: preferenceSelect });
    return row ? toPreferences(row) : null;
  }

  async savePreferences(userId: string, preferences: NotificationPreferenceSettings): Promise<NotificationPreferenceSettings> {
    const row = await this.db.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: { ...preferences },
      select: preferenceSelect,
    });
    return toPreferences(row);
  }

  listSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.db.pushSubscription.findMany({
      where: { userId },
      select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true, failureCount: true },
    });
  }

  async saveSubscription(
    userId: string,
    data: { endpoint: string; p256dh: string; auth: string; userAgent?: string | null },
  ): Promise<void> {
    await this.db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: { userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, userAgent: data.userAgent ?? null },
      update: {
        userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent ?? null,
        failureCount: 0,
      },
    });
  }

  async deleteSubscription(userId: string, endpoint: string): Promise<void> {
    await this.db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async deleteSubscriptionById(id: string): Promise<void> {
    await this.db.pushSubscription.deleteMany({ where: { id } });
  }

  async incrementFailure(id: string): Promise<number> {
    const row = await this.db.pushSubscription.update({ where: { id }, data: { failureCount: { increment: 1 } }, select: { failureCount: true } });
    return row.failureCount;
  }

  async reminderCandidates(): Promise<ReminderCandidate[]> {
    const rows = await this.db.user.findMany({
      where: {
        status: "active",
        role: { in: ["student", "premium", "admin", "super_admin", "teacher"] },
      },
      select: {
        id: true,
        displayName: true,
        streakCount: true,
        lastActiveDate: true,
        notificationPreference: { select: preferenceSelect },
        _count: { select: { pushSubscriptions: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      streakCount: row.streakCount,
      lastActiveDate: row.lastActiveDate,
      preferences: toPreferences(row.notificationPreference),
      hasSubscription: row._count.pushSubscriptions > 0,
    }));
  }

  async announcementRecipients(): Promise<{ id: string; preferences: NotificationPreferenceSettings }[]> {
    const rows = await this.db.user.findMany({
      where: {
        status: "active",
        role: { in: ["student", "premium", "admin", "super_admin", "teacher"] },
      },
      select: { id: true, notificationPreference: { select: preferenceSelect } },
    });
    return rows.map((row) => ({ id: row.id, preferences: toPreferences(row.notificationPreference) }));
  }
}
