import { apiRequest } from "@/core/http/apiClient";

export interface LevelRef {
  id: number;
  code: string;
  name: string;
}

export interface LeaderItem {
  id: string;
  displayName: string;
  levelCode: string | null;
  xpTotal: number;
  streakCount: number;
  lastActiveDate: string | null;
}

export interface MonitorOverview {
  totals: {
    learners: number;
    premium: number;
    activeToday: number;
    active7d: number;
    active30d: number;
    newThisWeek: number;
    withoutLevel: number;
    avgStreak: number;
    maxStreak: number;
    totalXp: number;
    avgXp: number;
    chaptersCompleted: number;
    chaptersCompleted7d: number;
    avgChapterScore: number | null;
    examAttempts: number;
    examPassRate: number | null;
    levelUps30d: number;
    conversations: number;
    conversations7d: number;
    voiceConversations: number;
    avgTurns: number;
    srsCards: number;
    weakCards: number;
    achievementsEarned: number;
  };
  levels: (LevelRef & {
    learners: number;
    pendingExam: number;
    publishedChapters: number;
    avgProgress: number | null;
    levelUpAttempts: number;
    levelUpPassed: number;
    passRate: number | null;
    avgExamScore: number | null;
  })[];
  daily: { date: string; chapters: number; conversations: number; exams: number; signups: number }[];
  topXp: LeaderItem[];
  topStreak: LeaderItem[];
  atRisk: LeaderItem[];
  recentLevelUps: {
    id: string;
    userId: string;
    displayName: string;
    fromLevel: string;
    toLevel: string | null;
    score: number;
    takenAt: string;
  }[];
}

export interface LearnerRow {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  status: "active" | "suspended" | "pending_deletion";
  avatarUrl: string | null;
  level: LevelRef | null;
  pendingLevelCode: string | null;
  xpTotal: number;
  streakCount: number;
  lastActiveDate: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  levelChaptersDone: number;
  levelChaptersTotal: number;
  levelProgress: number;
  chaptersCompleted: number;
  avgScore: number | null;
  examsTaken: number;
  examsPassed: number;
  conversations: number;
  achievements: number;
  isPremium: boolean;
}

export type LearnerSort = "lastActive" | "xp" | "streak" | "progress" | "chapters" | "level" | "newest" | "name" | "score";

export interface LearnerFilter {
  q?: string;
  levelId?: number | "none";
  activity?: "today" | "7d" | "30d" | "inactive7" | "inactive30" | "never";
  plan?: "premium" | "free";
  status?: "active" | "suspended" | "pending_deletion";
  sort?: LearnerSort;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ChapterProgressItem {
  id: string;
  title: string;
  moduleTitle: string | null;
  sortOrder: number;
  passScore: number;
  status: "locked" | "open" | "completed";
  bestScore: number | null;
  completedAt: string | null;
}

export interface LearnerDetail {
  profile: {
    id: string;
    displayName: string;
    email: string | null;
    role: string;
    status: "active" | "suspended" | "pending_deletion";
    gender: string | null;
    learningGoal: string | null;
    dailyTargetMin: number | null;
    avatarUrl: string | null;
    xpTotal: number;
    streakCount: number;
    lastActiveDate: string | null;
    lastLoginAt: string | null;
    emailVerified: boolean;
    createdAt: string;
    currentLevel: LevelRef | null;
    pendingLevel: LevelRef | null;
    premium: { active: boolean; plan: string | null; expiresAt: string | null };
  };
  journey: (LevelRef & {
    state: "passed" | "current" | "locked";
    publishedChapters: number;
    chaptersDone: number;
    progress: number;
    avgScore: number | null;
    lastCompletedAt: string | null;
    levelUpAttempts: number;
    bestExamScore: number | null;
    passedAt: string | null;
  })[];
  currentChapters: ChapterProgressItem[];
  exams: {
    id: string;
    type: "placement" | "level_up" | "jlpt_sim";
    levelCode: string;
    resultLevelCode: string | null;
    score: number;
    passed: boolean;
    sectionScores: Record<string, number> | null;
    durationMin: number | null;
    takenAt: string;
  }[];
  conversations: {
    total: number;
    totalTurns: number;
    avgPronunciation: number | null;
    recent: {
      id: string;
      mode: "scenario" | "free";
      inputMode: "text" | "voice";
      scenarioTitle: string | null;
      levelCode: string;
      turnCount: number;
      pronunciationScore: number | null;
      summary: string | null;
      startedAt: string;
      durationMin: number | null;
    }[];
  };
  achievements: { id: number; code: string; name: string; description: string | null; earnedAt: string | null }[];
  srs: {
    total: number;
    due: number;
    weak: number;
    mastered: number;
    byType: { type: string; total: number; due: number; weak: number; mastered: number }[];
  };
  memories: { interests: string[]; mistakes: { content: string; weight: number }[] };
  activity: { date: string; chapters: number; conversations: number; exams: number }[];
  timeline: { at: string; kind: "exam" | "conversation" | "achievement" | "chapter"; title: string; detail: string }[];
}

function query(filter: LearnerFilter): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  return sp.toString();
}

export const monitorApi = {
  overview: () => apiRequest<MonitorOverview>("/admin/learners/overview"),
  list: (filter: LearnerFilter) => apiRequest<{ items: LearnerRow[]; total: number }>(`/admin/learners?${query(filter)}`),
  exportAll: (filter: LearnerFilter) =>
    apiRequest<{ items: LearnerRow[]; total: number }>(`/admin/learners/export?${query({ ...filter, page: undefined, pageSize: undefined })}`),
  detail: (userId: string) => apiRequest<LearnerDetail>(`/admin/learners/${userId}`),
  chapters: (userId: string, levelId: number) => apiRequest<ChapterProgressItem[]>(`/admin/learners/${userId}/chapters?levelId=${levelId}`),
  setLevel: (userId: string, levelId: number, reason: string) =>
    apiRequest<void>(`/admin/learners/${userId}/level`, { method: "PATCH", body: { levelId, reason } }),
};
