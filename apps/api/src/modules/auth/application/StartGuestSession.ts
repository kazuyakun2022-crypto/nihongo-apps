import type { DeviceInfo, UserRepository } from "../domain/ports";
import type { AuthResult, SessionIssuer } from "./SessionIssuer";

/** Dokumen 10.5: Tamu mendapat akun sementara agar progres demo tersimpan. */
export class StartGuestSession {
  constructor(private readonly deps: { users: UserRepository; sessions: SessionIssuer }) {}

  async execute(device: DeviceInfo): Promise<AuthResult> {
    const user = await this.deps.users.create({
      email: null,
      passwordHash: null,
      displayName: "Tamu",
      isGuest: true,
      role: "guest",
    });
    return this.deps.sessions.issue(user, device);
  }
}
