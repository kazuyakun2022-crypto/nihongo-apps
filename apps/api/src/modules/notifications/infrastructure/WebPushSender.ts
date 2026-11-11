import webpush from "web-push";
import type { PushPayload, PushSender, PushSubscriptionRecord } from "../domain/types";

export class WebPushSender implements PushSender {
  readonly enabled: boolean;

  constructor(publicKey: string, privateKey: string, subject: string, private readonly ttlSeconds: number) {
    const pub = publicKey.trim();
    const priv = privateKey.trim();
    const sub = subject.trim() || "mailto:admin@nihongo.local";
    let configured = false;
    if (pub && priv) {
      try {
        webpush.setVapidDetails(sub, pub, priv);
        configured = true;
      } catch (err) {
        console.error("[push] Konfigurasi VAPID tidak valid, Web Push dinonaktifkan:", err instanceof Error ? err.message : err);
      }
    }
    this.enabled = configured;
  }

  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
    if (!this.enabled) return "error";
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
        { TTL: this.ttlSeconds },
      );
      return "ok";
    } catch (error) {
      const errObj = error as { statusCode?: number; body?: string };
      if (errObj.statusCode === 404 || errObj.statusCode === 410) return "gone";
      console.error("[push] gagal mengirim notifikasi", errObj.statusCode ?? (error instanceof Error ? error.message : error), errObj.body ?? "");
      return "error";
    }
  }
}
