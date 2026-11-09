import webpush from "web-push";
import type { PushPayload, PushSender, PushSubscriptionRecord } from "../domain/types";

export class WebPushSender implements PushSender {
  readonly enabled: boolean;

  constructor(publicKey: string, privateKey: string, subject: string, private readonly ttlSeconds: number) {
    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
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
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return "gone";
      console.error("[push] gagal mengirim notifikasi", status ?? (error instanceof Error ? error.message : error));
      return "error";
    }
  }
}
