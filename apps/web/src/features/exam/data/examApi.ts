import { api, apiRequest } from "@/core/http/apiClient";
import type { ChapterQuizQuestion } from "@/features/learning/domain/types";

/** Jenis tes: naik tahap (levelId = level sekarang), penempatan saat daftar (levelId = level tujuan), atau simulasi JLPT. */
export type ExamKind = "level-up" | "placement" | "jlpt-sim";

export interface ReadinessResponse {
  chaptersCompleted: number;
  chaptersTotal: number;
  avgQuizScore: number;
  weakCards: number;
  ready: "yes" | "almost" | "no";
  suggestion: string;
  /** Gerbang Tulis (menulis tangan) sudah lulus: syarat sebelum tes naik tahap / Mastery Gate. */
  workbookPassed: boolean;
  canTakeTest: boolean;
}

export interface ExamStatus {
  canTake: boolean;
  cooldownUntil: string | null;
  consecutiveFails: number;
  config: {
    /** Persen untuk tes biasa; skala 0-180 untuk Simulasi JLPT. */
    passScore: number;
    sectionMinScore: number;
    timeLimitMin: number;
    questionCount: number;
    cooldownHours: number;
    /** Jumlah soal & nilai minimal per bagian; null = dibagi rata dengan sectionMinScore. */
    sectionRules?: Partial<Record<string, { count: number; minScore: number }>> | null;
  };
  /** Hanya Simulasi JLPT: sesi berwaktu dan kelompok skor resmi. */
  jlpt?: JlptStructure;
  /** Hanya Simulasi JLPT: paket tetap yang dipilih (null = acak) dan level ujian. */
  paket?: number | null;
  level?: { code: string; name: string };
}

export interface JlptStructure {
  /** Batas lulus total (0-180). */
  pass: number;
  maxScore: number;
  /** Istirahat di antara sesi (menit). */
  breakMinutes: number;
  sessions: { key: string; title: string; minutes: number; questionCount: number }[];
  /** Kelompok skor resmi beserta ambang minimalnya, mis. 38/120 atau 19/60. */
  groups: { key: string; label: string; max: number; min: number }[];
}

/** Soal ujian berbentuk sama dengan latihan bab (pilihan ganda, susun, menulis, berbicara, ...). */
export interface ExamQuestion extends ChapterQuizQuestion {
  section: string;
  /** Simulasi JLPT: tipe soal resmi (Daimon), sesi, dan teks bacaan Dokkai. */
  category?: string | null;
  session?: string | null;
  passage?: string | null;
}

export interface ExamQuestionsResponse {
  attemptId: string;
  questions: ExamQuestion[];
  /** Kanji level ini, untuk mengenali tulisan tangan pada soal menulis. */
  kanji: string[];
  timeLimitMin: number;
  /** Hanya Simulasi JLPT: soal sudah berurutan per sesi. */
  jlpt?: JlptStructure;
}

export interface SubmitExamBody {
  attemptId: string;
  answers: { questionId: string; answer: string; section?: string; skipped?: boolean }[];
  levelId: number;
}

export interface SubmitExamResponse {
  passed: boolean;
  /** Persen untuk tes biasa; skala 0-180 untuk Simulasi JLPT. */
  totalScore: number;
  sectionScores: Record<string, number>;
  /** Nilai minimal tiap bagian yang dipakai saat menilai. */
  sectionMinScores?: Record<string, number>;
  /** Jawaban dikirim melewati batas waktu. */
  late?: boolean;
  resultLevelId: number;
  nextLevelId?: number | null;
  cooldownUntil: string | null;
  /** Streak dan XP terbaru setelah tes ini dicatat. */
  progress?: { xpTotal: number; streak: number; xpEarned: number };
  /** Hanya untuk simulasi JLPT: skor per kelompok dan pembahasan tiap soal. */
  simulation?: JlptSimResult | null;
}

export interface JlptSimReviewItem {
  questionId: string;
  section: string;
  category: string | null;
  question: string;
  /** Teks bacaan Dokkai atau skrip Choukai. */
  passage: string | null;
  given: string;
  correctAnswer: string;
  correct: boolean;
  skipped: boolean;
  explanation: string | null;
}

export interface JlptGroupScore {
  key: string;
  label: string;
  max: number;
  min: number;
  scaled: number;
  correct: number;
  total: number;
  passed: boolean;
  /** Bank belum punya soal untuk kelompok ini; tidak ikut syarat minimal. */
  empty: boolean;
}

export interface JlptSimResult {
  scaledScore: number;
  pass: number;
  maxScore: number;
  /** Ada kelompok tanpa soal, sehingga total dihitung ulang dari kelompok yang ada. */
  partial: boolean;
  groups: JlptGroupScore[];
  review: JlptSimReviewItem[];
}

export interface JlptSimLevel {
  levelId: number;
  code: string;
  name: string;
  /** Bank soal level ini sudah terisi. */
  available: boolean;
  questionCount: number;
  timeLimitMin: number;
  /** Batas lulus total (0-180). */
  passScore: number;
  sessions: { key: string; title: string; minutes: number; questionCount: number }[];
  /** Paket tetap yang sudah terbit, beserta skor terbaik siswa per paket. */
  packages: { no: number; questionCount: number; attempts: number; bestScore: number | null; passed: boolean }[];
  attempts: number;
  passedCount: number;
  /** Skor terbaik (0-180). */
  bestScore: number | null;
  recent: { score: number; passed: boolean; takenAt: string; paket: number | null }[];
}

export const examApi = {
  jlptSimLevels: (): Promise<JlptSimLevel[]> =>
    api.get<{ levels: JlptSimLevel[] }>("/exam/jlpt-sim/levels").then((r) => r.levels),

  getReadiness: (levelId: number): Promise<ReadinessResponse> =>
    api.get(`/exam/readiness?levelId=${levelId}`),

  getStatus: (kind: ExamKind, levelId: number, paket?: number | null): Promise<ExamStatus> =>
    api.get(`/exam/${kind}/status?levelId=${levelId}${paket ? `&paket=${paket}` : ""}`),

  getQuestions: (kind: ExamKind, levelId: number, paket?: number | null): Promise<ExamQuestionsResponse> =>
    api.get(`/exam/${kind}/questions?levelId=${levelId}${paket ? `&paket=${paket}` : ""}`),

  submit: (kind: ExamKind, body: SubmitExamBody): Promise<SubmitExamResponse> =>
    apiRequest(`/exam/${kind}/submit`, { method: "POST", body }),
};
