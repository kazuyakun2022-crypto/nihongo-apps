import { describe, expect, it } from "vitest";
import { levelLockReason } from "../src/modules/learning/domain/Learning";
import { DEFAULT_ONBOARDING_CONFIG, onboardingChoiceProblem, withLevels } from "../src/modules/learning/domain/Onboarding";

const level = (id: number, isPremium = false) => ({ id, code: `L${id}`, name: `Level ${id}`, sortOrder: id, isPremium });

describe("akses level berdasarkan level aktif pelajar", () => {
  it("pelajar Pemula hanya membuka level Pemula", () => {
    expect(levelLockReason(level(1), "student", 1)).toBeNull();
    expect(levelLockReason(level(2), "student", 1)).toBe("level");
  });

  it("level aktif dan level di bawahnya terbuka, level di atasnya terkunci", () => {
    expect(levelLockReason(level(2), "student", 3)).toBeNull();
    expect(levelLockReason(level(3), "student", 3)).toBeNull();
    expect(levelLockReason(level(4), "student", 3)).toBe("level");
  });

  it("pelajar yang belum memilih level hanya membuka level pertama", () => {
    expect(levelLockReason(level(1), "student", null)).toBeNull();
    expect(levelLockReason(level(2), "student", null)).toBe("level");
  });

  it("level Premium tetap butuh Premium meski sudah tercapai", () => {
    expect(levelLockReason(level(4, true), "student", 4)).toBe("premium");
    expect(levelLockReason(level(4, true), "premium", 4)).toBeNull();
  });

  it("guru melihat semua level untuk meninjau kurikulum", () => {
    expect(levelLockReason(level(6, true), "teacher", 1)).toBeNull();
  });
});

describe("pilihan pendaftaran", () => {
  const config = DEFAULT_ONBOARDING_CONFIG;

  it("menerima pilihan yang ada di pengaturan", () => {
    expect(onboardingChoiceProblem(config, { currentLevelId: 1, learningGoal: "jlpt", dailyTargetMin: 10 })).toBeNull();
  });

  it("menolak tujuan, menit, atau titik mulai yang tidak tersedia", () => {
    expect(onboardingChoiceProblem(config, { currentLevelId: 1, learningGoal: "lain", dailyTargetMin: 10 })).not.toBeNull();
    expect(onboardingChoiceProblem(config, { currentLevelId: 1, learningGoal: "jlpt", dailyTargetMin: 7 })).not.toBeNull();
    const disabled = { ...config, starts: config.starts.map((s) => (s.levelId === 2 ? { ...s, enabled: false } : s)) };
    expect(onboardingChoiceProblem(disabled, { currentLevelId: 2, learningGoal: "jlpt", dailyTargetMin: 10 })).not.toBeNull();
  });

  it("menyesuaikan titik mulai dengan daftar level di database", () => {
    const merged = withLevels(config, [level(1), level(2), level(9)]);
    expect(merged.starts.map((s) => s.levelId)).toEqual([1, 2, 9]);
    expect(merged.starts[2]).toMatchObject({ enabled: false, requiresTest: true });
  });
});
