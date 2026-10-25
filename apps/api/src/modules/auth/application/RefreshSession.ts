import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import { toPublicUser, type PublicUser } from "../domain/User";
import type { AccessTokenService, SessionRepository, TokenGenerator, UserRepository } from "../domain/ports";
import { addDays } from "./SessionIssuer";

/** Menukar refresh token dengan access token baru, sekaligus memutar refresh token (dokumen 10.6). */
export class RefreshSession {
  constructor(
    private readonly deps: {
      users: UserRepository;
      sessions: SessionRepository;
      tokens: TokenGenerator;
      accessTokens: AccessTokenService;
      clock: Clock;
      refreshTtlDays: number;
    },
  ) {}

  async execute(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; refreshExpiresAt: Date; user: PublicUser }> {
    const now = this.deps.clock.now();
    const session = await this.deps.sessions.findByTokenHash(this.deps.tokens.hash(refreshToken));
    if (!session || session.revokedAt || session.expiresAt < now) throw Errors.unauthorized("Sesi berakhir. Silakan masuk lagi.");

    const user = await this.deps.users.findById(session.userId);
    if (!user || user.status === "suspended") throw Errors.unauthorized();

    const next = this.deps.tokens.generate();
    const refreshExpiresAt = addDays(now, this.deps.refreshTtlDays);
    await this.deps.sessions.rotate(session.id, next.hash, refreshExpiresAt, now);

    return {
      accessToken: this.deps.accessTokens.issue({ id: user.id, role: user.role }),
      refreshToken: next.token,
      refreshExpiresAt,
      user: toPublicUser(user),
    };
  }
}
