import { api, apiRequest } from "@/core/http/apiClient";

export interface MasteryGateRules {
  minAccuracyPercent: number;
  maxResponseMs: number;
  vocabItems: number;
}

export interface MasteryGateStatus {
  chaptersCompleted: number;
  chaptersTotal: number;
  chapterPct: number;
  minChapterPct: number;
  cooldownUntil: string | null;
  canTake: boolean;
  rules: MasteryGateRules;
  totalItems: number;
  levelCode: string;
  nextLevel: string | null;
  passedBefore: boolean;
}

export interface MasteryGateItem {
  kind: "huruf" | "kata";
  prompt: string;
  options: string[];
}

export interface MasteryGateResult {
  passed: boolean;
  accuracy: number;
  avgMs: number;
  weakMarked: number;
  nextLevel: string | null;
  rules: MasteryGateRules;
  results: { index: number; kind: "huruf" | "kata"; prompt: string; answer: string; given: string | null; ms: number | null; correct: boolean; slow: boolean }[];
}

/** Mastery Gate Pre-N5: uji refleks hiragana & kosakata kana sebelum naik ke N5. */
export const masteryGateApi = {
  status: () => api.get<MasteryGateStatus>("/exam/mastery-gate/status"),
  start: () => api.post<{ attemptId: string; items: MasteryGateItem[]; rules: MasteryGateRules }>("/exam/mastery-gate/start"),
  submit: (attemptId: string, answers: { index: number; answer: string | null; ms: number }[]) =>
    apiRequest<MasteryGateResult>("/exam/mastery-gate/submit", { method: "POST", body: { attemptId, answers } }),
};
