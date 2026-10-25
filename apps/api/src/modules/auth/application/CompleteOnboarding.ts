import { toPublicUser, type PublicUser } from "../domain/User";
import type { OnboardingProfile, UserRepository } from "../domain/ports";

/** Dokumen 8.1 langkah 3–6: simpan tujuan, target harian, dan level awal. */
export class CompleteOnboarding {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(userId: string, profile: OnboardingProfile): Promise<PublicUser> {
    return toPublicUser(await this.deps.users.updateProfile(userId, profile));
  }
}
