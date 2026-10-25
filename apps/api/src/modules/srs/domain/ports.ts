import type { CardSchedule } from "./sm2";

export interface DueCard extends CardSchedule {
  id: string;
  itemType: "vocab" | "kanji";
  front: string;
  reading: string | null;
  meaning: string;
}

export interface SrsRepository {
  listDue(userId: string, today: Date, limit: number): Promise<DueCard[]>;
  countDue(userId: string, today: Date): Promise<number>;
  findCard(userId: string, cardId: string): Promise<(CardSchedule & { id: string }) | null>;
  saveSchedule(cardId: string, schedule: CardSchedule & { isWeak: boolean; dueDate: Date }): Promise<void>;
}
