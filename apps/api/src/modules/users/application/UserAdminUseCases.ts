import { Errors } from "../../../shared/domain/errors";
import type { AuthUser, Clock, Role } from "../../../shared/domain/types";
import type {
  AiPromptRepository,
  AuditLogger,
  SubscriptionAdminRepository,
  UserAdminRepository,
} from "../domain/ports";

export class SearchUsers {
  constructor(private readonly deps: { repo: UserAdminRepository }) {}
  execute(query: Parameters<UserAdminRepository["search"]>[0]) {
    return this.deps.repo.search(query);
  }
}

export class ChangeUserRole {
  constructor(private readonly deps: { repo: UserAdminRepository; audit: AuditLogger }) {}
  async execute(admin: AuthUser, userId: string, role: Role) {
    if (admin.id === userId) {
      throw Errors.validation("Admin tidak bisa mengubah role akunnya sendiri.");
    }

    const target = await this.deps.repo.findById(userId);
    if (!target) throw Errors.notFound("Pengguna");

    // Aturan Hierarki Keamanan:
    // Hanya Super Admin yang berhak mengubah role akun Admin/Super Admin atau mengangkat seseorang menjadi Admin/Super Admin.
    if (admin.role !== "super_admin") {
      if (target.role === "admin" || target.role === "super_admin") {
        throw Errors.forbidden("Hanya Super Admin yang dapat mengubah role akun Admin atau Super Admin.");
      }
      if (role === "admin" || role === "super_admin") {
        throw Errors.forbidden("Hanya Super Admin yang dapat mengangkat Admin atau Super Admin baru.");
      }
    }

    await this.deps.repo.update(userId, { role });
    await this.deps.audit.log({
      actorId: admin.id,
      targetUserId: userId,
      action: "change_role",
      details: { from: target.role, to: role },
    });
  }
}

export class SuspendUser {
  constructor(private readonly deps: { repo: UserAdminRepository; audit: AuditLogger; clock: Clock }) {}
  async execute(admin: AuthUser, userId: string, reason: string) {
    if (admin.id === userId) {
      throw Errors.validation("Tidak bisa men-suspend akun sendiri.");
    }

    const target = await this.deps.repo.findById(userId);
    if (!target) throw Errors.notFound("Pengguna");

    if (target.role === "super_admin") {
      throw Errors.forbidden("Akun Super Admin memiliki imunitas dan tidak dapat di-suspend.");
    }

    if (admin.role !== "super_admin" && target.role === "admin") {
      throw Errors.forbidden("Hanya Super Admin yang dapat men-suspend akun Admin.");
    }

    await this.deps.repo.update(userId, { status: "suspended" });
    await this.deps.repo.revokeAllSessions(userId, this.deps.clock.now());
    await this.deps.audit.log({
      actorId: admin.id,
      targetUserId: userId,
      action: "suspend",
      details: { reason, targetRole: target.role },
    });
  }
}

export class UnsuspendUser {
  constructor(private readonly deps: { repo: UserAdminRepository; audit: AuditLogger }) {}
  async execute(admin: AuthUser, userId: string) {
    const target = await this.deps.repo.findById(userId);
    if (!target) throw Errors.notFound("Pengguna");

    await this.deps.repo.update(userId, { status: "active" });
    await this.deps.audit.log({
      actorId: admin.id,
      targetUserId: userId,
      action: "unsuspend",
      details: { targetRole: target.role },
    });
  }
}

export class GetSystemStats {
  constructor(private readonly deps: { repo: UserAdminRepository }) {}
  execute() {
    return this.deps.repo.getStats();
  }
}

export class ListAuditLogs {
  constructor(private readonly deps: { audit: AuditLogger }) {}
  execute(query: { page: number; pageSize: number; action?: string }) {
    return this.deps.audit.list(query);
  }
}

export class ListAiLevelPrompts {
  constructor(private readonly deps: { repo: AiPromptRepository }) {}
  execute() {
    return this.deps.repo.list();
  }
}

export class UpdateAiLevelPrompt {
  constructor(private readonly deps: { repo: AiPromptRepository; audit: AuditLogger }) {}
  async execute(
    admin: AuthUser,
    levelId: number,
    data: { systemPrompt: string; maxSentenceWords: number; furiganaRule: "full" | "hard_only" | "none"; speechRate: number },
  ) {
    await this.deps.repo.update(levelId, data, admin.id);
    await this.deps.audit.log({
      actorId: admin.id,
      targetUserId: null,
      action: "update_ai_prompt",
      details: { levelId, ...data },
    });
  }
}

export class GrantSubscription {
  constructor(private readonly deps: { repo: SubscriptionAdminRepository; audit: AuditLogger }) {}
  async execute(admin: AuthUser, userId: string, durationDays: number, reason: string) {
    await this.deps.repo.grantPremium(userId, durationDays, reason);
    await this.deps.audit.log({
      actorId: admin.id,
      targetUserId: userId,
      action: "grant_subscription",
      details: { durationDays, reason },
    });
  }
}
