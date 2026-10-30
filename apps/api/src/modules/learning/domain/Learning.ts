import type { Role } from "../../../shared/domain/types";
import type { ExerciseType } from "./Exercise";

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
  explanation: string | null;
  moduleTitle: string | null;
  counts: { vocab: number; kanji: number; grammar: number; quiz: number; blocks: number };
}

export interface LessonBlock {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  caption: string | null;
}

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  moduleTitle: string | null;
  /** Nilai minimal kuis bab ini (null = PASSING_QUIZ_SCORE). */
  passScore: number | null;
  /** Skenario latihan ngobrol yang terkait bab ini. */
  scenario: { id: string; title: string } | null;
  lessonBlocks: LessonBlock[];
  vocabularies: { id: string; word: string; reading: string; meaningId: string; exampleSentence: string | null; exampleTranslation: string | null; imageUrl: string | null }[];
  kanji: { id: string; character: string; onyomi: string | null; kunyomi: string | null; meaningId: string }[];
  grammarPoints: { id: string; pattern: string; explanation: string; exampleSentence: string | null; exampleTranslation: string | null; imageUrl: string | null }[];
  quizQuestions: ChapterExercise[];
}

/** Soal latihan yang dikirim ke siswa — tanpa kunci jawaban, kecuali kalimat yang memang harus diucapkan. */
export interface ChapterExercise {
  id: string;
  type: ExerciseType;
  question: string;
  hint: string | null;
  /** Pilihan jawaban, atau kepingan acak untuk soal susun; kosong untuk menulis/berbicara. */
  options: string[];
  audioUrl: string | null;
  /** Gambar pendukung soal (mis. "tulis nama benda ini"). */
  imageUrl: string | null;
  /** Jumlah kotak huruf pada soal menulis. */
  slots?: number;
  /** Aksara yang diminta pada soal menulis. */
  script?: "hiragana" | "katakana" | "campuran";
  /** Kalimat yang harus diucapkan pada soal berbicara. */
  speakText?: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
  /** Soal berbicara yang dilewati (mikrofon tidak tersedia) tidak ikut dinilai. */
  skipped?: boolean;
}

export interface QuizGradeResult {
  score: number;
  results: { questionId: string; correct: boolean; skipped: boolean; correctAnswer: string; explanation: string | null }[];
}

export type LevelLockReason = "premium" | "level";

/**
 * Alasan level terkunci, atau null jika terbuka.
 * Pelajar hanya membuka level aktifnya dan level di bawahnya (maxSortOrder); level di atas terbuka lewat tes naik tahap.
 * Guru melihat semua level untuk meninjau kurikulum. maxSortOrder tidak diisi = tanpa batas jenjang.
 */
export function levelLockReason(level: Level, role: Role, maxSortOrder?: number | null): LevelLockReason | null {
  if (role !== "teacher" && maxSortOrder !== undefined && level.sortOrder > (maxSortOrder ?? 1)) return "level";
  if (level.isPremium && role !== "premium" && role !== "teacher") return "premium";
  return null;
}

/** Aturan akses level: Belajar hanya untuk pelajar (siswa, premium, guru untuk tinjau kurikulum). Admin dan Super Admin bukan akun pelajar. */
export function canAccessLevel(level: Level, role: Role, maxSortOrder?: number | null): boolean {
  if (role === "admin" || role === "super_admin") return false;
  return levelLockReason(level, role, maxSortOrder) === null;
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

export interface LearningRepository {
  listLevels(): Promise<Level[]>;
  findLevel(id: number): Promise<Level | null>;
  /** Urutan level tertinggi yang sudah diraih pelajar (level aktif atau level yang menunggu Premium); null jika belum memilih. */
  getLevelCeiling(userId: string): Promise<number | null>;
  listChaptersWithProgress(levelId: number, userId: string): Promise<ChapterSummary[]>;
  getChapter(id: string): Promise<ChapterDetail | null>;
  getNextChapter(userId: string, levelId: number): Promise<NextChapterInfo | null>;
  gradeQuizAnswers(chapterId: string, answers: QuizAnswer[]): Promise<QuizGradeResult>;
  saveQuizResult(userId: string, chapterId: string, score: number, passed: boolean, now: Date): Promise<void>;
  enqueueChapterItemsToSrs(userId: string, chapterId: string, dueDate: Date): Promise<void>;
  addXp(userId: string, xp: number): Promise<void>;
  getLevelProgress(userId: string, levelId: number): Promise<LevelProgress>;
}
