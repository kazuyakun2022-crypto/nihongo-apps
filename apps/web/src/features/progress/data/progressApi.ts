import { api } from "@/core/http/apiClient";

export interface Achievement {
  code: string;
  name: string;
  description: string;
  /** ISO string bila sudah didapat, null bila belum. */
  earnedAt: string | null;
}

export interface ProgressSummary {
  streak: number;
  xpTotal: number;
  achievements: Achievement[];
}

export const progressApi = {
  summary: () => api.get<ProgressSummary>("/progress"),
};
