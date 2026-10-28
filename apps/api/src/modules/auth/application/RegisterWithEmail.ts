import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import { AuthPolicy, type Gender } from "../domain/User";
import type { DeviceInfo, PasswordHasher, UserRepository } from "../domain/ports";
import type { AuthResult, SessionIssuer } from "./SessionIssuer";
import type { SendEmailVerification } from "./SendEmailVerification";

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  /** Menentukan panggilan Miu-chan di obrolan suara: お兄ちゃん / お姉ちゃん. */
  gender?: Gender;
  /** Jika diisi, akun Tamu ini diubah menjadi akun Pelajar (dokumen 10.5). */
  guestUserId?: string;
  device: DeviceInfo;
}

/** Dokumen 10.1: pendaftaran dengan email. */
export class RegisterWithEmail {
  constructor(
    private readonly deps: {
      users: UserRepository;
      hasher: PasswordHasher;
      sessions: SessionIssuer;
      sendVerification: SendEmailVerification;
      clock: Clock;
    },
  ) {}

  async execute(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (input.password.length < AuthPolicy.minPasswordLength) {
      throw Errors.validation(`Password minimal ${AuthPolicy.minPasswordLength} karakter.`);
    }
    if (await this.deps.users.findByEmail(email)) {
      throw Errors.conflict("Email ini sudah terdaftar. Silakan masuk.");
    }

    const passwordHash = await this.deps.hasher.hash(input.password);
    const guest = input.guestUserId ? await this.deps.users.findById(input.guestUserId) : null;

    const user =
      guest && guest.isGuest
        ? await this.deps.users.update(guest.id, {
            email,
            passwordHash,
            displayName: input.displayName,
            gender: input.gender ?? null,
            isGuest: false,
            role: "student",
          })
        : await this.deps.users.create({
            email,
            passwordHash,
            displayName: input.displayName,
            gender: input.gender ?? null,
            isGuest: false,
            role: "student",
          });

    await this.deps.sendVerification.execute(user.id);
    return this.deps.sessions.issue(user, input.device);
  }
}
