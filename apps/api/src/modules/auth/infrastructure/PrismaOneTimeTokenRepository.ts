import type { Db } from "../../../shared/infrastructure/prisma";
import type { OneTimeTokenRecord, OneTimeTokenRepository } from "../domain/ports";

export class PrismaOneTimeTokenRepository implements OneTimeTokenRepository {
  constructor(private readonly db: Db) {}

  async createEmailVerification(userId: string, email: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.emailVerification.create({ data: { userId, email, tokenHash, expiresAt } });
  }

  findEmailVerification(tokenHash: string): Promise<OneTimeTokenRecord | null> {
    return this.db.emailVerification.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, email: true, expiresAt: true, usedAt: true },
    });
  }

  async markEmailVerificationUsed(id: string, now: Date): Promise<void> {
    await this.db.emailVerification.update({ where: { id }, data: { usedAt: now } });
  }

  countRecentEmailVerifications(userId: string, since: Date): Promise<number> {
    return this.db.emailVerification.count({ where: { userId, createdAt: { gte: since } } });
  }

  async createPasswordReset(userId: string, tokenHash: string, expiresAt: Date, ip: string | null): Promise<void> {
    await this.db.passwordReset.create({ data: { userId, tokenHash, expiresAt, requestedIp: ip } });
  }

  findPasswordReset(tokenHash: string): Promise<OneTimeTokenRecord | null> {
    return this.db.passwordReset.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
  }

  async markPasswordResetUsed(id: string, now: Date): Promise<void> {
    await this.db.passwordReset.update({ where: { id }, data: { usedAt: now } });
  }
}
