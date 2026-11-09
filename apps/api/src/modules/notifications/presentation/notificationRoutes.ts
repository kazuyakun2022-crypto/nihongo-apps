import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { NotificationService } from "../application/NotificationService";

const preferencesBody = z
  .object({
    pushEnabled: z.boolean().optional(),
    studyReminder: z.boolean().optional(),
    streak: z.boolean().optional(),
    achievement: z.boolean().optional(),
    exam: z.boolean().optional(),
    announcement: z.boolean().optional(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus berformat HH:MM.").optional(),
    timezone: z.string().min(1).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Tidak ada pengaturan yang diubah." });

const subscriptionBody = z.object({
  endpoint: z.string().url().max(4000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
  userAgent: z.string().max(300).optional(),
});

const endpointBody = z.object({ endpoint: z.string().url().max(4000) });

export function notificationRoutes(service: NotificationService) {
  const r = Router();

  r.get("/", asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const limit = Number(req.query.limit);
    const [items, unreadCount] = await Promise.all([
      service.list(user.id, Number.isFinite(limit) ? limit : 50),
      service.unreadCount(user.id),
    ]);
    res.json({ items, unreadCount });
  }));

  r.get("/unread-count", asyncHandler(async (req, res) => {
    res.json({ unreadCount: await service.unreadCount(currentUser(req).id) });
  }));

  r.get("/config", (_req, res) => {
    res.json(service.config());
  });

  r.get("/preferences", asyncHandler(async (req, res) => {
    res.json(await service.getPreferences(currentUser(req).id));
  }));

  r.put("/preferences", asyncHandler(async (req, res) => {
    const patch = parseBody(preferencesBody, req.body);
    res.json(await service.updatePreferences(currentUser(req).id, patch));
  }));

  r.post("/test", asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const result = await service.notifyTest(user.id);
    res.json({ ok: true, created: result.created, pushSent: result.pushSent });
  }));

  r.post("/read-all", asyncHandler(async (req, res) => {
    res.json(await service.markAllRead(currentUser(req).id));
  }));

  r.post("/:id/read", asyncHandler(async (req, res) => {
    res.json(await service.markRead(currentUser(req).id, req.params.id));
  }));

  r.post("/subscriptions", asyncHandler(async (req, res) => {
    const body = parseBody(subscriptionBody, req.body);
    res.json(
      await service.subscribe(currentUser(req).id, {
        endpoint: body.endpoint,
        keys: body.keys,
        userAgent: body.userAgent ?? req.header("user-agent") ?? null,
      }),
    );
  }));

  r.delete("/subscriptions", asyncHandler(async (req, res) => {
    const body = parseBody(endpointBody, req.body);
    res.json(await service.unsubscribe(currentUser(req).id, body.endpoint));
  }));

  return r;
}

export function notificationCronRoutes(service: NotificationService, secret: string) {
  const r = Router();

  r.all("/reminders", asyncHandler(async (req, res) => {
    if (!secret) {
      res.status(503).json({ error: { code: "CRON_DISABLED", message: "CRON_SECRET belum diatur di server." } });
      return;
    }
    const provided = req.header("x-cron-secret") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Rahasia cron tidak valid." } });
      return;
    }
    res.json(await service.runReminders(new Date()));
  }));

  return r;
}

const announcementBody = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter.").max(120),
  body: z.string().trim().min(3, "Isi minimal 3 karakter.").max(500),
  url: z.string().max(255).regex(/^\//, "Tautan harus diawali /.").optional(),
});

export function adminNotificationRoutes(service: NotificationService) {
  const r = Router();

  r.post("/announcement", asyncHandler(async (req, res) => {
    const body = parseBody(announcementBody, req.body);
    res.status(201).json(await service.broadcast(body));
  }));

  r.post("/run-reminders", asyncHandler(async (_req, res) => {
    res.json(await service.runReminders(new Date()));
  }));

  return r;
}
