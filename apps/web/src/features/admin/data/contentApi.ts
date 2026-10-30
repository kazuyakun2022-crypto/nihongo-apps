import { apiRequest } from "@/core/http/apiClient";
import type { ExerciseType } from "@/shared/lib/exercises";

export type ContentStatus = "draft" | "review" | "published";
export type ExamSection = "kosakata" | "tata_bahasa" | "membaca" | "mendengar";
export type ItemKind = "block" | "vocab" | "kanji" | "grammar" | "quiz";
export type LessonBlockType = "teks" | "gambar" | "dialog" | "tips" | "huruf";
/** Tes naik tahap atau tes penempatan saat daftar; masing-masing punya aturan dan bank soal sendiri. */
export type ExamType = "level_up" | "placement";

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
}

/** Skenario latihan ngobrol AI (role-play) per level. */
export interface ScenarioRow {
  id: string;
  levelId: number;
  title: string;
  goal: string;
  mascotRole: string;
  initialMessage: string | null;
  targetGrammar: string[] | null;
  chapterId: string | null;
  maxTurns: number;
  status: ContentStatus;
  sortOrder: number;
  sourceKey: string | null;
  chapter: { title: string } | null;
  _count: { conversations: number };
}
export type ScenarioInput = Pick<ScenarioRow, "title" | "goal" | "mascotRole" | "initialMessage" | "chapterId" | "maxTurns" | "status" | "sortOrder"> & {
  targetGrammar: string[];
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

  exam: (levelId: number, type: ExamType, params: { section?: ExamSection; search?: string; page?: number }) => {
    const sp = new URLSearchParams({ type });
    if (params.section) sp.set("section", params.section);
    if (params.search) sp.set("search", params.search);
    if (params.page) sp.set("page", String(params.page));
    return apiRequest<{
      config: ExamConfig | null;
      questions: ExamQuestionItem[];
      total: number;
      page: number;
      pageSize: number;
      publishedPerSection: Partial<Record<ExamSection, number>>;
    }>(`${base}/levels/${levelId}/exam?${sp.toString()}`);
  },
  saveExamConfig: (levelId: number, type: ExamType, data: ExamConfig) =>
    apiRequest(`${base}/levels/${levelId}/exam?type=${type}`, json("PUT", data)),
  createExamQuestion: (levelId: number, type: ExamType, data: Omit<ExamQuestionItem, "id">) =>
    apiRequest(`${base}/levels/${levelId}/exam/questions?type=${type}`, json("POST", data)),
  updateExamQuestion: (id: string, data: Partial<Omit<ExamQuestionItem, "id">>) => apiRequest(`${base}/exam/questions/${id}`, json("PATCH", data)),
  deleteExamQuestion: (id: string) => apiRequest<{ archived?: boolean } | undefined>(`${base}/exam/questions/${id}`, json("DELETE")),
};
