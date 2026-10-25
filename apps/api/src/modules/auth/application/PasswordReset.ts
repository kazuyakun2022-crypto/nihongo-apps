import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import { AuthPolicy } from "../domain/User";
import type {
  EmailSender,
  OneTimeTokenRepository,
  PasswordHasher,
  SessionRepository,
  TokenGenerator,
  UserRepository,
} from "../domain/ports";
import { addMinutes } from "./SessionIssuer";

/** Dokumen 10.4 langkah 1–3: selalu berhasil dari sisi klien agar email tidak bisa ditebak. */
export class RequestPasswordReset {
  constructor(
    private readonly deps: {
      users: UserRepository;
      oneTimeTokens: OneTimeTokenRepository;
      tokens: TokenGenerator;
      email: EmailSender;
      clock: Clock;
      webOrigin: string;
    },
  ) {}

  async execute(email: string, ip: string | null): Promise<void> {
    const user = await this.deps.users.findByEmail(email.trim().toLowerCase());
    if (!user || !user.email || user.isGuest) return;

    const { token, hash } = this.deps.tokens.generate();
    const expiresAt = addMinutes(this.deps.clock.now(), AuthPolicy.passwordResetMinutes);
    await this.deps.oneTimeTokens.createPasswordReset(user.id, hash, expiresAt, ip);
    await this.deps.email.sendPasswordReset(user.email, `${this.deps.webOrigin}/reset-password?token=${token}`);
  }
}

/** Dokumen 10.4 langkah 4: simpan password baru dan keluarkan semua perangkat. */
export class ResetPassword {
  constructor(
    private readonly deps: {
      users: UserRepository;
      oneTimeTokens: OneTimeTokenRepository;
      sessions: SessionRepository;
      tokens: TokenGenerator;
      hasher: PasswordHasher;
      clock: Clock;
    },
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < AuthPolicy.minPasswordLength) {
      throw Errors.validation(`Password minimal ${AuthPolicy.minPasswordLength} karakter.`);
    }
    const now = this.deps.clock.now();
    const record = await this.deps.oneTimeTokens.findPasswordReset(this.deps.tokens.hash(token));
    if (!record || record.usedAt || record.expiresAt < now) {
      throw Errors.validation("Link reset tidak valid atau sudah kedaluwarsa. Minta link baru.");
    }
    await this.deps.oneTimeTokens.markPasswordResetUsed(record.id, now);
    await this.deps.users.update(record.userId, {
      passwordHash: await this.deps.hasher.hash(newPassword),
      failedLoginCount: 0,
      lockedUntil: null,
    });
    await this.deps.sessions.revokeAllForUser(record.userId, now);
  }
}
