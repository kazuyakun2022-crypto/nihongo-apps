import type { Role } from "../../../shared/domain/types";

export interface Level {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isPremium: boolean;
}

export type ChapterStatus = "locked" | "open" | "completed";

export interface ChapterSummary {
  id: string;
  title: string;
  sortOrder: number;
  status: ChapterStatus;
  bestScore: number | null;
}

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  vocabularies: { id: string; word: string; reading: string; meaningId: string; exampleSentence: string | null }[];
  kanji: { id: string; character: string; onyomi: string | null; kunyomi: string | null; meaningId: string }[];
  grammarPoints: { id: string; pattern: string; explanation: string; exampleSentence: string | null }[];
  quizQuestions: { id: string; type: string; question: string; options: unknown }[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface QuizGradeResult {
  score: number;
  results: { questionId: string; correct: boolean; correctAnswer: string }[];
}

/** Aturan akses level: Belajar hanya untuk pelajar (siswa, premium, guru untuk tinjau kurikulum). Admin dan Super Admin bukan akun pelajar. */
export function canAccessLevel(level: Level, role: Role): boolean {
  if (role === "admin" || role === "super_admin") return false;
  if (!level.isPremium) return true;
  return role === "premium" || role === "teacher";
}

/** Nilai minimal kuis untuk menyelesaikan bab (dokumen 8.2). */
export const PASSING_QUIZ_SCORE = 70;

export interface NextChapterInfo {
  id: string;
  title: string;
  levelCode: string;
}

export interface LevelProgress {
  vocabLearned: number;
  vocabTarget: number;
  kanjiLearned: number;
  kanjiTarget: number;
  chaptersCompleted: number;
  chaptersTotal: number;
}

export const LEVEL_TARGETS: Record<number, { vocab: number; kanji: number }> = {
  1: { vocab: 0, kanji: 0 },
  2: { vocab: 800, kanji: 100 },
  3: { vocab: 700, kanji: 200 },
  4: { vocab: 2250, kanji: 350 },
  5: { vocab: 2250, kanji: 350 },
  6: { vocab: 4000, kanji: 1000 },
};

export interface LearningRepository {
  listLevels(): Promise<Level[]>;
  findLevel(id: number): Promise<Level | null>;
  listChaptersWithProgress(levelId: number, userId: string): Promise<ChapterSummary[]>;
  getChapter(id: string): Promise<ChapterDetail | null>;
  getNextChapter(userId: string, levelId: number): Promise<NextChapterInfo | null>;
  gradeQuizAnswers(chapterId: string, answers: QuizAnswer[]): Promise<QuizGradeResult>;
  saveQuizResult(userId: string, chapterId: string, score: number, passed: boolean, now: Date): Promise<void>;
  enqueueChapterItemsToSrs(userId: string, chapterId: string, dueDate: Date): Promise<void>;
  addXp(userId: string, xp: number): Promise<void>;
  getLevelProgress(userId: string, levelId: number): Promise<LevelProgress>;
}
