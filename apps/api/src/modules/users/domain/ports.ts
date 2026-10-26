import type { Role, UserStatus } from "../../../shared/domain/types";

export interface UserListItem {
  id: string;
  email: string | null;
  displayName: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  roleBreakdown: Record<Role, number>;
  totalConversations: number;
  totalChapters: number;
}

export interface UserAdminRepository {
  search(query: { q?: string; role?: Role; status?: UserStatus; page: number; pageSize: number }): Promise<{ items: UserListItem[]; total: number }>;
  findById(id: string): Promise<UserListItem | null>;
  update(id: string, data: { role?: Role; status?: UserStatus }): Promise<void>;
  revokeAllSessions(userId: string, now: Date): Promise<void>;
  getStats(): Promise<SystemStats>;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

/** Setiap tindakan Admin/Super Admin dicatat (dokumen 10.7). */
export interface AuditLogger {
  log(entry: { actorId: string; targetUserId: string | null; action: string; details: Record<string, unknown> }): Promise<void>;
  list(query: { page: number; pageSize: number; action?: string }): Promise<{ items: AuditLogItem[]; total: number }>;
}

export interface AiLevelPromptItem {
  id: number;
  levelId: number;
  levelCode: string;
  levelName: string;
  systemPrompt: string;
  maxSentenceWords: number;
  furiganaRule: "full" | "hard_only" | "none";
  speechRate: number;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface AiPromptRepository {
  list(): Promise<AiLevelPromptItem[]>;
  update(levelId: number, data: { systemPrompt: string; maxSentenceWords: number; furiganaRule: "full" | "hard_only" | "none"; speechRate: number }, updatedById: string): Promise<void>;
}

export interface SubscriptionAdminRepository {
  grantPremium(userId: string, durationDays: number, reason: string): Promise<void>;
}
