import { api, apiRequest } from "@/core/http/apiClient";
import type { ChapterQuizQuestion } from "@/features/learning/domain/types";

/** Jenis tes: naik tahap (levelId = level sekarang) atau penempatan saat daftar (levelId = level tujuan). */
export type ExamKind = "level-up" | "placement";

export interface ReadinessResponse {
  chaptersCompleted: number;
  chaptersTotal: number;
  avgQuizScore: number;
  weakCards: number;
  ready: "yes" | "almost" | "no";
  suggestion: string;
  canTakeTest: boolean;
}

export interface ExamStatus {
  canTake: boolean;
  cooldownUntil: string | null;
  consecutiveFails: number;
  config: { passScore: number; sectionMinScore: number; timeLimitMin: number; questionCount: number; cooldownHours: number };
}

/** Soal ujian berbentuk sama dengan latihan bab (pilihan ganda, susun, menulis, berbicara, ...). */
export interface ExamQuestion extends ChapterQuizQuestion {
  section: string;
}

export interface ExamQuestionsResponse {
  attemptId: string;
  questions: ExamQuestion[];
  /** Kanji level ini, untuk mengenali tulisan tangan pada soal menulis. */
  kanji: string[];
  timeLimitMin: number;
}

export interface SubmitExamBody {
  attemptId: string;
  answers: { questionId: string; answer: string; section?: string; skipped?: boolean }[];
  levelId: number;
}

export interface SubmitExamResponse {
  passed: boolean;
  totalScore: number;
  sectionScores: Record<string, number>;
  resultLevelId: number;
  nextLevelId?: number | null;
  cooldownUntil: string | null;
}

export const examApi = {
  getReadiness: (levelId: number): Promise<ReadinessResponse> =>
    api.get(`/exam/readiness?levelId=${levelId}`),

  getStatus: (kind: ExamKind, levelId: number): Promise<ExamStatus> =>
    api.get(`/exam/${kind}/status?levelId=${levelId}`),

  getQuestions: (kind: ExamKind, levelId: number): Promise<ExamQuestionsResponse> =>
    api.get(`/exam/${kind}/questions?levelId=${levelId}`),

  submit: (kind: ExamKind, body: SubmitExamBody): Promise<SubmitExamResponse> =>
    apiRequest(`/exam/${kind}/submit`, { method: "POST", body }),
};
