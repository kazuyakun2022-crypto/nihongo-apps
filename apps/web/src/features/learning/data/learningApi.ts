import { api, apiRequest } from "@/core/http/apiClient";
import type { ChapterDetail, ChapterSummary, Level, LearningRepository, LevelProgress, NextChapter, QuizAnswer, QuizResult } from "../domain/types";

export const learningApi: LearningRepository = {
  levels: () => api.get<{ levels: Level[] }>("/learning/levels").then((r) => r.levels),
  chapters: (levelId) => api.get<{ chapters: ChapterSummary[] }>(`/learning/levels/${levelId}/chapters`).then((r) => r.chapters),
  getChapter: (id) => api.get<{ chapter: ChapterDetail }>(`/learning/chapters/${id}`).then((r) => r.chapter),
  submitQuiz: (chapterId, answers: QuizAnswer[]) =>
    apiRequest<QuizResult>(`/learning/chapters/${chapterId}/quiz`, { method: "POST", body: { answers } }),
  completeOnboarding: (input) => apiRequest<void>("/auth/me/onboarding", { method: "PUT", body: input }),
  nextChapter: () =>
    api.get<{ chapter: NextChapter | null }>("/learning/next-chapter").then((r) => r.chapter),
  getProgress: (levelId: number): Promise<LevelProgress> =>
    api.get<{ progress: LevelProgress }>(`/learning/progress?levelId=${levelId}`).then((r) => r.progress),
};
