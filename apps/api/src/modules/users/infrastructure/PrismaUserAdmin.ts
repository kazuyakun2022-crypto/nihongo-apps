import type { Prisma } from "@prisma/client";
import type { Db } from "../../../shared/infrastructure/prisma";
import type { AuditLogger, UserAdminRepository, UserListItem } from "../domain/ports";

const select = { id: true, email: true, displayName: true, role: true, status: true, createdAt: true, lastLoginAt: true } as const;

export class PrismaUserAdminRepository implements UserAdminRepository {
  constructor(private readonly db: Db) {}

  async search(query: Parameters<UserAdminRepository["search"]>[0]) {
    const where: Prisma.UserWhereInput = {
      isGuest: false,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? { OR: [{ email: { contains: query.q, mode: "insensitive" } }, { displayName: { contains: query.q, mode: "insensitive" } }] }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.db.user.findMany({ where, select, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.user.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<UserListItem | null> {
    return this.db.user.findUnique({ where: { id }, select });
  }

  async update(id: string, data: { role?: UserListItem["role"]; status?: UserListItem["status"] }): Promise<void> {
    await this.db.user.update({ where: { id }, data });
  }

  async revokeAllSessions(userId: string, now: Date): Promise<void> {
    await this.db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  }
}

export class PrismaAuditLogger implements AuditLogger {
  constructor(private readonly db: Db) {}
  async log(entry: { actorId: string; targetUserId: string | null; action: string; details: Record<string, unknown> }) {
    await this.db.auditLog.create({ data: { ...entry, details: entry.details as Prisma.InputJsonValue } });
  }
}
