import type { Role } from "../../../shared/domain/types";

export type ExamType = "placement" | "level_up" | "jlpt_sim";

export const PLACEMENT_PASSING_SCORE = 70;
export const PLACEMENT_QUESTION_COUNT = 20;

export interface PlacementQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface PlacementAnswer {
  questionId: string;
  answer: string;
}

export interface ExamRepository {
  getPlacementQuestions(sourceLevelId: number, count: number): Promise<PlacementQuestion[]>;
  gradeAnswers(answers: PlacementAnswer[]): Promise<number>;
  saveAttempt(userId: string, levelId: number, type: ExamType, score: number, passed: boolean): Promise<void>;
  updateUserLevel(userId: string, levelId: number): Promise<void>;
}

/** Level sumber untuk tes penempatan: satu tingkat di bawah target. */
export function sourceLevelId(targetLevelId: number): number {
  return targetLevelId - 1;
}

/** Tes penempatan hanya untuk level N4 ke atas (targetLevelId ≥ 3). N5 dan Pemula tidak butuh tes. */
export function requiresPlacementTest(targetLevelId: number): boolean {
  return targetLevelId >= 3;
}
