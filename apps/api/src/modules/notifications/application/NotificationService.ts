import type { Clock } from "../../../shared/domain/types";
import { Errors } from "../../../shared/domain/errors";
import { isTypeEnabled, isValidTimeZone, parseReminderTime, planReminder } from "../domain/policy";
import { DEFAULT_PREFERENCES } from "../domain/types";
import type {
  NotificationPreferenceSettings,
  NotificationRepository,
  NotificationView,
  Notifier,
  NotifyInput,
  NotifyResult,
  PushPayload,
  PushSender,
} from "../domain/types";

const MAX_FAILURES = 5;

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return results;
}

export interface NotificationServiceDeps {
  repo: NotificationRepository;
  push: PushSender;
  publicKey: string;
  clock: Clock;
}

export class NotificationService implements Notifier {
  constructor(private readonly deps: NotificationServiceDeps) {}

  private get repo() {
    return this.deps.repo;
  }

  async notify(userId: string, input: NotifyInput): Promise<NotifyResult> {
    const preferences = (await this.repo.getPreferences(userId)) ?? undefined;
    return this.deliver(userId, input, preferences);
  }

  async notifyTest(userId: string, name?: string): Promise<NotifyResult> {
    const { push, clock } = this.deps;
    const created = await this.repo.create({
      userId,
      type: "announcement",
      title: "Miu-chan menyapa 🔔",
      body: `Halo ${name || "Pelajar"}! Notifikasi Nihongo aktif dan siap mengingatkanmu belajar.`,
      url: "/beranda",
      dedupeKey: `test:${userId}:${clock.now().getTime()}`,
      createdAt: clock.now(),
    });
    if (!created) return { created: false, pushSent: 0 };
    if (!push.enabled) return { created: true, pushSent: 0 };

    const subscriptions = await this.repo.listSubscriptions(userId);
    if (!subscriptions.length) return { created: true, pushSent: 0 };

    const payload: PushPayload = {
      title: "Miu-chan menyapa 🔔",
      body: `Halo ${name || "Pelajar"}! Notifikasi Nihongo aktif dan siap mengingatkanmu belajar.`,
      url: "/beranda",
      tag: `test:${userId}`,
    };

    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        const result = await push.send(subscription, payload);
        if (result === "gone") {
          await this.repo.deleteSubscriptionById(subscription.id);
        } else if (result === "error") {
          const failures = await this.repo.incrementFailure(subscription.id);
          if (failures >= MAX_FAILURES) await this.repo.deleteSubscriptionById(subscription.id);
        }
        return result;
      }),
    );
    return { created: true, pushSent: results.filter((r) => r === "ok").length };
  }

  private async deliver(
    userId: string,
    input: NotifyInput,
    preferences?: NotificationPreferenceSettings,
  ): Promise<NotifyResult> {
    const { push, clock } = this.deps;
    const prefs = preferences ?? (await this.repo.getPreferences(userId)) ?? undefined;

    if (prefs && !isTypeEnabled(prefs, input.type)) return { created: false, pushSent: 0 };

    const created = await this.repo.create({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      dedupeKey: input.dedupeKey ?? null,
      createdAt: clock.now(),
    });
    if (!created) return { created: false, pushSent: 0 };
    if (!push.enabled || (prefs && !prefs.pushEnabled)) return { created: true, pushSent: 0 };

    const subscriptions = await this.repo.listSubscriptions(userId);
    if (!subscriptions.length) return { created: true, pushSent: 0 };

    const payload: PushPayload = {
      title: input.title,
      body: input.body,
      url: input.url ?? "/beranda",
      tag: input.dedupeKey ?? `${input.type}:${userId}`,
    };

    const results = await Promise.all(
      subscriptions.map(async (subscription) => {
        const result = await push.send(subscription, payload);
        if (result === "gone") {
          await this.repo.deleteSubscriptionById(subscription.id);
        } else if (result === "error") {
          const failures = await this.repo.incrementFailure(subscription.id);
          if (failures >= MAX_FAILURES) await this.repo.deleteSubscriptionById(subscription.id);
        }
        return result;
      }),
    );
    return { created: true, pushSent: results.filter((r) => r === "ok").length };
  }

  list(userId: string, limit = 50): Promise<NotificationView[]> {
    return this.repo.list(userId, Math.min(Math.max(limit, 1), 100));
  }

  unreadCount(userId: string): Promise<number> {
    return this.repo.unreadCount(userId);
  }

  async markRead(userId: string, id: string): Promise<{ read: boolean }> {
    return { read: await this.repo.markRead(userId, id) };
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    return { updated: await this.repo.markAllRead(userId) };
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceSettings> {
    const stored = await this.repo.getPreferences(userId);
    return stored ?? { ...DEFAULT_PREFERENCES };
  }

  async updatePreferences(
    userId: string,
    patch: Partial<NotificationPreferenceSettings>,
  ): Promise<NotificationPreferenceSettings> {
    const current = await this.getPreferences(userId);
    const next: NotificationPreferenceSettings = { ...current, ...patch };

    if (!isValidTimeZone(next.timezone)) throw Errors.validation("Zona waktu tidak valid.");
    if (parseReminderTime(next.reminderTime) === null) throw Errors.validation("Jam pengingat harus berformat HH:MM.");

    return this.repo.savePreferences(userId, next);
  }

  config(): { enabled: boolean; publicKey: string } {
    return { enabled: this.deps.push.enabled && Boolean(this.deps.publicKey), publicKey: this.deps.publicKey };
  }

  async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string | null },
  ): Promise<{ ok: true }> {
    await this.repo.saveSubscription(userId, {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: subscription.userAgent ?? null,
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string): Promise<{ ok: true }> {
    await this.repo.deleteSubscription(userId, endpoint);
    return { ok: true };
  }

  async runReminders(now: Date): Promise<{ checked: number; created: number; pushSent: number }> {
    const candidates = await this.repo.reminderCandidates();
    let created = 0;
    let pushSent = 0;

    await inBatches(candidates, 20, async (candidate) => {
      const plan = planReminder(candidate, now);
      if (!plan) return;
      const result = await this.deliver(candidate.id, plan, candidate.preferences);
      if (result.created) created += 1;
      pushSent += result.pushSent;
    });

    return { checked: candidates.length, created, pushSent };
  }

  async broadcast(input: { title: string; body: string; url?: string | null }): Promise<{
    recipients: number;
    created: number;
    pushSent: number;
  }> {
    const recipients = await this.repo.announcementRecipients();
    let created = 0;
    let pushSent = 0;
    const now = this.deps.clock.now();

    await inBatches(recipients, 20, async (recipient) => {
      if (!recipient.preferences.announcement) return;
      const result = await this.deliver(
        recipient.id,
        {
          type: "announcement",
          title: input.title,
          body: input.body,
          url: input.url ?? "/notifikasi",
        },
        recipient.preferences,
      );
      if (result.created) created += 1;
      pushSent += result.pushSent;
    });

    return { recipients: recipients.length, created, pushSent };
  }
}
