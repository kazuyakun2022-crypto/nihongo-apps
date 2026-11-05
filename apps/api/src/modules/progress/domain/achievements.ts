import type { ActivityKind } from "./activity";

/** Angka yang dihitung infrastruktur untuk menilai syarat lencana. */
export type ProgressStat =
  | "streak"
  | "xp"
  | "chaptersCompleted"
  | "conversationsDone"
  | "srsMastered"
  | "handwritingChecks"
  | "masteryGatePassed"
  | "levelUpPassed"
  | "workbookPassed"
  | "jlptSimPassed";

export interface AchievementDef {
  code: string;
  name: string;
  description: string;
  stat: ProgressStat;
  min: number;
  /** Aktivitas yang bisa mengubah angka stat ini. Stat streak dan xp dicek di semua aktivitas. */
  triggers: ActivityKind[] | "any";
}

/**
 * Katalog lencana. Baris di tabel achievements disinkronkan dari daftar ini saat API berjalan,
 * jadi menambah lencana cukup dengan menambah baris di sini. Kode lama jangan diganti karena sudah dimiliki pengguna.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_chapter", name: "Langkah pertama", description: "Lulus kuis bab pertama.", stat: "chaptersCompleted", min: 1, triggers: ["chapter_quiz"] },
  { code: "chapters_10", name: "Rajin belajar", description: "Lulus 10 bab.", stat: "chaptersCompleted", min: 10, triggers: ["chapter_quiz"] },
  { code: "chapters_30", name: "Kutu buku", description: "Lulus 30 bab.", stat: "chaptersCompleted", min: 30, triggers: ["chapter_quiz"] },
  { code: "first_chat", name: "Obrolan pertama", description: "Menyelesaikan sesi ngobrol pertama dengan maskot.", stat: "conversationsDone", min: 1, triggers: ["conversation"] },
  { code: "chat_10", name: "Teman ngobrol", description: "Menyelesaikan 10 sesi ngobrol.", stat: "conversationsDone", min: 10, triggers: ["conversation"] },
  { code: "srs_50", name: "Ingatan kuat", description: "Menguasai 50 kartu flashcard (jeda ulang 3 minggu atau lebih).", stat: "srsMastered", min: 50, triggers: ["srs_review"] },
  { code: "srs_200", name: "Gudang kosakata", description: "Menguasai 200 kartu flashcard.", stat: "srsMastered", min: 200, triggers: ["srs_review"] },
  { code: "first_handwriting", name: "Pena pertama", description: "Memeriksakan tulisan tangan pertama.", stat: "handwritingChecks", min: 1, triggers: ["handwriting"] },
  { code: "hiragana_master", name: "Hafal Hiragana", description: "Lulus tes penguasaan Hiragana.", stat: "masteryGatePassed", min: 1, triggers: ["mastery_gate"] },
  { code: "workbook_pass", name: "Tulisan rapi", description: "Lulus Gerbang Tulis.", stat: "workbookPassed", min: 1, triggers: ["workbook_gate"] },
  { code: "level_up", name: "Naik level", description: "Lulus ujian kenaikan level.", stat: "levelUpPassed", min: 1, triggers: ["level_exam"] },
  { code: "jlpt_sim_pass", name: "Siap JLPT", description: "Lulus simulasi JLPT di level mana pun.", stat: "jlptSimPassed", min: 1, triggers: ["jlpt_sim"] },
  { code: "streak_3", name: "Tiga hari", description: "Belajar 3 hari berturut-turut.", stat: "streak", min: 3, triggers: "any" },
  { code: "streak_7", name: "Seminggu penuh", description: "Belajar 7 hari berturut-turut.", stat: "streak", min: 7, triggers: "any" },
  { code: "streak_30", name: "Sebulan tanpa jeda", description: "Belajar 30 hari berturut-turut.", stat: "streak", min: 30, triggers: "any" },
  { code: "xp_500", name: "500 XP", description: "Mengumpulkan 500 XP.", stat: "xp", min: 500, triggers: "any" },
  { code: "xp_2000", name: "2.000 XP", description: "Mengumpulkan 2.000 XP.", stat: "xp", min: 2000, triggers: "any" },
];

/** Lencana yang perlu dicek setelah aktivitas tertentu dan belum dimiliki pengguna. */
export function candidatesFor(kind: ActivityKind, earnedCodes: ReadonlySet<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !earnedCodes.has(a.code) && (a.triggers === "any" || a.triggers.includes(kind)));
}
