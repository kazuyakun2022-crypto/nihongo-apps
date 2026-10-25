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

export interface UserAdminRepository {
  search(query: { q?: string; role?: Role; status?: UserStatus; page: number; pageSize: number }): Promise<{ items: UserListItem[]; total: number }>;
  findById(id: string): Promise<UserListItem | null>;
  update(id: string, data: { role?: Role; status?: UserStatus }): Promise<void>;
  revokeAllSessions(userId: string, now: Date): Promise<void>;
}

/** Setiap tindakan Admin dicatat (dokumen 10.7). */
export interface AuditLogger {
  log(entry: { actorId: string; targetUserId: string | null; action: string; details: Record<string, unknown> }): Promise<void>;
}
