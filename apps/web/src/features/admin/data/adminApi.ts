import { apiRequest } from "@/core/http/apiClient";
import type { Role } from "@/features/auth/domain/types";

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  roleBreakdown: Record<Role, number>;
  totalConversations: number;
  totalChapters: number;
}

export interface AdminUserItem {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  status: "active" | "suspended" | "pending_deletion";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AiPromptItem {
  id: number;
  levelId: number;
  levelCode: string;
  levelName: string;
  systemPrompt: string;
  maxSentenceWords: number;
  furiganaRule: "full" | "hard_only" | "none";
  speechRate: number;
  updatedAt: string;
  updatedBy: string | null;
}

export type AiProvider = "groq" | "gemini" | "openai" | "anthropic" | "openrouter";
export type AiKeyStatus = "active" | "standby" | "degraded" | "exhausted" | "revoked";
export type AiCapability = "TEXT_LLM" | "VISION_OCR" | "AUDIO_STT" | "AUDIO_TTS";
export type AiFeature = "neko_chat" | "voice_overlay" | "vision_scanner" | "workbook_evaluator";

export interface AiKeyItem {
  id: string;
  provider: AiProvider;
  label: string;
  keyHint: string;
  priority: number;
  weight: number;
  status: AiKeyStatus;
  failureCount: number;
  successCount: number;
  lastLatencyMs: number | null;
  cooldownUntil: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AiModelItem {
  id: string;
  provider: AiProvider;
  modelId: string;
  displayName: string;
  capabilities: AiCapability[];
  contextLength: number | null;
  isDeprecated: boolean;
  discoveredAt: string;
}

export interface AiRouteItem {
  feature: AiFeature;
  primaryProvider: AiProvider;
  primaryModelId: string;
  backupProvider: AiProvider | null;
  backupModelId: string | null;
  fallbackProvider: AiProvider | null;
  fallbackModelId: string | null;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface AiCircuitLogItem {
  id: string;
  provider: AiProvider;
  feature: AiFeature | null;
  httpStatus: number | null;
  errorType: string | null;
  errorMessage: string | null;
  latencyMs: number | null;
  failoverTriggered: boolean;
  createdAt: string;
  keyLabel?: string;
  keyHint?: string;
}

export interface AiEngineStats {
  totalKeys: number;
  activeKeys: number;
  exhaustedKeys: number;
  totalModels: number;
  recentFailovers24h: number;
}

export const adminApi = {
  getStats: () => apiRequest<SystemStats>("/admin/stats"),

  searchUsers: (params: { q?: string; role?: Role; status?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.role) sp.set("role", params.role);
    if (params.status) sp.set("status", params.status);
    if (params.page) sp.set("page", String(params.page));
    if (params.pageSize) sp.set("pageSize", String(params.pageSize));
    return apiRequest<{ items: AdminUserItem[]; total: number }>(`/admin/users?${sp.toString()}`);
  },

  changeRole: (userId: string, role: Role) =>
    apiRequest<void>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
    }),

  suspendUser: (userId: string, reason: string) =>
    apiRequest<void>(`/admin/users/${userId}/suspend`, {
      method: "POST",
      body: { reason },
    }),

  unsuspendUser: (userId: string) =>
    apiRequest<void>(`/admin/users/${userId}/unsuspend`, {
      method: "POST",
    }),

  getAiPrompts: () => apiRequest<AiPromptItem[]>("/admin/ai-prompts"),

  updateAiPrompt: (
    levelId: number,
    data: { systemPrompt: string; maxSentenceWords: number; furiganaRule: string; speechRate: number },
  ) =>
    apiRequest<void>(`/admin/ai-prompts/${levelId}`, {
      method: "PUT",
      body: data,
    }),

  grantSubscription: (userId: string, durationDays: number, reason: string) =>
    apiRequest<void>("/admin/subscriptions/grant", {
      method: "POST",
      body: { userId, durationDays, reason },
    }),

  sendAnnouncement: (data: { title: string; body: string; url?: string }) =>
    apiRequest<{ recipients: number; created: number; pushSent: number }>("/admin/notifications/announcement", {
      method: "POST",
      body: data,
    }),

  runReminders: () =>
    apiRequest<{ checked: number; created: number; pushSent: number }>("/admin/notifications/run-reminders", {
      method: "POST",
    }),

  // ── SUPER ADMIN AI ENGINE ──
  getAiEngineStats: () => apiRequest<AiEngineStats>("/admin/ai-engine/stats"),

  getAiKeys: () => apiRequest<{ keys: AiKeyItem[] }>("/admin/ai-engine/keys"),

  createAiKey: (data: { provider: AiProvider; label: string; rawKey: string; priority?: number; weight?: number }) =>
    apiRequest<{ ok: boolean; key: AiKeyItem; modelsDiscovered: number }>("/admin/ai-engine/keys", {
      method: "POST",
      body: data,
    }),

  patchAiKey: (id: string, data: { label?: string; priority?: number; weight?: number; status?: AiKeyStatus }) =>
    apiRequest<{ ok: boolean; key: AiKeyItem }>(`/admin/ai-engine/keys/${id}`, {
      method: "PATCH",
      body: data,
    }),

  refreshAiKeyModels: (id: string) =>
    apiRequest<{ ok: boolean; modelsCount: number }>(`/admin/ai-engine/keys/${id}/refresh-models`, {
      method: "POST",
    }),

  resetAiKeyCooldown: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/ai-engine/keys/${id}/reset-cooldown`, {
      method: "POST",
    }),

  deleteAiKey: (id: string) =>
    apiRequest<{ ok: boolean }>(`/admin/ai-engine/keys/${id}`, {
      method: "DELETE",
    }),

  getAiModels: (provider?: AiProvider) =>
    apiRequest<{ models: AiModelItem[] }>(provider ? `/admin/ai-engine/models?provider=${provider}` : "/admin/ai-engine/models"),

  getAiRoutes: () => apiRequest<{ routes: AiRouteItem[] }>("/admin/ai-engine/routes"),

  updateAiRoute: (feature: AiFeature, data: Partial<AiRouteItem>) =>
    apiRequest<{ ok: boolean; route: AiRouteItem }>(`/admin/ai-engine/routes/${feature}`, {
      method: "PUT",
      body: data,
    }),

  getAiCircuitLogs: () => apiRequest<{ logs: AiCircuitLogItem[] }>("/admin/ai-engine/circuit-logs"),
};
