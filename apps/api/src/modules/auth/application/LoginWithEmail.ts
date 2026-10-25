import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import { AuthPolicy, isLocked } from "../domain/User";
import type { DeviceInfo, PasswordHasher, UserRepository } from "../domain/ports";
import { addMinutes, type AuthResult, type SessionIssuer } from "./SessionIssuer";

const WRONG_CREDENTIALS = "Email atau password salah.";

/** Dokumen 10.3: masuk dengan email, dikunci 15 menit setelah 5 kali gagal. */
export class LoginWithEmail {
  constructor(
    private readonly deps: {
      users: UserRepository;
      hasher: PasswordHasher;
      sessions: SessionIssuer;
      clock: Clock;
    },
  ) {}

  async execute(input: { email: string; password: string; device: DeviceInfo }): Promise<AuthResult> {
    const now = this.deps.clock.now();
    const user = await this.deps.users.findByEmail(input.email.trim().toLowerCase());
    if (!user || !user.passwordHash) throw Errors.unauthorized(WRONG_CREDENTIALS);

    if (isLocked(user, now)) {
      throw Errors.locked(`Terlalu banyak percobaan. Coba lagi dalam ${AuthPolicy.lockMinutes} menit.`, user.lockedUntil!);
    }
    if (user.status === "suspended") throw Errors.forbidden("Akun ini sedang ditangguhkan. Hubungi dukungan.");

    const ok = await this.deps.hasher.verify(input.password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= AuthPolicy.maxFailedLogins;
      await this.deps.users.update(user.id, {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? addMinutes(now, AuthPolicy.lockMinutes) : null,
      });
      throw Errors.unauthorized(WRONG_CREDENTIALS);
    }

    const updated = await this.deps.users.update(user.id, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now });
    return this.deps.sessions.issue(updated, input.device);
  }
}
