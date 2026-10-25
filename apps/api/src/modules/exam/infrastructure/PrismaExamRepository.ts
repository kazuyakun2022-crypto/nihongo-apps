import type { Db } from "../../../shared/infrastructure/prisma";
import type { ExamRepository, ExamType, PlacementAnswer, PlacementQuestion } from "../domain/Exam";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class PrismaExamRepository implements ExamRepository {
  constructor(private readonly db: Db) {}

  async getPlacementQuestions(sourceLevelId: number, count: number): Promise<PlacementQuestion[]> {
    const rows = await this.db.quizQuestion.findMany({
      where: { chapter: { levelId: sourceLevelId }, type: "pilihan_ganda" },
      select: { id: true, question: true, options: true },
    });
    return shuffle(rows)
      .slice(0, count)
      .map((r) => ({
        id: r.id,
        question: r.question,
        options: Array.isArray(r.options) ? (r.options as string[]) : [],
      }));
  }

  async gradeAnswers(answers: PlacementAnswer[]): Promise<number> {
    const ids = answers.map((a) => a.questionId);
    const rows = await this.db.quizQuestion.findMany({
      where: { id: { in: ids } },
      select: { id: true, correctAnswer: true },
    });
    const keyMap = new Map(rows.map((r) => [r.id, r.correctAnswer]));
    return answers.filter((a) => keyMap.get(a.questionId) === a.answer).length;
  }

  async saveAttempt(userId: string, levelId: number, type: ExamType, score: number, passed: boolean): Promise<void> {
    await this.db.examAttempt.create({ data: { userId, levelId, type, score, passed } });
  }

  async updateUserLevel(userId: string, levelId: number): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { currentLevelId: levelId } });
  }
}
