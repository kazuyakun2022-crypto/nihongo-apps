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
};
