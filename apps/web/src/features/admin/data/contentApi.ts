import { apiRequest } from "@/core/http/apiClient";
import type { ExerciseType } from "@/shared/lib/exercises";

export type ContentStatus = "draft" | "review" | "published";
export type ExamSection = "kosakata" | "tata_bahasa" | "membaca" | "mendengar";
export type ItemKind = "vocab" | "kanji" | "grammar" | "quiz";
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
  _count: { vocabularies: number; kanji: number; grammarPoints: number; quizQuestions: number };
}

export interface VocabItem {
  id: string;
  word: string;
  reading: string;
  meaningId: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  audioUrl: string | null;
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
  explanation: string | null;
}
export type QuizInput = Omit<QuizItem, "id" | "options"> & { options: string[] };

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  status: ContentStatus;
  sourceKey: string | null;
  level: { id: number; code: string; name: string };
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
}

/** Soal ujian memakai jenis latihan yang sama dengan latihan bab, ditambah bagian ujian. */
export interface ExamQuestionItem extends Omit<QuizItem, "options"> {
  options: string[];
  section: ExamSection;
  difficulty: number;
  status: ContentStatus;
}

const base = "/admin/content";
const json = (method: string, body?: unknown) => ({ method, body }) as const;

export const contentApi = {
  levels: () => apiRequest<{ levels: ContentLevel[] }>(`${base}/levels`),

  chapters: (levelId: number) => apiRequest<{ chapters: ChapterRow[] }>(`${base}/levels/${levelId}/chapters`),
  createChapter: (levelId: number, data: { title: string; explanation?: string }) =>
    apiRequest<{ chapter: { id: string } }>(`${base}/levels/${levelId}/chapters`, json("POST", data)),
  reorderChapters: (levelId: number, ids: string[]) => apiRequest(`${base}/levels/${levelId}/chapters/order`, json("PUT", { ids })),
  chapter: (id: string) => apiRequest<{ chapter: ChapterDetail }>(`${base}/chapters/${id}`),
  updateChapter: (id: string, data: Partial<Pick<ChapterDetail, "title" | "explanation" | "status">>) =>
    apiRequest(`${base}/chapters/${id}`, json("PATCH", data)),
  deleteChapter: (id: string) => apiRequest(`${base}/chapters/${id}`, json("DELETE")),

  createItem: (chapterId: string, kind: ItemKind, data: object) =>
    apiRequest(`${base}/chapters/${chapterId}/${kind}`, json("POST", data)),
  updateItem: (kind: ItemKind, id: string, data: object) => apiRequest(`${base}/items/${kind}/${id}`, json("PATCH", data)),
  deleteItem: (kind: ItemKind, id: string) => apiRequest(`${base}/items/${kind}/${id}`, json("DELETE")),

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
