export interface Level {
  id: number;
  code: string;
  name: string;
  isPremium: boolean;
  locked: boolean;
}

export interface ChapterSummary {
  id: string;
  title: string;
  status: "locked" | "open" | "completed";
  bestScore: number | null;
}

export interface ChapterVocab {
  id: string;
  word: string;
  reading: string;
  meaningId: string;
  exampleSentence: string | null;
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
}

export interface ChapterQuizQuestion {
  id: string;
  type: "pilihan_ganda" | "susun_kalimat" | "mendengar";
  question: string;
  options: string[];
}

export interface ChapterDetail {
  id: string;
  levelId: number;
  title: string;
  explanation: string | null;
  vocabularies: ChapterVocab[];
  kanji: ChapterKanji[];
  grammarPoints: ChapterGrammar[];
  quizQuestions: ChapterQuizQuestion[];
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
}

export interface QuizResult {
  score: number;
  passed: boolean;
  xpEarned: number;
  passingScore: number;
  results: { questionId: string; correct: boolean; correctAnswer: string }[];
}

export type LearningGoal = "jlpt" | "kerja" | "hobi" | "wisata";

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
  completeOnboarding(input: { currentLevelId: number; learningGoal: LearningGoal; dailyTargetMin: 5 | 10 | 20 }): Promise<void>;
  nextChapter(): Promise<NextChapter | null>;
  getProgress(levelId: number): Promise<LevelProgress>;
}
