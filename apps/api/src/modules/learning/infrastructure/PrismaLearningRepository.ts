import type { Db } from "../../../shared/infrastructure/prisma";
import { LEVEL_TARGETS, type ChapterDetail, type ChapterStatus, type ChapterSummary, type Level, type LearningRepository, type LevelProgress, type NextChapterInfo, type QuizAnswer, type QuizGradeResult } from "../domain/Learning";

export class PrismaLearningRepository implements LearningRepository {
  constructor(private readonly db: Db) {}

  listLevels(): Promise<Level[]> {
    return this.db.level.findMany({ orderBy: { sortOrder: "asc" } });
  }

  findLevel(id: number): Promise<Level | null> {
    return this.db.level.findUnique({ where: { id } });
  }

  async listChaptersWithProgress(levelId: number, userId: string): Promise<ChapterSummary[]> {
    const chapters = await this.db.chapter.findMany({
      where: { levelId, status: "published" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, sortOrder: true, progress: { where: { userId }, select: { status: true, bestScore: true } } },
    });
    // Bab pertama selalu terbuka; bab berikutnya terbuka setelah bab sebelumnya selesai.
    let previousCompleted = true;
    return chapters.map((c) => {
      const p = c.progress[0];
      const status: ChapterStatus = p?.status === "completed" ? "completed" : previousCompleted ? "open" : "locked";
      previousCompleted = status === "completed";
      return { id: c.id, title: c.title, sortOrder: c.sortOrder, status, bestScore: p?.bestScore ?? null };
    });
  }

  getChapter(id: string): Promise<ChapterDetail | null> {
    return this.db.chapter.findFirst({
      where: { id, status: "published" },
      select: {
        id: true,
        levelId: true,
        title: true,
        explanation: true,
        vocabularies: { select: { id: true, word: true, reading: true, meaningId: true, exampleSentence: true } },
        kanji: { select: { id: true, character: true, onyomi: true, kunyomi: true, meaningId: true } },
        grammarPoints: { select: { id: true, pattern: true, explanation: true, exampleSentence: true } },
        // correctAnswer sengaja tidak dikirim ke klien — dinilai server-side.
        quizQuestions: { select: { id: true, type: true, question: true, options: true } },
      },
    }) as Promise<ChapterDetail | null>;
  }

  async getNextChapter(userId: string, levelId: number): Promise<NextChapterInfo | null> {
    const completed = await this.db.userChapterProgress.findMany({
      where: { userId, status: "completed" },
      select: { chapterId: true },
    });
    const completedIds = new Set(completed.map((c) => c.chapterId));
    const chapters = await this.db.chapter.findMany({
      where: { levelId, status: "published" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, level: { select: { code: true } } },
    });
    // Bab membuka secara berurutan; kembalikan bab pertama yang belum selesai dan bisa dibuka.
    let prevDone = true;
    for (const c of chapters) {
      const done = completedIds.has(c.id);
      if (!done && prevDone) return { id: c.id, title: c.title, levelCode: c.level.code };
      prevDone = done;
    }
    return null;
  }

  async gradeQuizAnswers(chapterId: string, answers: QuizAnswer[]): Promise<QuizGradeResult> {
    const ids = answers.map((a) => a.questionId);
    const rows = await this.db.quizQuestion.findMany({
      where: { id: { in: ids }, chapterId },
      select: { id: true, correctAnswer: true },
    });
    const correctMap = new Map(rows.map((r) => [r.id, r.correctAnswer]));
    let correct = 0;
    const results = answers.map((a) => {
      const ca = correctMap.get(a.questionId) ?? "";
      const isCorrect = a.answer === ca;
      if (isCorrect) correct++;
      return { questionId: a.questionId, correct: isCorrect, correctAnswer: ca };
    });
    const score = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
    return { score, results };
  }

  async saveQuizResult(userId: string, chapterId: string, score: number, passed: boolean, now: Date): Promise<void> {
    const key = { userId_chapterId: { userId, chapterId } };
    const existing = await this.db.userChapterProgress.findUnique({ where: key });
    const bestScore = Math.max(score, existing?.bestScore ?? 0);
    const completeNow = passed && existing?.status !== "completed";
    await this.db.userChapterProgress.upsert({
      where: key,
      create: { userId, chapterId, bestScore, status: passed ? "completed" : "open", completedAt: passed ? now : null },
      update: completeNow ? { bestScore, status: "completed", completedAt: now } : { bestScore },
    });
  }

  async enqueueChapterItemsToSrs(userId: string, chapterId: string, dueDate: Date): Promise<void> {
    const [vocab, kanji] = await Promise.all([
      this.db.vocabulary.findMany({ where: { chapterId }, select: { id: true } }),
      this.db.kanji.findMany({ where: { chapterId }, select: { id: true } }),
    ]);
    await this.db.srsCard.createMany({
      data: [
        ...vocab.map((v) => ({ userId, itemType: "vocab" as const, itemId: v.id, dueDate })),
        ...kanji.map((k) => ({ userId, itemType: "kanji" as const, itemId: k.id, dueDate })),
      ],
      skipDuplicates: true,
    });
  }

  async addXp(userId: string, xp: number): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { xpTotal: { increment: xp } } });
  }

  async getLevelProgress(userId: string, levelId: number): Promise<LevelProgress> {
    const chaptersInLevel = await this.db.chapter.findMany({
      where: { levelId, status: "published" },
      select: { id: true },
    });
    const chapterIds = chaptersInLevel.map((c) => c.id);

    const [vocabIds, kanjiIds] = await Promise.all([
      this.db.vocabulary.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true } }),
      this.db.kanji.findMany({ where: { chapterId: { in: chapterIds } }, select: { id: true } }),
    ]);

    const [vocabLearned, kanjiLearned, chaptersCompleted] = await Promise.all([
      this.db.srsCard.count({ where: { userId, itemType: "vocab", itemId: { in: vocabIds.map((v) => v.id) } } }),
      this.db.srsCard.count({ where: { userId, itemType: "kanji", itemId: { in: kanjiIds.map((k) => k.id) } } }),
      this.db.userChapterProgress.count({ where: { userId, status: "completed", chapterId: { in: chapterIds } } }),
    ]);

    const targets = LEVEL_TARGETS[levelId] ?? { vocab: 0, kanji: 0 };
    return {
      vocabLearned,
      vocabTarget: targets.vocab,
      kanjiLearned,
      kanjiTarget: targets.kanji,
      chaptersCompleted,
      chaptersTotal: chapterIds.length,
    };
  }
}
