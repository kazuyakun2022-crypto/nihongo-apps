import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import type { OneTimeTokenRepository, TokenGenerator, UserRepository } from "../domain/ports";

export class VerifyEmail {
  constructor(
    private readonly deps: {
      users: UserRepository;
      oneTimeTokens: OneTimeTokenRepository;
      tokens: TokenGenerator;
      clock: Clock;
    },
  ) {}

  async execute(token: string): Promise<void> {
    const now = this.deps.clock.now();
    const record = await this.deps.oneTimeTokens.findEmailVerification(this.deps.tokens.hash(token));
    if (!record || record.usedAt || record.expiresAt < now) {
      throw Errors.validation("Link verifikasi tidak valid atau sudah kedaluwarsa. Minta link baru dari Pengaturan.");
    }
    await this.deps.oneTimeTokens.markEmailVerificationUsed(record.id, now);
    await this.deps.users.update(record.userId, { email: record.email ?? undefined, emailVerifiedAt: now });
  }
}
