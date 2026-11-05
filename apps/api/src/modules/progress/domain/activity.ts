/** Jenis aktivitas belajar yang menambah streak, XP, dan bisa membuka lencana. */
export type ActivityKind =
  | "chapter_quiz"
  | "srs_review"
  | "conversation"
  | "handwriting"
  | "level_exam"
  | "placement"
  | "jlpt_sim"
  | "mastery_gate"
  | "workbook_gate";

/** Besar XP per aktivitas (PRD 4.9). Ubah angka di sini, bukan di route. */
export const XP_REWARD = {
  chapterQuizPassed: 20,
  chapterQuizTried: 5,
  srsReview: 1,
  conversationPerTurn: 2,
  conversationMax: 20,
  handwritingCheck: 5,
  levelExamPassed: 50,
  levelExamTried: 10,
  placement: 10,
  jlptSimPassed: 40,
  jlptSimTried: 10,
  gatePassed: 30,
  gateTried: 5,
} as const;

export interface EarnedAchievement {
  code: string;
  name: string;
  description: string | null;
}

export interface ActivityResult {
  xpEarned: number;
  xpTotal: number;
  streak: number;
  newAchievements: EarnedAchievement[];
}

/** Port: dipakai use case tanpa tahu cara penyimpanannya. */
export interface ActivityRecorder {
  record(userId: string, kind: ActivityKind, xp: number): Promise<ActivityResult>;
}
