/**
 * Utilitas suara notifikasi aplikasi Nihongo.
 * Menggunakan audio resmi bawaan (/sounds/notification.mp3) yang dipasang oleh developer,
 * dilengkapi fallback sintesis Web Audio API jika diperlukan.
 */

const SOUND_ENABLED_KEY = "nihongo_notification_sound_enabled";

export const DEFAULT_SOUND_URL = "/sounds/notification.mp3";

export function getNotificationSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === "1";
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? "1" : "0");
}

/**
 * Sintesis nada lonceng lembut menggunakan Web Audio API
 * sebagai fallback instan jika audio file belum siap atau diblokir.
 */
function playSynthesizedChime(): void {
  if (typeof window === "undefined") return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const notes = [
      { t: 0.00, freq: 1046.50 }, // C6
      { t: 0.10, freq: 1318.51 }, // E6
      { t: 0.22, freq: 1567.98 }, // G6
      { t: 0.35, freq: 2093.00 }, // C7
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, now + note.t);

      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.28, now + note.t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.t);
      osc.stop(now + note.t + 0.95);
    }
  } catch {
    // Abaikan jika Web Audio tidak diizinkan
  }
}

let cachedAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!cachedAudio) {
    cachedAudio = new Audio(DEFAULT_SOUND_URL);
    cachedAudio.preload = "auto";
  }
  return cachedAudio;
}

export async function playNotificationSound(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!getNotificationSoundEnabled()) return;

  const now = Date.now();
  // Cegah suara berulang/gema: maksimal 1 pemutaran dalam rentang 1 detik
  if (now - lastPlayedAt < 1000) {
    return;
  }
  lastPlayedAt = now;

  try {
    const audio = getAudioElement();
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0.9;

    await audio.play().catch((err) => {
      console.warn("[audio] Autoplay dicegah atau interaksi diperlukan:", err);
    });
  } catch (err) {
    console.warn("[audio] Gagal memutar audio notifikasi:", err);
  }
}

/**
 * Memicu notifikasi sistem langsung di layar perangkat (HP/Laptop)
 * menggunakan Service Worker atau Notification API browser.
 */
export async function triggerDeviceNotification(title: string, body: string, url = "/beranda"): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission().catch(() => "denied");
  }
  if (permission !== "granted") {
    return false;
  }

  // Putar suara audio resmi bawaan Nihongo (1 kali)
  void playNotificationSound();

  const uniqueTag = "nihongo-device-" + Date.now();

  // Coba lewat service worker terlebih dahulu (standar PWA modern di Android/Desktop)
  let shownViaSW = false;
  if ("serviceWorker" in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.ready.catch(() => null);
      }
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: uniqueTag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url },
        } as unknown as NotificationOptions);
        shownViaSW = true;
      }
    } catch (swErr) {
      console.warn("[notification] showNotification via SW gagal:", swErr);
    }
  }

  // Fallback standar browser desktop (jika Service Worker belum siap/aktif)
  if (!shownViaSW) {
    try {
      new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        tag: uniqueTag,
      });
    } catch (err) {
      console.warn("[notification] Fallback new Notification gagal:", err);
    }
  }

  return true;
}
