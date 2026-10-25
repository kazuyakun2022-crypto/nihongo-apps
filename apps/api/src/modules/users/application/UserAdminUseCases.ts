import { Errors } from "../../../shared/domain/errors";
import type { AuthUser, Clock, Role } from "../../../shared/domain/types";
import type { AuditLogger, UserAdminRepository } from "../domain/ports";

export class SearchUsers {
  constructor(private readonly deps: { repo: UserAdminRepository }) {}
  execute(query: Parameters<UserAdminRepository["search"]>[0]) {
    return this.deps.repo.search(query);
  }
}

export class ChangeUserRole {
  constructor(private readonly deps: { repo: UserAdminRepository; audit: AuditLogger }) {}
  async execute(admin: AuthUser, userId: string, role: Role) {
    if (admin.id === userId) throw Errors.validation("Admin tidak bisa mengubah role akunnya sendiri.");
    const target = await this.deps.repo.findById(userId);
    if (!target) throw Errors.notFound("Pengguna");
    await this.deps.repo.update(userId, { role });
    await this.deps.audit.log({ actorId: admin.id, targetUserId: userId, action: "change_role", details: { from: target.role, to: role } });
  }
}

export class SuspendUser {
  constructor(private readonly deps: { repo: UserAdminRepository; audit: AuditLogger; clock: Clock }) {}
  async execute(admin: AuthUser, userId: string, reason: string) {
    const target = await this.deps.repo.findById(userId);
    if (!target) throw Errors.notFound("Pengguna");
    await this.deps.repo.update(userId, { status: "suspended" });
    await this.deps.repo.revokeAllSessions(userId, this.deps.clock.now());
    await this.deps.audit.log({ actorId: admin.id, targetUserId: userId, action: "suspend", details: { reason } });
  }
}
