import type { Prisma } from "@prisma/client";
import { Errors } from "../../../shared/domain/errors";
import type { Db } from "../../../shared/infrastructure/prisma";
import type { OnboardingGuard, OnboardingProfile } from "../../auth/domain/ports";
import {
  DEFAULT_ONBOARDING_CONFIG,
  ONBOARDING_SETTING_KEY,
  onboardingChoiceProblem,
  withLevels,
  type OnboardingConfig,
} from "../domain/Onboarding";

export async function loadOnboardingConfig(db: Db): Promise<OnboardingConfig> {
  const [row, levels] = await Promise.all([
    db.appSetting.findUnique({ where: { key: ONBOARDING_SETTING_KEY } }),
    db.level.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const saved = row ? (row.value as unknown as OnboardingConfig) : DEFAULT_ONBOARDING_CONFIG;
  return withLevels(saved, levels);
}

export async function saveOnboardingConfig(db: Db, config: OnboardingConfig, actorId: string): Promise<void> {
  const value = config as unknown as Prisma.InputJsonValue;
  await db.$transaction([
    db.appSetting.upsert({
      where: { key: ONBOARDING_SETTING_KEY },
      create: { key: ONBOARDING_SETTING_KEY, value, updatedById: actorId },
      update: { value, updatedById: actorId },
    }),
    db.auditLog.create({
      data: {
        actorId,
        action: "update_onboarding",
        details: {
          activeStarts: config.starts.filter((s) => s.enabled).length,
          testedStarts: config.starts.filter((s) => s.enabled && s.requiresTest).length,
          goals: config.goals.length,
        },
      },
    }),
  ]);
}

/** Pilihan pendaftaran harus sesuai pengaturan admin; titik mulai yang wajib tes butuh tes penempatan yang sudah lulus. */
export class PrismaOnboardingGuard implements OnboardingGuard {
  constructor(private readonly db: Db) {}

  async assertAllowed(userId: string, profile: OnboardingProfile): Promise<void> {
    const config = await loadOnboardingConfig(this.db);
    const problem = onboardingChoiceProblem(config, profile);
    if (problem) throw Errors.validation(problem);

    const start = config.starts.find((s) => s.levelId === profile.currentLevelId);
    if (!start?.requiresTest) return;
    const passed = await this.db.examAttempt.count({
      where: { userId, levelId: profile.currentLevelId, type: "placement", passed: true },
    });
    if (passed === 0) throw Errors.forbidden("Lulus tes penempatan dulu untuk mulai di level ini.");
  }
}
