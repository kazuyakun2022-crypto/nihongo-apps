import { toPublicUser, type PublicUser } from "../domain/User";
import type { UserRepository } from "../domain/ports";

export class UpdateAvatar {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(userId: string, avatarUrl: string | null): Promise<PublicUser> {
    const updated = await this.deps.users.update(userId, { avatarUrl });
    return toPublicUser(updated);
  }
}
