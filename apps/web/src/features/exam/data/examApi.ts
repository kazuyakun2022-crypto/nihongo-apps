import { api, apiRequest } from "@/core/http/apiClient";
import type { PlacementAnswer, PlacementQuestionsResponse, PlacementResult } from "../domain/types";

export interface ReadinessResponse {
  chaptersCompleted: number;
  chaptersTotal: number;
  avgQuizScore: number;
  weakCards: number;
  ready: "yes" | "almost" | "no";
  suggestion: string;
  canTakeTest: boolean;
}

export interface LevelUpStatus {
  canTake: boolean;
  cooldownUntil: string | null;
  consecutiveFails: number;
  config: { passScore: number; sectionMinScore: number; timeLimitMin: number; questionCount: number };
}

export interface LevelUpQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
}

export interface LevelUpQuestionsResponse {
  attemptId: string;
  questions: LevelUpQuestion[];
  timeLimitMin: number;
}

export interface SubmitLevelUpBody {
  attemptId: string;
  answers: { questionId: string; answer: string; section?: string }[];
  levelId: number;
}

export interface SubmitLevelUpResponse {
  passed: boolean;
  totalScore: number;
  sectionScores: Record<string, number>;
  resultLevelId: number;
  nextLevelId?: number;
  cooldownUntil: string | null;
}

export const examApi = {
  getPlacementQuestions: (targetLevelId: number): Promise<PlacementQuestionsResponse> =>
    api.get(`/exam/placement?targetLevelId=${targetLevelId}`),

  submitPlacement: (targetLevelId: number, answers: PlacementAnswer[]): Promise<PlacementResult> =>
    apiRequest("/exam/placement", { method: "POST", body: { targetLevelId, answers } }),

  getReadiness: (levelId: number): Promise<ReadinessResponse> =>
    api.get(`/exam/readiness?levelId=${levelId}`),

  getLevelUpStatus: (levelId: number): Promise<LevelUpStatus> =>
    api.get(`/exam/level-up/status?levelId=${levelId}`),

  getLevelUpQuestions: (levelId: number): Promise<LevelUpQuestionsResponse> =>
    api.get(`/exam/level-up/questions?levelId=${levelId}`),

  submitLevelUp: (body: SubmitLevelUpBody): Promise<SubmitLevelUpResponse> =>
    apiRequest("/exam/level-up/submit", { method: "POST", body }),
};
