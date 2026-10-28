/** Isi layar pendaftaran awal (/mulai). Diatur admin; nilai bawaan dipakai sampai admin menyimpan pengaturan. */
export interface OnboardingStart {
  levelId: number;
  label: string;
  hint: string;
  enabled: boolean;
  /** Siswa harus lulus tes penempatan level ini sebelum boleh mulai di sini. */
  requiresTest: boolean;
}

export interface OnboardingConfig {
  title: string;
  goalQuestion: string;
  goals: { value: string; label: string }[];
  minutesQuestion: string;
  minuteOptions: number[];
  defaultMinutes: number;
  startQuestion: string;
  starts: OnboardingStart[];
}

export const ONBOARDING_SETTING_KEY = "onboarding";

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  title: "Halo! Ceritakan sedikit tentangmu.",
  goalQuestion: "Kenapa kamu belajar bahasa Jepang?",
  goals: [
    { value: "jlpt", label: "Lulus JLPT" },
    { value: "kerja", label: "Kerja atau magang di Jepang" },
    { value: "hobi", label: "Anime, manga, dan musik" },
    { value: "wisata", label: "Jalan-jalan ke Jepang" },
  ],
  minutesQuestion: "Berapa menit sehari?",
  minuteOptions: [5, 10, 20],
  defaultMinutes: 10,
  startQuestion: "Dari mana kamu mulai?",
  starts: [
    { levelId: 1, label: "Mulai dari nol", hint: "Belum bisa membaca hiragana", enabled: true, requiresTest: false },
    { levelId: 2, label: "Sudah bisa kana", hint: "Langsung ke materi N5", enabled: true, requiresTest: false },
    { levelId: 3, label: "Sudah lulus N5", hint: "Lanjut ke N4 — perlu tes singkat dulu", enabled: true, requiresTest: true },
    { levelId: 4, label: "Sudah lulus N4", hint: "Lanjut ke N3 — perlu tes singkat dulu", enabled: true, requiresTest: true },
    { levelId: 5, label: "Sudah lulus N3", hint: "Lanjut ke N2 — perlu tes singkat dulu", enabled: true, requiresTest: true },
    { levelId: 6, label: "Sudah lulus N2", hint: "Lanjut ke N1 — perlu tes singkat dulu", enabled: true, requiresTest: true },
  ],
};

/**
 * Lengkapi pengaturan tersimpan dengan level yang ada di database:
 * level baru muncul sebagai pilihan nonaktif, level yang sudah dihapus dibuang.
 */
export function withLevels(config: OnboardingConfig, levels: { id: number; code: string; name: string }[]): OnboardingConfig {
  const starts = levels.map(
    (l) =>
      config.starts.find((s) => s.levelId === l.id) ??
      DEFAULT_ONBOARDING_CONFIG.starts.find((s) => s.levelId === l.id) ?? {
        levelId: l.id,
        label: `Mulai di ${l.name}`,
        hint: "",
        enabled: false,
        requiresTest: true,
      },
  );
  return { ...config, starts };
}

/** Pesan galat jika pilihan siswa tidak sesuai pengaturan; null jika sah. */
export function onboardingChoiceProblem(
  config: OnboardingConfig,
  choice: { currentLevelId: number; learningGoal: string; dailyTargetMin: number },
): string | null {
  if (!config.goals.some((g) => g.value === choice.learningGoal)) return "Tujuan belajar tidak tersedia.";
  if (!config.minuteOptions.includes(choice.dailyTargetMin)) return "Target menit harian tidak tersedia.";
  const start = config.starts.find((s) => s.levelId === choice.currentLevelId);
  if (!start?.enabled) return "Titik mulai ini tidak tersedia.";
  return null;
}
