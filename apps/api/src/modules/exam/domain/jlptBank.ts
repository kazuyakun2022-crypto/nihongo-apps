import { JLPT_SIM_LEVELS, orderBySection, type JlptCode, type SimSection } from "./JlptSim";
import { JLPT_PACKAGE_COUNT, QUESTION_TYPE_MAP, type ImportedQuestion, type JlptPackage } from "./jlptImport";

/**
 * Bank soal Simulasi JLPT dalam bentuk file: satu file per tingkat per paket
 * (prisma/data/jlpt-sim/bank/n5/paket-02.json, soal tanpa paket di n5/campuran.json).
 * File ini hasil ekspor database yang sudah direview admin, dan sumber untuk mengisi database lain (production).
 * Bagian murni (tanpa database/file) ada di sini supaya bisa diuji; CLI-nya di prisma/scripts/jlptBank.ts.
 */

/** Tipe soal aplikasi -> questionType di file (kebalikan QUESTION_TYPE_MAP). */
export const CATEGORY_TO_TYPE: Record<string, string> = Object.fromEntries(Object.entries(QUESTION_TYPE_MAP).map(([t, c]) => [c, t]));

const SECTION_TO_TYPE: Record<SimSection, string> = {
  membaca: "MOJI_GOI",
  kosakata: "MOJI_GOI",
  tata_bahasa: "BUNPOU",
  dokkai: "DOKKAI",
  mendengar: "CHOUKAI",
};
const SECTION_TYPE_ORDER = ["MOJI_GOI", "BUNPOU", "DOKKAI", "CHOUKAI"];

export type StatusMode = "ikut-file" | "draft" | "published";

/** Satu soal bank seperti tersimpan di database (exam_questions bertipe jlpt_sim). */
export interface BankRow {
  id: string;
  levelCode: JlptCode;
  packageNo: number | null;
  section: SimSection;
  category: string | null;
  question: string;
  passage: string | null;
  options: string[];
  correctAnswer: string;
  audioUrl: string | null;
  imageUrl: string | null;
  explanation: string | null;
  difficulty: number;
  status: string;
  sourceKey: string | null;
}

export interface BankFile {
  /** Jalur relatif terhadap folder bank, mis. "n5/paket-02.json". */
  path: string;
  pkg: JlptPackage;
}

const pad = (n: number) => String(n).padStart(2, "0");
const TTS_PREFIX = "/api/tts?text=";

export function bankFilePath(level: JlptCode, packageNo: number | null) {
  return `${level.toLowerCase()}/${packageNo ? `paket-${pad(packageNo)}` : "campuran"}.json`;
}

export function packageSlug(level: JlptCode, packageNo: number | null) {
  return `jlpt-${level.toLowerCase()}-${packageNo ? `mock-${pad(packageNo)}` : "campuran"}`;
}

/**
 * Ubah baris database menjadi file paket. sourceKey dipertahankan (soal buatan admin yang belum punya
 * diberi kunci tetap dari id-nya), supaya injeksi ke database lain memperbarui soal yang sama, bukan menggandakan.
 */
export function buildBankFiles(rows: BankRow[]): { files: BankFile[]; skipped: string[] } {
  const skipped: string[] = [];
  const groups = new Map<string, BankRow[]>();
  for (const r of rows) {
    const key = `${r.levelCode}|${r.packageNo ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const files: BankFile[] = [];
  for (const [key, list] of groups) {
    const [level, no] = key.split("|") as [JlptCode, string];
    const packageNo = no ? Number(no) : null;
    const slug = packageSlug(level, packageNo);
    const sections = new Map<string, JlptPackage["sections"][number]>();
    for (const r of orderBySection(list)) {
      const idx = r.options.indexOf(r.correctAnswer);
      if (idx < 0) {
        skipped.push(`${level} ${packageNo ? `paket ${packageNo}` : "campuran"}: soal ${r.id} dilewati (jawaban benar tidak ada di pilihan).`);
        continue;
      }
      const sectionType = SECTION_TO_TYPE[r.section];
      const sec = sections.get(sectionType) ?? { sectionType, questions: [] };
      sections.set(sectionType, sec);
      // Audio TTS disimpan sebagai skripnya (terbaca & pendek); URL /api/tts dibentuk ulang saat injeksi
      const tts = r.audioUrl?.startsWith(TTS_PREFIX) ? decodeURIComponent(r.audioUrl.slice(TTS_PREFIX.length).split("&")[0]) : null;
      sec.questions.push({
        questionNumber: sec.questions.length + 1,
        questionType: r.category ? CATEGORY_TO_TYPE[r.category] ?? null : null,
        section: r.section,
        sourceKey: r.sourceKey ?? `${slug}:q:${r.id.slice(0, 8)}`,
        status: r.status === "published" ? "published" : "draft",
        promptText: r.question,
        passage: r.passage,
        ...(tts ? { audioScript: tts } : { audioUrl: r.audioUrl }),
        imageUrl: r.imageUrl,
        options: r.options,
        correctOptionIndex: idx + 1,
        explanation: r.explanation,
        difficulty: r.difficulty,
      });
    }
    if (!sections.size) continue;
    files.push({
      path: bankFilePath(level, packageNo),
      pkg: {
        examSlug: slug,
        levelCode: level,
        ...(packageNo ? { variantIndex: packageNo } : {}),
        title: `Simulasi JLPT ${level} - ${packageNo ? `Paket ${pad(packageNo)}` : "Soal campuran"}`,
        sections: [...sections.values()].sort((a, b) => SECTION_TYPE_ORDER.indexOf(a.sectionType) - SECTION_TYPE_ORDER.indexOf(b.sectionType)),
      },
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, skipped };
}

/** "N5,N4" atau "semua" -> daftar tingkat. */
export function parseLevels(raw: string | undefined): JlptCode[] {
  if (!raw || raw === "semua") return [...JLPT_SIM_LEVELS];
  const out = raw.split(",").map((s) => s.trim().toUpperCase());
  const bad = out.filter((l) => !(JLPT_SIM_LEVELS as readonly string[]).includes(l));
  if (bad.length) throw new Error(`Tingkat tidak dikenal: ${bad.join(", ")} (pakai N5, N4, N3, N2, N1, atau "semua").`);
  return out as JlptCode[];
}

/** "2-5,7" atau "semua" -> [2,3,4,5,7]. */
export function parsePackages(raw: string | undefined): number[] {
  if (!raw || raw === "semua") return Array.from({ length: JLPT_PACKAGE_COUNT }, (_, i) => i + 1);
  const out = new Set<number>();
  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(part);
    if (!m) throw new Error(`Rentang paket tidak dikenal: "${part}" (contoh: 2-5,7).`);
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    if (from < 1 || to > JLPT_PACKAGE_COUNT || from > to) throw new Error(`Paket harus 1-${JLPT_PACKAGE_COUNT}: "${part}".`);
    for (let n = from; n <= to; n++) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

export function resolveStatus(q: Pick<ImportedQuestion, "status">, mode: StatusMode): "published" | "draft" {
  if (mode === "ikut-file") return q.status ?? "draft";
  return mode;
}

export interface PlanEntry {
  level: JlptCode;
  packageNo: number | null;
  total: number;
  created: number;
  updated: number;
  published: number;
  draft: number;
}

/** Rencana injeksi per tingkat & paket: berapa soal baru, diperbarui, dan status akhirnya. */
export function planInjection(items: { level: JlptCode; q: ImportedQuestion }[], existing: Set<string>, mode: StatusMode): PlanEntry[] {
  const map = new Map<string, PlanEntry>();
  for (const { level, q } of items) {
    const key = `${level}|${q.packageNo ?? ""}`;
    const e = map.get(key) ?? { level, packageNo: q.packageNo, total: 0, created: 0, updated: 0, published: 0, draft: 0 };
    map.set(key, e);
    e.total++;
    if (existing.has(q.sourceKey)) e.updated++;
    else e.created++;
    if (resolveStatus(q, mode) === "published") e.published++;
    else e.draft++;
  }
  const order = (l: JlptCode) => (JLPT_SIM_LEVELS as readonly string[]).indexOf(l);
  return [...map.values()].sort((a, b) => order(a.level) - order(b.level) || (a.packageNo ?? 99) - (b.packageNo ?? 99));
}
