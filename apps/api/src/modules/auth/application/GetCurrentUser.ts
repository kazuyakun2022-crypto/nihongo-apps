import { Errors } from "../../../shared/domain/errors";
import { toPublicUser, type PublicUser } from "../domain/User";
import type { UserRepository } from "../domain/ports";

export class GetCurrentUser {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.deps.users.findById(userId);
    if (!user) throw Errors.notFound("Pengguna");
    return toPublicUser(user);
  }
}
