/**
 * Aturan ujian per bagian (mis. N5: kosakata 35 soal min. 80, mendengar 20 soal min. 75).
 * Tanpa aturan, soal dibagi rata ke empat bagian dan semua bagian memakai sectionMinScore yang sama.
 */
export const EXAM_SECTIONS = ["kosakata", "tata_bahasa", "membaca", "mendengar"] as const;
export type ExamSectionKey = (typeof EXAM_SECTIONS)[number];
export type SectionRules = Partial<Record<ExamSectionKey, { count: number; minScore: number }>>;

/** Batas lewat waktu yang masih ditoleransi (jaringan lambat saat mengirim). */
export const LATE_GRACE_MS = 2 * 60_000;

export function parseSectionRules(value: unknown): SectionRules | null {
  if (!value || typeof value !== "object") return null;
  const rules: SectionRules = {};
  for (const s of EXAM_SECTIONS) {
    const r = (value as Record<string, unknown>)[s] as { count?: unknown; minScore?: unknown } | undefined;
    if (r && Number.isInteger(r.count) && Number.isInteger(r.minScore) && (r.count as number) > 0) {
      rules[s] = { count: r.count as number, minScore: r.minScore as number };
    }
  }
  return Object.keys(rules).length ? rules : null;
}

/** Jumlah soal satu ujian: jumlah per bagian bila ada aturan, selain itu questionCount. */
export function examTotal(questionCount: number, rules: SectionRules | null): number {
  return rules ? Object.values(rules).reduce((sum, r) => sum + (r?.count ?? 0), 0) : questionCount;
}

export function sectionMin(rules: SectionRules | null, section: string, fallback: number): number {
  return rules?.[section as ExamSectionKey]?.minScore ?? fallback;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ambil soal per bagian sesuai aturan (atau dibagi rata). Kekurangan di satu bagian ditutup soal acak
 * dari bagian lain supaya jumlah total tetap terpenuhi.
 */
export function pickQuestions<T extends { section: string }>(pool: T[], questionCount: number, rules: SectionRules | null): T[] {
  const total = examTotal(questionCount, rules);
  const perSection = (s: ExamSectionKey) => (rules ? rules[s]?.count ?? 0 : Math.floor(total / EXAM_SECTIONS.length));
  const picked = EXAM_SECTIONS.flatMap((s) => shuffle(pool.filter((q) => q.section === s)).slice(0, perSection(s)));
  const rest = shuffle(pool.filter((q) => !picked.includes(q)));
  return [...picked, ...rest].slice(0, total);
}
