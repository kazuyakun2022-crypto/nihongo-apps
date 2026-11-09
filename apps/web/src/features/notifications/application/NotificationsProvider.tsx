"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { tokenStore } from "@/core/http/apiClient";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { notificationsApi } from "../data/notificationsApi";
import type { AppNotification, NotificationPreferences, PushState } from "../domain/types";
import { currentPushSubscription, pushSupported, subscribePush, unsubscribePush } from "./pushSubscription";
import {
  getNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
  triggerDeviceNotification,
} from "./notificationSound";

interface NotificationsContextValue {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  pushState: PushState;
  pushServerEnabled: boolean;
  soundEnabled: boolean;
  refresh: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  savePreferences: (patch: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
  sendTestNotification: () => Promise<{ created: boolean; pushSent: number }>;
  toggleSound: (enabled: boolean) => void;
  playSound: () => Promise<void>;
  triggerDevice: (title?: string, body?: string) => Promise<boolean>;
  toast: { id: string; title: string; body: string; url?: string } | null;
  showToast: (title: string, body: string, url?: string) => void;
  dismissToast: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [pushState, setPushState] = useState<PushState>("loading");
  const [pushServerEnabled, setPushServerEnabled] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [toast, setToast] = useState<{ id: string; title: string; body: string; url?: string } | null>(null);
  const mounted = useRef(true);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    setSoundEnabledState(getNotificationSoundEnabled());
  }, []);

  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      void playNotificationSound();
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const newest = items[0];
        const title = newest?.title || "Miu-chan (Nihongo)";
        const body = newest?.body || "Ada pengingat belajar baru untukmu!";
        const url = newest?.url || "/beranda";
        void triggerDeviceNotification(title, body, url);
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, items]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      const { unreadCount: count } = await notificationsApi.unreadCount();
      if (mounted.current) setUnreadCount(count);
    } catch {
      // Polling gagal sesaat tidak perlu mengganggu halaman.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    setLoading(true);
    try {
      const data = await notificationsApi.list(50);
      if (!mounted.current) return;
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setError(null);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Notifikasi belum bisa dimuat.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push") {
        void refreshUnread();
        void refresh();
        void playNotificationSound();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [refresh, refreshUnread]);

  useEffect(() => {
    if (status !== "authenticated") {
      setItems([]);
      setUnreadCount(0);
      setPreferences(null);
      setPushState("loading");
      return;
    }

    let active = true;
    Promise.allSettled([refresh(), notificationsApi.preferences(), notificationsApi.config()]).then((results) => {
      if (!active) return;
      const prefs = results[1];
      if (prefs.status === "fulfilled") setPreferences(prefs.value);
      const config = results[2];
      if (config.status === "fulfilled") setPushServerEnabled(config.value.enabled && Boolean(config.value.publicKey));
    });

    notificationsApi.unreadCount().then(({ unreadCount: count }) => {
      if (active) setUnreadCount(count);
    }).catch(() => undefined);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshUnread();
    }, 60_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [status, refresh, refreshUnread]);

  useEffect(() => {
    if (!pushSupported()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    currentPushSubscription()
      .then((subscription) => {
        if (mounted.current) setPushState(subscription ? "subscribed" : "inactive");
      })
      .catch(() => {
        if (mounted.current) setPushState("inactive");
      });
  }, [status]);

  const markRead = useCallback(async (id: string) => {
    const wasUnread = items.some((item) => item.id === id && !item.readAt);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)));
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    await notificationsApi.markRead(id).catch(() => refreshUnread());
  }, [items, refreshUnread]);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadCount(0);
    await notificationsApi.markAllRead().catch(() => refreshUnread());
  }, [refreshUnread]);

  const savePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const next = await notificationsApi.updatePreferences(patch);
    if (mounted.current) setPreferences(next);
    return next;
  }, []);

  const enablePush = useCallback(async () => {
    setPushState("loading");
    try {
      await subscribePush();
      const prefs = await notificationsApi.updatePreferences({ pushEnabled: true });
      if (!mounted.current) return;
      setPreferences(prefs);
      setPushState("subscribed");
    } catch (err) {
      if (mounted.current) setPushState(Notification.permission === "denied" ? "denied" : "inactive");
      throw err;
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushState("loading");
    await unsubscribePush();
    if (mounted.current) setPushState("inactive");
  }, []);

  const toggleSound = useCallback((enabled: boolean) => {
    setNotificationSoundEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) void playNotificationSound();
  }, []);

  const playSound = useCallback(async () => {
    await playNotificationSound();
  }, []);

  const showToast = useCallback((title: string, body: string, url?: string) => {
    setToast({ id: String(Date.now()), title, body, url });
    void playNotificationSound();
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const triggerDevice = useCallback(
    async (
      title = "Miu-chan (Nihongo) 🔔",
      body = "Waktunya belajar sebentar! Latihan 5 menit hari ini sudah cukup untuk menjaga kebiasaanmu.",
    ) => {
      showToast(title, body, "/beranda");
      return await triggerDeviceNotification(title, body, "/beranda");
    },
    [showToast],
  );

  const sendTestNotification = useCallback(async () => {
    const res = await notificationsApi.sendTest();
    await Promise.all([refresh(), refreshUnread()]);
    showToast(
      "Miu-chan (Nihongo) 🔔",
      "Notifikasi aplikasi Nihongo aktif dan siap mengingatkanmu belajar setiap hari!",
      "/beranda",
    );
    return res;
  }, [refresh, refreshUnread, showToast]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      preferences,
      pushState,
      pushServerEnabled,
      soundEnabled,
      refresh,
      refreshUnread,
      markRead,
      markAllRead,
      savePreferences,
      enablePush,
      disablePush,
      sendTestNotification,
      toggleSound,
      playSound,
      triggerDevice,
      toast,
      showToast,
      dismissToast,
    }),
    [
      items,
      unreadCount,
      loading,
      error,
      preferences,
      pushState,
      pushServerEnabled,
      soundEnabled,
      refresh,
      refreshUnread,
      markRead,
      markAllRead,
      savePreferences,
      enablePush,
      disablePush,
      sendTestNotification,
      toggleSound,
      playSound,
      triggerDevice,
      toast,
      showToast,
      dismissToast,
    ],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications harus dipakai di dalam <NotificationsProvider>");
  return ctx;
}
