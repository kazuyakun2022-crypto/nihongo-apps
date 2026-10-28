import { toPublicUser, type PublicUser } from "../domain/User";
import type { OnboardingGuard, OnboardingProfile, UserRepository } from "../domain/ports";

/** Dokumen 8.1 langkah 3–6: simpan tujuan, target harian, dan level awal. */
export class CompleteOnboarding {
  constructor(private readonly deps: { users: UserRepository; guard: OnboardingGuard }) {}

  async execute(userId: string, profile: OnboardingProfile): Promise<PublicUser> {
    await this.deps.guard.assertAllowed(userId, profile);
    return toPublicUser(await this.deps.users.updateProfile(userId, profile));
  }
}
