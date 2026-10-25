import type { Db } from "../../../shared/infrastructure/prisma";
import type { CardSchedule } from "../domain/sm2";
import type { DueCard, SrsRepository } from "../domain/ports";

export class PrismaSrsRepository implements SrsRepository {
  constructor(private readonly db: Db) {}

  async listDue(userId: string, today: Date, limit: number): Promise<DueCard[]> {
    const cards = await this.db.srsCard.findMany({
      where: { userId, dueDate: { lte: today } },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
    const vocabIds = cards.filter((c) => c.itemType === "vocab").map((c) => c.itemId);
    const kanjiIds = cards.filter((c) => c.itemType === "kanji").map((c) => c.itemId);
    const [vocab, kanji] = await Promise.all([
      this.db.vocabulary.findMany({ where: { id: { in: vocabIds } } }),
      this.db.kanji.findMany({ where: { id: { in: kanjiIds } } }),
    ]);
    const vocabById = new Map(vocab.map((v) => [v.id, v]));
    const kanjiById = new Map(kanji.map((k) => [k.id, k]));

    return cards.flatMap((c): DueCard[] => {
      const base = { id: c.id, itemType: c.itemType, ...toSchedule(c) };
      if (c.itemType === "vocab") {
        const v = vocabById.get(c.itemId);
        return v ? [{ ...base, front: v.word, reading: v.reading, meaning: v.meaningId }] : [];
      }
      const k = kanjiById.get(c.itemId);
      return k ? [{ ...base, front: k.character, reading: [k.onyomi, k.kunyomi].filter(Boolean).join(" / ") || null, meaning: k.meaningId }] : [];
    });
  }

  countDue(userId: string, today: Date): Promise<number> {
    return this.db.srsCard.count({ where: { userId, dueDate: { lte: today } } });
  }

  async findCard(userId: string, cardId: string) {
    const c = await this.db.srsCard.findFirst({ where: { id: cardId, userId } });
    return c ? { id: c.id, ...toSchedule(c) } : null;
  }

  async saveSchedule(cardId: string, s: CardSchedule & { isWeak: boolean; dueDate: Date }): Promise<void> {
    await this.db.srsCard.update({ where: { id: cardId }, data: { ...s } });
  }
}

function toSchedule(c: { easeFactor: unknown; intervalDays: number; repetitions: number; lapseCount: number }): CardSchedule {
  return { easeFactor: Number(c.easeFactor), intervalDays: c.intervalDays, repetitions: c.repetitions, lapseCount: c.lapseCount };
}
