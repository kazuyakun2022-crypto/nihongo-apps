import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import { AuthPolicy } from "../domain/User";
import type { EmailSender, OneTimeTokenRepository, TokenGenerator, UserRepository } from "../domain/ports";
import { addMinutes } from "./SessionIssuer";

/** Mengirim (atau mengirim ulang) link verifikasi email, maks. 3 kali per jam. */
export class SendEmailVerification {
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

  async execute(userId: string): Promise<void> {
    const user = await this.deps.users.findById(userId);
    if (!user || !user.email) throw Errors.notFound("Pengguna");
    if (user.emailVerifiedAt) return;

    const now = this.deps.clock.now();
    const recent = await this.deps.oneTimeTokens.countRecentEmailVerifications(userId, addMinutes(now, -60));
    if (recent >= 3) throw Errors.quota("Link verifikasi sudah dikirim 3 kali dalam satu jam. Coba lagi nanti.");

    const { token, hash } = this.deps.tokens.generate();
    const expiresAt = addMinutes(now, AuthPolicy.emailVerificationHours * 60);
    await this.deps.oneTimeTokens.createEmailVerification(userId, user.email, hash, expiresAt);
    await this.deps.email.sendVerification(
      user.email,
      user.displayName,
      `${this.deps.webOrigin}/verifikasi-email?token=${token}`,
    );
  }
}
