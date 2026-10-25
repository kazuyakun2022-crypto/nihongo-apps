import type { Db } from "../../../shared/infrastructure/prisma";
import type { SessionRecord, SessionRepository } from "../domain/ports";

const select = { id: true, userId: true, refreshTokenHash: true, expiresAt: true, revokedAt: true } as const;

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  create(data: Parameters<SessionRepository["create"]>[0]): Promise<SessionRecord> {
    return this.db.authSession.create({ data, select });
  }

  findByTokenHash(hash: string): Promise<SessionRecord | null> {
    return this.db.authSession.findFirst({ where: { refreshTokenHash: hash }, select });
  }

  async rotate(id: string, newHash: string, expiresAt: Date, now: Date): Promise<void> {
    await this.db.authSession.update({ where: { id }, data: { refreshTokenHash: newHash, expiresAt, lastUsedAt: now } });
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.db.authSession.update({ where: { id }, data: { revokedAt: now } });
  }

  async revokeAllForUser(userId: string, now: Date, exceptSessionId?: string): Promise<void> {
    await this.db.authSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: now },
    });
  }
}
