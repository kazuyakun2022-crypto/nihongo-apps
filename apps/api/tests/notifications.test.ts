import { describe, expect, it } from "vitest";
import { NotificationService } from "../src/modules/notifications/application/NotificationService";
import { planReminder } from "../src/modules/notifications/domain/policy";
import {
  DEFAULT_PREFERENCES,
  type NotificationInput,
  type NotificationPreferenceSettings,
  type NotificationRepository,
  type NotificationView,
  type PushPayload,
  type PushSender,
  type PushSubscriptionRecord,
  type ReminderCandidate,
} from "../src/modules/notifications/domain/types";

class FakeRepo implements NotificationRepository {
  rows: (NotificationView & { userId: string; dedupeKey: string | null })[] = [];
  prefs = new Map<string, NotificationPreferenceSettings>();
  subs: PushSubscriptionRecord[] = [];
  candidates: ReminderCandidate[] = [];
  recipients: { id: string; preferences: NotificationPreferenceSettings }[] = [];
  deleted: string[] = [];

  async list(userId: string, limit: number) {
    return this.rows.filter((r) => r.userId === userId).slice(0, limit);
  }
  async unreadCount(userId: string) {
    return this.rows.filter((r) => r.userId === userId && !r.readAt).length;
  }
  async markRead(userId: string, id: string) {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!row || row.readAt) return false;
    row.readAt = new Date().toISOString();
    return true;
  }
  async markAllRead(userId: string) {
    const unread = this.rows.filter((r) => r.userId === userId && !r.readAt);
    unread.forEach((r) => (r.readAt = new Date().toISOString()));
    return unread.length;
  }
  async create(input: NotificationInput & { userId: string }) {
    if (input.dedupeKey && this.rows.some((r) => r.dedupeKey === input.dedupeKey)) return false;
    this.rows.push({
      id: `n-${this.rows.length + 1}`,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
      readAt: null,
      createdAt: input.createdAt.toISOString(),
      dedupeKey: input.dedupeKey ?? null,
    });
    return true;
  }
  async getPreferences(userId: string) {
    return this.prefs.get(userId) ?? null;
  }
  async savePreferences(userId: string, preferences: NotificationPreferenceSettings) {
    this.prefs.set(userId, preferences);
    return preferences;
  }
  async listSubscriptions(userId: string) {
    return this.subs.filter((s) => s.userId === userId);
  }
  async saveSubscription(userId: string, data: { endpoint: string; p256dh: string; auth: string; userAgent?: string | null }) {
    const existing = this.subs.find((s) => s.endpoint === data.endpoint);
    if (existing) {
      Object.assign(existing, { userId, p256dh: data.p256dh, auth: data.auth });
      return;
    }
    this.subs.push({ id: `s-${this.subs.length + 1}`, userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, failureCount: 0 });
  }
  async deleteSubscription(userId: string, endpoint: string) {
    this.subs = this.subs.filter((s) => !(s.userId === userId && s.endpoint === endpoint));
  }
  async deleteSubscriptionById(id: string) {
    this.deleted.push(id);
    this.subs = this.subs.filter((s) => s.id !== id);
  }
  async incrementFailure(id: string) {
    const sub = this.subs.find((s) => s.id === id);
    if (!sub) return 0;
    sub.failureCount += 1;
    return sub.failureCount;
  }
  async reminderCandidates() {
    return this.candidates;
  }
  async announcementRecipients() {
    return this.recipients;
  }
}

class FakePush implements PushSender {
  enabled = true;
  results: ("ok" | "gone" | "error")[] = [];
  sent: { subscription: PushSubscriptionRecord; payload: PushPayload }[] = [];

  async send(subscription: PushSubscriptionRecord, payload: PushPayload) {
    this.sent.push({ subscription, payload });
    return this.results.shift() ?? "ok";
  }
}

function candidate(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    id: "u1",
    displayName: "Sakura Tanaka",
    streakCount: 0,
    lastActiveDate: null,
    preferences: { ...DEFAULT_PREFERENCES },
    hasSubscription: true,
    ...overrides,
  };
}

function serviceWith() {
  const repo = new FakeRepo();
  const push = new FakePush();
  const service = new NotificationService({
    repo,
    push,
    publicKey: "public-key",
    clock: { now: () => new Date("2026-11-05T12:00:00Z") },
  });
  return { repo, push, service };
}

describe("pengingat belajar", () => {
  it("mengirim setelah jam pengingat lokal, bukan sebelum", () => {
    // 19:00 WIB = 12:00 UTC
    const at = new Date("2026-11-05T12:00:00Z");
    expect(planReminder(candidate(), at)).toMatchObject({ type: "study_reminder", dedupeKey: "daily:u1:2026-11-05" });
    expect(planReminder(candidate(), new Date("2026-11-05T11:59:00Z"))).toBeNull();
  });

  it("tidak mengirim bila pengguna sudah belajar hari itu", () => {
    const at = new Date("2026-11-05T12:00:00Z");
    expect(planReminder(candidate({ lastActiveDate: new Date("2026-11-05T00:00:00Z") }), at)).toBeNull();
  });

  it("memakai pesan streak saat streak berisiko putus", () => {
    const at = new Date("2026-11-05T12:00:00Z");
    const plan = planReminder(
      candidate({ streakCount: 6, lastActiveDate: new Date("2026-11-04T00:00:00Z") }),
      at,
    );
    expect(plan?.type).toBe("streak");
    expect(plan?.title).toContain("6 hari");
  });

  it("tetap mengirim pengingat biasa bila preferensi streak dimatikan", () => {
    const at = new Date("2026-11-05T12:00:00Z");
    const plan = planReminder(
      candidate({
        streakCount: 6,
        lastActiveDate: new Date("2026-11-04T00:00:00Z"),
        preferences: { ...DEFAULT_PREFERENCES, streak: false },
      }),
      at,
    );
    expect(plan?.type).toBe("study_reminder");
  });

  it("menghormati zona waktu pengguna", () => {
    const at = new Date("2026-11-05T12:00:00Z");
    const tokyo = candidate({ preferences: { ...DEFAULT_PREFERENCES, timezone: "Asia/Tokyo", reminderTime: "21:00" } });
    const newYork = candidate({ preferences: { ...DEFAULT_PREFERENCES, timezone: "America/New_York", reminderTime: "19:00" } });
    expect(planReminder(tokyo, at)?.type).toBe("study_reminder");
    expect(planReminder(newYork, at)).toBeNull();
  });

  it("zona waktu tidak valid jatuh ke WIB", () => {
    const at = new Date("2026-11-05T12:00:00Z");
    const plan = planReminder(candidate({ preferences: { ...DEFAULT_PREFERENCES, timezone: "Bukan/Zona" } }), at);
    expect(plan?.type).toBe("study_reminder");
  });
});

describe("layanan notifikasi", () => {
  it("membuat notifikasi in-app dan push", async () => {
    const { repo, push, service } = serviceWith();
    repo.subs = [{ id: "s1", userId: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a", failureCount: 0 }];

    const result = await service.notify("u1", { type: "achievement", title: "Lencana baru", body: "Hebat!" });

    expect(result).toEqual({ created: true, pushSent: 1 });
    expect(repo.rows).toHaveLength(1);
    expect(push.sent[0].payload).toMatchObject({ title: "Lencana baru", url: "/beranda" });
  });

  it("tidak membuat notifikasi yang dimatikan pengguna", async () => {
    const { repo, push, service } = serviceWith();
    repo.prefs.set("u1", { ...DEFAULT_PREFERENCES, achievement: false });

    const result = await service.notify("u1", { type: "achievement", title: "Lencana baru", body: "Hebat!" });

    expect(result).toEqual({ created: false, pushSent: 0 });
    expect(repo.rows).toHaveLength(0);
    expect(push.sent).toHaveLength(0);
  });

  it("tidak mengirim push ganda saat dedupe key sudah ada", async () => {
    const { repo, push, service } = serviceWith();
    repo.subs = [{ id: "s1", userId: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a", failureCount: 0 }];

    await service.notify("u1", { type: "study_reminder", title: "Belajar", body: "Yuk", dedupeKey: "daily:u1:2026-11-05" });
    const second = await service.notify("u1", { type: "study_reminder", title: "Belajar", body: "Yuk", dedupeKey: "daily:u1:2026-11-05" });

    expect(second).toEqual({ created: false, pushSent: 0 });
    expect(repo.rows).toHaveLength(1);
    expect(push.sent).toHaveLength(1);
  });

  it("menghapus langganan yang sudah kedaluwarsa", async () => {
    const { repo, push, service } = serviceWith();
    repo.subs = [
      { id: "s1", userId: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a", failureCount: 0 },
      { id: "s2", userId: "u1", endpoint: "https://push.example/2", p256dh: "k", auth: "a", failureCount: 0 },
    ];
    push.results = ["gone", "ok"];

    const result = await service.notify("u1", { type: "exam", title: "Lulus", body: "Selamat" });

    expect(result.pushSent).toBe(1);
    expect(repo.deleted).toEqual(["s1"]);
  });

  it("pengingat massal melewati pengguna yang tidak berhak", async () => {
    const { repo, service } = serviceWith();
    repo.candidates = [
      candidate({ id: "u1" }),
      candidate({ id: "u2", lastActiveDate: new Date("2026-11-05T00:00:00Z") }),
      candidate({ id: "u3", preferences: { ...DEFAULT_PREFERENCES, studyReminder: false } }),
    ];

    const result = await service.runReminders(new Date("2026-11-05T12:00:00Z"));

    expect(result).toMatchObject({ checked: 3, created: 1 });
    expect(repo.rows.map((r) => r.userId)).toEqual(["u1"]);
  });

  it("pengumuman hanya untuk penerima yang mengizinkan", async () => {
    const { repo, service } = serviceWith();
    repo.recipients = [
      { id: "u1", preferences: { ...DEFAULT_PREFERENCES } },
      { id: "u2", preferences: { ...DEFAULT_PREFERENCES, announcement: false } },
    ];

    const result = await service.broadcast({ title: "Pemeliharaan", body: "Server istirahat malam ini." });

    expect(result).toMatchObject({ recipients: 2, created: 1 });
    expect(repo.rows[0].url).toBe("/notifikasi");
  });

  it("mengirim pengingat SRS_DUE saat ada kartu jatuh tempo dan jam tenang tidak aktif", () => {
    const at = new Date("2026-11-05T12:00:00Z"); // 19:00 WIB
    const plan = planReminder(candidate({ dueSrsCount: 15 }), at);
    expect(plan).toMatchObject({
      type: "srs_due",
      url: "/review",
      metadata: { dueCount: 15 },
    });
    expect(plan?.title).toContain("15 Kosakata");
  });

  it("menahan pengingat non-darurat saat berada di rentang jam tenang (Quiet Hours)", () => {
    // 23:00 WIB = 16:00 UTC (di dalam jam tenang 22:00 - 07:00)
    const night = new Date("2026-11-05T16:00:00Z");
    expect(planReminder(candidate({ dueSrsCount: 10 }), night)).toBeNull();
    // 06:30 WIB = 23:30 UTC hari sebelumnya
    const earlyMorning = new Date("2026-11-04T23:30:00Z");
    expect(planReminder(candidate({ dueSrsCount: 10 }), earlyMorning)).toBeNull();
  });

  it("tetap mengirim STREAK_DANGER dalam 3 jam sebelum tengah malam walau di jam tenang", () => {
    // 22:30 WIB = 15:30 UTC (≤ 3 jam sebelum tengah malam)
    const lateNight = new Date("2026-11-05T15:30:00Z");
    const plan = planReminder(
      candidate({ streakCount: 21, lastActiveDate: new Date("2026-11-04T00:00:00Z") }),
      lateNight,
    );
    expect(plan?.type).toBe("streak");
    expect(plan?.title).toContain("21 hari");
    expect(plan?.url).toBe("/belajar");
  });

  it("menolak jam pengingat dan jam tenang yang tidak valid", async () => {
    const { service } = serviceWith();
    await expect(service.updatePreferences("u1", { reminderTime: "25:00" })).rejects.toThrow("HH:MM");
    await expect(service.updatePreferences("u1", { quietHourStart: "99:00" })).rejects.toThrow("HH:MM");
  });

  it("notifyTest melaporkan status pushEnabled, subscriptionCount, dan mengirim push ke perangkat terdaftar", async () => {
    const { repo, push, service } = serviceWith();
    repo.subs = [{ id: "s1", userId: "u1", endpoint: "https://push.example/1", p256dh: "k", auth: "a", failureCount: 0 }];

    const res = await service.notifyTest("u1", "Kenji");

    expect(res).toEqual({ created: true, pushSent: 1, pushEnabled: true, subscriptionCount: 1 });
    expect(push.sent[0].payload.body).toContain("Kenji");
    expect(push.sent[0].payload.tag).toContain("test:u1:");
  });
});
