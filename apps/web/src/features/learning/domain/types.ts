import type { ExerciseType } from "@/shared/lib/exercises";

export interface Level {
  id: number;
  code: string;
  name: string;
  isPremium: boolean;
  locked: boolean;
  /** premium = butuh langganan; level = terbuka setelah lulus tes naik tahap. */
  lockReason: "premium" | "level" | null;
}

export interface ChapterSummary {
  id: string;
  title: string;
  status: "locked" | "open" | "completed";
  bestScore: number | null;
  explanation: string | null;
  moduleTitle: string | null;
  counts: { vocab: number; kanji: number; grammar: number; quiz: number; blocks: number };
}

/** Materi bebas susunan admin yang tampil di awal bab. */
export interface LessonBlock {
  id: string;
  type: "teks" | "gambar" | "dialog" | "tips" | "huruf" | string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  caption: string | null;
}

export interface ChapterVocab {
  id: string;
  word: string;
  reading: string;
  meaningId: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  imageUrl: string | null;
}

export interface ChapterKanji {
  id: string;
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  meaningId: string;
}

export interface ChapterGrammar {
  id: string;
  pattern: string;
  explanation: string;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  imageUrl: string | null;
}

export interface ChapterQuizQuestion {
  id: string;
  type: ExerciseType;
  question: string;
  /** Petunjuk saat mengerjakan, mis. arti kata. */
  hint: string | null;
  /** Pilihan jawaban, atau kepingan acak untuk soal susun. */
  options: string[];
  audioUrl: string | null;
  /** Gambar pendukung soal. */
  imageUrl?: string | null;
  /** Soal menulis: jumlah kotak huruf dan aksara yang diminta. */
  slots?: number;
  script?: "hiragana" | "katakana" | "campuran";
  /** Soal berbicara: kalimat yang harus diucapkan. */
  speakText?: string;
}

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  moduleTitle: string | null;
  /** Nilai minimal kuis bab ini; null = 70. */
  passScore: number | null;
  /** Skenario latihan ngobrol yang terkait bab ini. */
  scenario: { id: string; title: string } | null;
  lessonBlocks: LessonBlock[];
  vocabularies: ChapterVocab[];
  kanji: ChapterKanji[];
  grammarPoints: ChapterGrammar[];
  quizQuestions: ChapterQuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
  skipped?: boolean;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  xpEarned: number;
  passingScore: number;
  results: { questionId: string; correct: boolean; skipped: boolean; correctAnswer: string; explanation: string | null }[];
}

/** Titik mulai di layar pendaftaran, diatur admin. */
export interface OnboardingStart {
  levelId: number;
  levelCode: string;
  levelName: string;
  label: string;
  hint: string;
  requiresTest: boolean;
}

/** Isi layar pendaftaran (/mulai) yang diatur admin. */
export interface OnboardingOptions {
  title: string;
  goalQuestion: string;
  goals: { value: string; label: string }[];
  minutesQuestion: string;
  minuteOptions: number[];
  defaultMinutes: number;
  startQuestion: string;
  starts: OnboardingStart[];
}

export interface OnboardingChoice {
  currentLevelId: number;
  learningGoal: string;
  dailyTargetMin: number;
  displayName?: string;
  gender?: "male" | "female" | "other";
}

export interface NextChapter {
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
  levels(): Promise<Level[]>;
  chapters(levelId: number): Promise<ChapterSummary[]>;
  getChapter(id: string): Promise<ChapterDetail>;
  submitQuiz(chapterId: string, answers: QuizAnswer[]): Promise<QuizResult>;
  onboardingOptions(): Promise<OnboardingOptions>;
  completeOnboarding(input: OnboardingChoice): Promise<{ user: any }>;
  nextChapter(): Promise<NextChapter | null>;
  getProgress(levelId: number): Promise<LevelProgress>;
}
