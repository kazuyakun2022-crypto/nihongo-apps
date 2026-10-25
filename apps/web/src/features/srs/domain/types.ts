export type ReviewGrade = "lupa" | "sulit" | "bisa" | "mudah";

export interface DueCard {
  id: string;
  itemType: "vocab" | "kanji";
  front: string;
  reading: string | null;
  meaning: string;
}

export interface SrsRepository {
  due(): Promise<{ total: number; cards: DueCard[] }>;
  review(cardId: string, grade: ReviewGrade): Promise<{ nextReviewInDays: number }>;
}
