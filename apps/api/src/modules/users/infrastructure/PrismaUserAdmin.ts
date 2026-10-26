import type { Prisma } from "@prisma/client";
import type { Db } from "../../../shared/infrastructure/prisma";
import type { Role } from "../../../shared/domain/types";
import type {
  AiLevelPromptItem,
  AiPromptRepository,
  AuditLogger,
  AuditLogItem,
  SubscriptionAdminRepository,
  SystemStats,
  UserAdminRepository,
  UserListItem,
} from "../domain/ports";

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
    return { items: items as UserListItem[], total };
  }

  async findById(id: string): Promise<UserListItem | null> {
    const user = await this.db.user.findUnique({ where: { id }, select });
    return (user as UserListItem) ?? null;
  }

  async update(id: string, data: { role?: UserListItem["role"]; status?: UserListItem["status"] }): Promise<void> {
    await this.db.user.update({ where: { id }, data });
  }

  async revokeAllSessions(userId: string, now: Date): Promise<void> {
    await this.db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  }

  async getStats(): Promise<SystemStats> {
    const [totalUsers, activeUsers, suspendedUsers, roleCounts, totalConversations, totalChapters] = await Promise.all([
      this.db.user.count({ where: { isGuest: false } }),
      this.db.user.count({ where: { isGuest: false, status: "active" } }),
      this.db.user.count({ where: { isGuest: false, status: "suspended" } }),
      this.db.user.groupBy({ by: ["role"], _count: { id: true }, where: { isGuest: false } }),
      this.db.conversationSession.count(),
      this.db.chapter.count(),
    ]);

    const roleBreakdown: Record<Role, number> = {
      guest: 0,
      student: 0,
      premium: 0,
      teacher: 0,
      admin: 0,
      super_admin: 0,
    };

    for (const r of roleCounts) {
      if (r.role in roleBreakdown) {
        roleBreakdown[r.role as Role] = r._count.id;
      }
    }

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      roleBreakdown,
      totalConversations,
      totalChapters,
    };
  }
}

export class PrismaAuditLogger implements AuditLogger {
  constructor(private readonly db: Db) {}

  async log(entry: { actorId: string; targetUserId: string | null; action: string; details: Record<string, unknown> }) {
    await this.db.auditLog.create({ data: { ...entry, details: entry.details as Prisma.InputJsonValue } });
  }

  async list(query: { page: number; pageSize: number; action?: string }): Promise<{ items: AuditLogItem[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        include: {
          actor: { select: { displayName: true } },
          target: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.auditLog.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        id: String(i.id),
        actorId: i.actorId,
        actorName: i.actor?.displayName ?? "Unknown",
        targetUserId: i.targetUserId,
        targetUserName: i.target?.displayName ?? null,
        action: i.action,
        details: (i.details as Record<string, unknown>) ?? null,
        createdAt: i.createdAt,
      })),
      total,
    };
  }
}

export class PrismaAiPromptRepository implements AiPromptRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<AiLevelPromptItem[]> {
    const prompts = await this.db.aiLevelPrompt.findMany({
      include: {
        level: { select: { code: true, name: true } },
        updatedBy: { select: { displayName: true } },
      },
      orderBy: { levelId: "asc" },
    });

    return prompts.map((p) => ({
      id: p.id,
      levelId: p.levelId,
      levelCode: p.level.code,
      levelName: p.level.name,
      systemPrompt: p.systemPrompt,
      maxSentenceWords: p.maxSentenceWords,
      furiganaRule: p.furiganaRule as "full" | "hard_only" | "none",
      speechRate: Number(p.speechRate),
      updatedAt: p.updatedAt,
      updatedBy: p.updatedBy?.displayName ?? null,
    }));
  }

  async update(
    levelId: number,
    data: { systemPrompt: string; maxSentenceWords: number; furiganaRule: "full" | "hard_only" | "none"; speechRate: number },
    updatedById: string,
  ): Promise<void> {
    await this.db.aiLevelPrompt.update({
      where: { levelId },
      data: {
        systemPrompt: data.systemPrompt,
        maxSentenceWords: data.maxSentenceWords,
        furiganaRule: data.furiganaRule,
        speechRate: data.speechRate,
        updatedById,
      },
    });
  }
}

export class PrismaSubscriptionAdminRepository implements SubscriptionAdminRepository {
  constructor(private readonly db: Db) {}

  async grantPremium(userId: string, durationDays: number, reason: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await this.db.$transaction([
      this.db.subscription.create({
        data: {
          userId,
          plan: durationDays >= 300 ? "yearly" : "monthly",
          provider: "midtrans",
          providerRef: `manual_grant_${Date.now()}`,
          status: "active",
          startedAt: now,
          expiresAt,
        },
      }),
      this.db.user.update({
        where: { id: userId },
        data: { role: "premium" },
      }),
    ]);
  }
}
