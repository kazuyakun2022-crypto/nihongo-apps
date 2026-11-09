import { api } from "@/core/http/apiClient";
import type { AppNotification, NotificationPreferences, PushConfig } from "../domain/types";

export interface PushSubscriptionBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

export const notificationsApi = {
  list: (limit = 50) => api.get<{ items: AppNotification[]; unreadCount: number }>(`/notifications?limit=${limit}`),
  unreadCount: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),
  markRead: (id: string) => api.post<{ read: boolean }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ updated: number }>("/notifications/read-all"),
  sendTest: () => api.post<{ ok: true; created: boolean; pushSent: number }>("/notifications/test"),
  config: () => api.get<PushConfig>("/notifications/config"),
  preferences: () => api.get<NotificationPreferences>("/notifications/preferences"),
  updatePreferences: (patch: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>("/notifications/preferences", patch),
  subscribe: (body: PushSubscriptionBody) => api.post<{ ok: true }>("/notifications/subscriptions", body),
  unsubscribe: (endpoint: string) => api.delete<{ ok: true }>("/notifications/subscriptions", { endpoint }),
};
