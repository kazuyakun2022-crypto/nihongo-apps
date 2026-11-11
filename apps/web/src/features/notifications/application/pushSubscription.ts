import { notificationsApi } from "../data/notificationsApi";

export function isIosWithoutStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return !standalone;
}

function keysMatch(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return true;
  const view = new Uint8Array(a);
  if (view.byteLength !== b.byteLength) return false;
  for (let i = 0; i < view.byteLength; i += 1) {
    if (view[i] !== b[i]) return false;
  }
  return true;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function registration(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  let existing = await navigator.serviceWorker.getRegistration();
  if (!existing) {
    try {
      existing = await navigator.serviceWorker.register("/sw.js");
    } catch {
      // lanjut ke navigator.serviceWorker.ready
    }
  }
  if (existing?.active) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Service worker belum siap. Pastikan browser mengizinkan service worker.")),
        timeoutMs,
      ),
    ),
  ]);
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

export async function subscribePush(): Promise<PushSubscription> {
  if (!pushSupported()) throw new Error("Fitur push tidak didukung oleh browser ini.");

  const config = await notificationsApi.config();
  if (!config.enabled || !config.publicKey) throw new Error("Push belum diaktifkan oleh admin server.");

  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") throw new Error("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.");

  const reg = await registration();
  const serverKey = urlBase64ToUint8Array(config.publicKey);
  let existing = await reg.pushManager.getSubscription();
  if (existing && !keysMatch(existing.options?.applicationServerKey, serverKey)) {
    // Kunci VAPID berubah di server: cabut langganan lama agar bisa memakai kunci baru.
    await existing.unsubscribe().catch(() => undefined);
    existing = null;
  }

  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Langganan push tidak lengkap.");
  await notificationsApi.subscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent.slice(0, 300),
  });
  return subscription;
}

/**
 * Jika browser sudah punya izin & langganan push aktif, sinkronkan ke backend
 * (berguna saat user ganti kunci VAPID atau basis data baru di-reset).
 */
export async function syncPushSubscriptionIfActive(publicKey: string): Promise<boolean> {
  if (!pushSupported() || !publicKey || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg?.active) return false;
    const serverKey = urlBase64ToUint8Array(publicKey);
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) return false;

    if (!keysMatch(subscription.options?.applicationServerKey, serverKey)) {
      await subscription.unsubscribe().catch(() => undefined);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: serverKey,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
    await notificationsApi.subscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent.slice(0, 300),
    });
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return;
    await notificationsApi.unsubscribe(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    // Pembersihan langganan tidak boleh menggagalkan logout.
  }
}
