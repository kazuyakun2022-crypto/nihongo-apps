import { apiRequest } from "@/core/http/apiClient";
import type { ExerciseType } from "@/shared/lib/exercises";

export type ContentStatus = "draft" | "review" | "published";
/** dokkai hanya dipakai bank Simulasi JLPT. */
export type ExamSection = "kosakata" | "tata_bahasa" | "membaca" | "mendengar" | "dokkai";
export type ItemKind = "block" | "vocab" | "kanji" | "grammar" | "quiz";
export type LessonBlockType = "teks" | "gambar" | "dialog" | "tips" | "huruf";
/** Tes naik tahap atau tes penempatan saat daftar; masing-masing punya aturan dan bank soal sendiri. */
/** workbook = Gerbang Tulis (tulisan tangan): hanya aturan, tanpa bank soal. */
/** jlpt_sim = Simulasi JLPT N5-N1: bank soal sendiri, kekurangannya ditutup bank tes naik tahap. */
export type ExamType = "level_up" | "placement" | "workbook" | "jlpt_sim";

export interface ContentLevel {
  id: number;
  code: string;
  name: string;
  isPremium: boolean;
  chapters: Partial<Record<ContentStatus, number>>;
  examQuestions: number;
  placementQuestions: number;
  hasExam: boolean;
  hasPlacement: boolean;
  hasWorkbook: boolean;
  jlptSimQuestions: number;
  /** Level N5-N1 (punya simulasi JLPT). */
  hasJlptSim: boolean;
  /** Admin sudah menyimpan aturan simulasi sendiri. */
  jlptSimCustom: boolean;
}

export interface ChapterRow {
  id: string;
  title: string;
  status: ContentStatus;
  sortOrder: number;
  publishedAt: string | null;
  moduleTitle: string | null;
  _count: { vocabularies: number; kanji: number; grammarPoints: number; quizQuestions: number; lessonBlocks: number };
}

export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaningId: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}
export interface KanjiItem {
  id: string;
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  meaningId: string;
  strokeOrderUrl: string | null;
}
export interface GrammarItem {
  id: string;
  pattern: string;
  explanation: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  imageUrl: string | null;
}
/** Materi bebas di awal bab: teks penjelasan, gambar, dialog contoh, atau tips. */
export interface LessonBlockItem {
  id: string;
  type: LessonBlockType;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  caption: string | null;
  sortOrder: number;
}
export interface QuizItem {
  id: string;
  type: ExerciseType;
  question: string;
  hint: string | null;
  /** Pilihan jawaban; untuk soal susun = semua kepingan (kepingan jawaban lebih dulu); untuk berbicara = variasi jawaban. */
  options: string[] | null;
  correctAnswer: string;
  audioUrl: string | null;
  imageUrl: string | null;
  explanation: string | null;
}
export type QuizInput = Omit<QuizItem, "id" | "options"> & { options: string[] };

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  moduleTitle: string | null;
  passScore: number | null;
  status: ContentStatus;
  sourceKey: string | null;
  level: { id: number; code: string; name: string };
  lessonBlocks: LessonBlockItem[];
  vocabularies: VocabItem[];
  kanji: KanjiItem[];
  grammarPoints: GrammarItem[];
  quizQuestions: QuizItem[];
}

/** Isi layar pendaftaran awal (/mulai); satu titik mulai per level. */
export interface OnboardingConfig {
  title: string;
  goalQuestion: string;
  goals: { value: string; label: string }[];
  minutesQuestion: string;
  minuteOptions: number[];
  defaultMinutes: number;
  startQuestion: string;
  starts: { levelId: number; label: string; hint: string; enabled: boolean; requiresTest: boolean }[];
}

export interface ExamConfig {
  questionCount: number;
  timeLimitMin: number;
  passScore: number;
  sectionMinScore: number;
  cooldownHours: number;
  minChapterCompletion: number;
  /** Jumlah soal & nilai minimal per bagian; null = dibagi rata dengan sectionMinScore. */
  sectionRules?: Partial<Record<ExamSection, { count: number; minScore: number }>> | null;
}

/** Soal ujian memakai jenis latihan yang sama dengan latihan bab, ditambah bagian ujian. */
export interface ExamQuestionItem extends Omit<QuizItem, "options"> {
  options: string[];
  section: ExamSection;
  difficulty: number;
  status: ContentStatus;
  /** Simulasi JLPT: tipe soal resmi (Daimon). */
  category?: string | null;
  /** Simulasi JLPT: teks bacaan Dokkai atau skrip Choukai. */
  passage?: string | null;
  /** Simulasi JLPT: nomor paket 1-10; null = bank campuran. */
  packageNo?: number | null;
}

/** Ringkasan satu paket simulasi di admin. no null = soal campuran tanpa paket. */
export interface ExamPackageSummary {
  no: number | null;
  published: number;
  draft: number;
}

/** Skenario latihan ngobrol AI (role-play) per level. */
export interface ScenarioRow {
  id: string;
  levelId: number;
  title: string;
  goal: string;
  mascotRole: string;
  userRole?: string | null;
  location?: string | null;
  keigoType?: string | null;
  imageUrl?: string | null;
  initialMessage: string | null;
  targetGrammar: string[] | null;
  chapterId: string | null;
  maxTurns: number;
  status: ContentStatus;
  sortOrder: number;
  sourceKey: string | null;
  systemPrompt?: string | null;
  dialogueScript?: any | null;
  chapter: { title: string } | null;
  _count: { conversations: number };
}
export type ScenarioInput = Pick<
  ScenarioRow,
  "title" | "goal" | "mascotRole" | "initialMessage" | "chapterId" | "maxTurns" | "status" | "sortOrder"
> & {
  targetGrammar: string[];
  userRole?: string | null;
  location?: string | null;
  keigoType?: string | null;
  imageUrl?: string | null;
  systemPrompt?: string | null;
  dialogueScript?: any | null;
};

const base = "/admin/content";
const json = (method: string, body?: unknown) => ({ method, body }) as const;

export const contentApi = {
  levels: () => apiRequest<{ levels: ContentLevel[] }>(`${base}/levels`),

  chapters: (levelId: number) => apiRequest<{ chapters: ChapterRow[] }>(`${base}/levels/${levelId}/chapters`),
  createChapter: (levelId: number, data: { title: string; explanation?: string; moduleTitle?: string | null }) =>
    apiRequest<{ chapter: { id: string } }>(`${base}/levels/${levelId}/chapters`, json("POST", data)),
  reorderChapters: (levelId: number, ids: string[]) => apiRequest(`${base}/levels/${levelId}/chapters/order`, json("PUT", { ids })),
  chapter: (id: string) => apiRequest<{ chapter: ChapterDetail }>(`${base}/chapters/${id}`),
  updateChapter: (id: string, data: Partial<Pick<ChapterDetail, "title" | "explanation" | "moduleTitle" | "passScore" | "status">>) =>
    apiRequest(`${base}/chapters/${id}`, json("PATCH", data)),
  reorderBlocks: (chapterId: string, ids: string[]) => apiRequest(`${base}/chapters/${chapterId}/blocks/order`, json("PUT", { ids })),
  deleteChapter: (id: string) => apiRequest(`${base}/chapters/${id}`, json("DELETE")),

  createItem: (chapterId: string, kind: ItemKind, data: object) =>
    apiRequest(`${base}/chapters/${chapterId}/${kind}`, json("POST", data)),
  updateItem: (kind: ItemKind, id: string, data: object) => apiRequest(`${base}/items/${kind}/${id}`, json("PATCH", data)),
  deleteItem: (kind: ItemKind, id: string) => apiRequest(`${base}/items/${kind}/${id}`, json("DELETE")),

  scenarios: (levelId: number) => apiRequest<{ scenarios: ScenarioRow[] }>(`${base}/levels/${levelId}/scenarios`),
  createScenario: (levelId: number, data: ScenarioInput) => apiRequest(`${base}/levels/${levelId}/scenarios`, json("POST", data)),
  updateScenario: (id: string, data: Partial<ScenarioInput>) => apiRequest(`${base}/scenarios/${id}`, json("PATCH", data)),
  deleteScenario: (id: string) => apiRequest<{ archived?: boolean } | undefined>(`${base}/scenarios/${id}`, json("DELETE")),

  onboarding: () => apiRequest<{ config: OnboardingConfig }>(`${base}/onboarding`),
  saveOnboarding: (data: OnboardingConfig) => apiRequest<{ config: OnboardingConfig }>(`${base}/onboarding`, json("PUT", data)),

  exam: (
    levelId: number,
    type: ExamType,
    params: { section?: ExamSection; search?: string; page?: number; paket?: number | "campuran"; status?: "published" | "draft" },
  ) => {
    const sp = new URLSearchParams({ type });
    if (params.section) sp.set("section", params.section);
    if (params.paket) sp.set("paket", String(params.paket));
    if (params.status) sp.set("status", params.status);
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    return apiRequest<{
      config: ExamConfig | null;
      /** Aturan bawaan bila admin belum menyimpan (simulasi JLPT: rasio JLPT asli). */
      defaultConfig: ExamConfig | null;
      questions: ExamQuestionItem[];
      total: number;
      page: number;
      pageSize: number;
      publishedPerSection: Partial<Record<ExamSection, number>>;
      /** Simulasi JLPT: soal terbit tes naik tahap yang ikut dipakai bila bank simulasi kurang. */
      borrowedPerSection: Partial<Record<ExamSection, number>>;
      /** Simulasi JLPT: jumlah soal terbit dan draft per paket. */
      packages?: ExamPackageSummary[];
    }>(`${base}/levels/${levelId}/exam?${sp.toString()}`);
  },
  saveExamConfig: (levelId: number, type: ExamType, data: ExamConfig) =>
    apiRequest(`${base}/levels/${levelId}/exam?type=${type}`, json("PUT", data)),
  /** Impor paket soal Simulasi JLPT (format JSON data ingestion). */
  importJlptPackage: (levelId: number, pkg: unknown) =>
    apiRequest<{ created: number; updated: number; examSlug: string }>(`${base}/levels/${levelId}/exam/import?type=jlpt_sim`, json("POST", pkg)),
  /** Terbitkan (atau tarik ke draft) seluruh soal satu paket simulasi. */
  publishJlptPackage: (levelId: number, no: number, status: "published" | "draft") =>
    apiRequest<{ updated: number; status: string }>(`${base}/levels/${levelId}/exam/packages/${no}/publish`, json("POST", { status })),
  resetExamConfig: (levelId: number, type: ExamType) =>
    apiRequest(`${base}/levels/${levelId}/exam?type=${type}`, json("DELETE")),
  createExamQuestion: (levelId: number, type: ExamType, data: Omit<ExamQuestionItem, "id">) =>
    apiRequest(`${base}/levels/${levelId}/exam/questions?type=${type}`, json("POST", data)),
  updateExamQuestion: (id: string, data: Partial<Omit<ExamQuestionItem, "id">>) => apiRequest(`${base}/exam/questions/${id}`, json("PATCH", data)),
  deleteExamQuestion: (id: string) => apiRequest<{ archived?: boolean } | undefined>(`${base}/exam/questions/${id}`, json("DELETE")),
};
