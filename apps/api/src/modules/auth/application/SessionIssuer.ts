import type { Clock } from "../../../shared/domain/types";
import { toPublicUser, type PublicUser, type User } from "../domain/User";
import type { AccessTokenService, DeviceInfo, SessionRepository, TokenGenerator } from "../domain/ports";

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: PublicUser;
}

/** Layanan aplikasi bersama: membuat sesi login baru (dipakai semua cara masuk). */
export class SessionIssuer {
  constructor(
    private readonly deps: {
      sessions: SessionRepository;
      tokens: TokenGenerator;
      accessTokens: AccessTokenService;
      clock: Clock;
      refreshTtlDays: number;
    },
  ) {}

  async issue(user: User, device: DeviceInfo): Promise<AuthResult> {
    const { token, hash } = this.deps.tokens.generate();
    const refreshExpiresAt = addDays(this.deps.clock.now(), this.deps.refreshTtlDays);
    await this.deps.sessions.create({ userId: user.id, refreshTokenHash: hash, expiresAt: refreshExpiresAt, ...device });
    return {
      accessToken: this.deps.accessTokens.issue({ id: user.id, role: user.role }),
      refreshToken: token,
      refreshExpiresAt,
      user: toPublicUser(user),
    };
  }
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);
export const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
