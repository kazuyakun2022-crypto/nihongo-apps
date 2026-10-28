import type { Db } from "../../../shared/infrastructure/prisma";
import type { User } from "../domain/User";
import type { OnboardingProfile, UserRepository } from "../domain/ports";

const select = {
  id: true,
  email: true,
  passwordHash: true,
  isGuest: true,
  displayName: true,
  role: true,
  status: true,
  currentLevelId: true,
  gender: true,
  avatarUrl: true,
  dailyTargetMin: true,
  streakCount: true,
  xpTotal: true,
  emailVerifiedAt: true,
  failedLoginCount: true,
  lockedUntil: true,
  lastLoginAt: true,
} as const;

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id }, select });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email }, select });
  }

  create(data: Parameters<UserRepository["create"]>[0]): Promise<User> {
    return this.db.user.create({ data, select });
  }

  update(id: string, data: Partial<Omit<User, "id">>): Promise<User> {
    return this.db.user.update({ where: { id }, data, select });
  }

  updateProfile(id: string, data: OnboardingProfile): Promise<User> {
    return this.db.user.update({ where: { id }, data, select });
  }
}
