import { Errors } from "../../../shared/domain/errors";
import type { Clock } from "../../../shared/domain/types";
import type {
  DeviceInfo,
  OAuthAccountRepository,
  OAuthProviderName,
  OAuthVerifier,
  UserRepository,
} from "../domain/ports";
import type { AuthResult, SessionIssuer } from "./SessionIssuer";

/** Dokumen 10.2: masuk dengan Google atau Apple. */
export class LoginWithOAuth {
  constructor(
    private readonly deps: {
      users: UserRepository;
      oauthAccounts: OAuthAccountRepository;
      verifier: OAuthVerifier;
      sessions: SessionIssuer;
      clock: Clock;
    },
  ) {}

  async execute(input: { provider: OAuthProviderName; idToken: string; device: DeviceInfo }): Promise<AuthResult> {
    const identity = await this.deps.verifier.verify(input.provider, input.idToken);
    const now = this.deps.clock.now();

    const linkedUserId = await this.deps.oauthAccounts.findUserId(identity.provider, identity.providerUserId);
    if (linkedUserId) {
      const user = await this.deps.users.findById(linkedUserId);
      if (!user) throw Errors.notFound("Pengguna");
      return this.deps.sessions.issue(await this.deps.users.update(user.id, { lastLoginAt: now }), input.device);
    }

    if (identity.email) {
      const existing = await this.deps.users.findByEmail(identity.email.toLowerCase());
      if (existing?.passwordHash) {
        // Email sama sudah terdaftar dengan password: minta password sekali untuk menghubungkan.
        throw Errors.conflict("Email ini sudah terdaftar dengan password. Masuk dengan password untuk menghubungkan akun.");
      }
    }

    const user = await this.deps.users.create({
      email: identity.email?.toLowerCase() ?? null,
      passwordHash: null,
      displayName: identity.name ?? "Pelajar",
      isGuest: false,
      role: "student",
      emailVerifiedAt: identity.emailVerified ? now : null,
    });
    await this.deps.oauthAccounts.link(user.id, identity.provider, identity.providerUserId, identity.email);
    return this.deps.sessions.issue(user, input.device);
  }
}
