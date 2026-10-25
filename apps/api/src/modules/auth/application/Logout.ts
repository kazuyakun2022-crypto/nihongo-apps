import type { Clock } from "../../../shared/domain/types";
import type { SessionRepository, TokenGenerator } from "../domain/ports";

export class Logout {
  constructor(private readonly deps: { sessions: SessionRepository; tokens: TokenGenerator; clock: Clock }) {}

  async execute(refreshToken: string | undefined, opts: { userId?: string; allDevices?: boolean } = {}): Promise<void> {
    const now = this.deps.clock.now();
    if (opts.allDevices && opts.userId) {
      await this.deps.sessions.revokeAllForUser(opts.userId, now);
      return;
    }
    if (!refreshToken) return;
    const session = await this.deps.sessions.findByTokenHash(this.deps.tokens.hash(refreshToken));
    if (session && !session.revokedAt) await this.deps.sessions.revoke(session.id, now);
  }
}
