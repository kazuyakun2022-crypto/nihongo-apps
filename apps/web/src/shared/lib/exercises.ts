export type ExerciseType = "pilihan_ganda" | "mendengar" | "susun_huruf" | "susun_kalimat" | "menulis" | "berbicara";
export type SkillId = "pemahaman" | "mendengar" | "menyusun" | "menulis" | "berbicara";

/** Keterampilan yang dilatih — dipakai untuk mengelompokkan latihan di admin dan menunjukkan ke siswa apa yang sedang dipelajari. */
export const SKILLS: Record<SkillId, { label: string; icon: string }> = {
  pemahaman: { label: "Pemahaman", icon: "📖" },
  mendengar: { label: "Mendengar", icon: "🎧" },
  menyusun: { label: "Menyusun", icon: "🧩" },
  menulis: { label: "Menulis", icon: "✍️" },
  berbicara: { label: "Berbicara", icon: "🎤" },
};
export const SKILL_ORDER: SkillId[] = ["pemahaman", "mendengar", "menyusun", "menulis", "berbicara"];

export const EXERCISES: Record<ExerciseType, { label: string; skill: SkillId; instruction: string; description: string }> = {
  pilihan_ganda: {
    label: "Pilihan ganda",
    skill: "pemahaman",
    instruction: "Pilih jawaban yang benar",
    description: "Siswa memilih satu jawaban dari beberapa pilihan.",
  },
  mendengar: {
    label: "Mendengar",
    skill: "mendengar",
    instruction: "Dengarkan, lalu pilih jawaban yang benar",
    description: "Audio diputar, siswa memilih jawaban.",
  },
  susun_huruf: {
    label: "Susun huruf",
    skill: "menyusun",
    instruction: "Susun huruf menjadi kata",
    description: "Siswa menyusun kepingan huruf menjadi satu kata.",
  },
  susun_kalimat: {
    label: "Susun kalimat",
    skill: "menyusun",
    instruction: "Susun kata menjadi kalimat",
    description: "Siswa menyusun kepingan kata menjadi kalimat.",
  },
  menulis: {
    label: "Menulis",
    skill: "menulis",
    instruction: "Tulis dengan huruf Jepang",
    description: "Romaji ditampilkan, siswa menulis tangan hurufnya. Coretan dikenali otomatis dan masuk ke kotak jawaban.",
  },
  berbicara: {
    label: "Berbicara",
    skill: "berbicara",
    instruction: "Ucapkan kalimat ini",
    description: "Siswa merekam ucapannya, lalu dicocokkan dengan kalimat target.",
  },
};
export const EXERCISE_ORDER: ExerciseType[] = ["pilihan_ganda", "mendengar", "susun_huruf", "susun_kalimat", "menulis", "berbicara"];

/** Jumlah latihan per keterampilan, urut sesuai SKILL_ORDER. */
export function countBySkill(types: ExerciseType[]): { skill: SkillId; count: number }[] {
  const counts = new Map<SkillId, number>();
  for (const t of types) {
    const skill = EXERCISES[t]?.skill ?? "pemahaman";
    counts.set(skill, (counts.get(skill) ?? 0) + 1);
  }
  return SKILL_ORDER.filter((s) => counts.has(s)).map((skill) => ({ skill, count: counts.get(skill) ?? 0 }));
}
