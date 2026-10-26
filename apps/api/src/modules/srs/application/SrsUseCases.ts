import { Errors } from "../../../shared/domain/errors";
import type { AuthUser, Clock } from "../../../shared/domain/types";
import { review, type ReviewGrade } from "../domain/sm2";
import type { SrsRepository } from "../domain/ports";

export class GetDueCards {
  constructor(private readonly deps: { repo: SrsRepository; clock: Clock }) {}
  async execute(user: AuthUser, limit = 20) {
    if (user.role === "admin" || user.role === "super_admin") {
      return { total: 0, cards: [] };
    }
    const today = this.deps.clock.now();
    const [cards, total] = await Promise.all([this.deps.repo.listDue(user.id, today, limit), this.deps.repo.countDue(user.id, today)]);
    return { total, cards };
  }
}

export class ReviewCard {
  constructor(private readonly deps: { repo: SrsRepository; clock: Clock }) {}
  async execute(user: AuthUser, cardId: string, grade: ReviewGrade) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak memiliki kartu SRS belajar.");
    }
    const card = await this.deps.repo.findCard(user.id, cardId);
    if (!card) throw Errors.notFound("Kartu");
    const next = review(card, grade);
    const dueDate = new Date(this.deps.clock.now().getTime() + next.intervalDays * 86_400_000);
    await this.deps.repo.saveSchedule(card.id, { ...next, dueDate });
    return { nextReviewInDays: next.intervalDays, isWeak: next.isWeak };
  }
}
