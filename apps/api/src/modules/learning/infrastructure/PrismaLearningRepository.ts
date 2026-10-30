import type { Db } from "../../../shared/infrastructure/prisma";
import { TILE_TYPES, isAnswerCorrect, scriptOf, type ExerciseType } from "../domain/Exercise";
import { type ChapterDetail, type ChapterExercise, type ChapterStatus, type ChapterSummary, type Level, type LearningRepository, type LevelProgress, type NextChapterInfo, type QuizAnswer, type QuizGradeResult } from "../domain/Learning";

export class PrismaLearningRepository implements LearningRepository {
  constructor(private readonly db: Db) {}

  listLevels(): Promise<Level[]> {
    return this.db.level.findMany({ orderBy: { sortOrder: "asc" } });
  }

  findLevel(id: number): Promise<Level | null> {
    return this.db.level.findUnique({ where: { id } });
  }

  async getLevelCeiling(userId: string): Promise<number | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { currentLevel: { select: { sortOrder: true } }, pendingLevel: { select: { sortOrder: true } } },
    });
    const orders = [user?.currentLevel?.sortOrder, user?.pendingLevel?.sortOrder].filter((n): n is number => n != null);
    return orders.length ? Math.max(...orders) : null;
  }

  async listChaptersWithProgress(levelId: number, userId: string): Promise<ChapterSummary[]> {
    const chapters = await this.db.chapter.findMany({
      where: { levelId, status: "published" },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        explanation: true,
        moduleTitle: true,
        _count: { select: { vocabularies: true, kanji: true, grammarPoints: true, quizQuestions: true, lessonBlocks: true } },
        progress: { where: { userId }, select: { status: true, bestScore: true } },
      },
    });
    // Bab pertama selalu terbuka; bab berikutnya terbuka setelah bab sebelumnya selesai.
    let previousCompleted = true;
    return chapters.map((c) => {
      const p = c.progress[0];
      const status: ChapterStatus = p?.status === "completed" ? "completed" : previousCompleted ? "open" : "locked";
      previousCompleted = status === "completed";
      return {
        id: c.id,
        title: c.title,
        sortOrder: c.sortOrder,
        status,
        bestScore: p?.bestScore ?? null,
        explanation: c.explanation,
        moduleTitle: c.moduleTitle,
        counts: { vocab: c._count.vocabularies, kanji: c._count.kanji, grammar: c._count.grammarPoints, quiz: c._count.quizQuestions, blocks: c._count.lessonBlocks },
      };
    });
  }

  async getChapter(id: string): Promise<ChapterDetail | null> {
    const chapter = await this.db.chapter.findFirst({
      where: { id, status: "published" },
      select: {
        id: true,
        levelId: true,
        title: true,
        explanation: true,
        moduleTitle: true,
        passScore: true,
        scenarios: { where: { status: "published" }, orderBy: { sortOrder: "asc" }, take: 1, select: { id: true, title: true } },
        lessonBlocks: { orderBy: { sortOrder: "asc" }, select: { id: true, type: true, title: true, body: true, imageUrl: true, caption: true } },
        vocabularies: { select: { id: true, word: true, reading: true, meaningId: true, exampleSentence: true, exampleTranslation: true, imageUrl: true } },
        kanji: { select: { id: true, character: true, onyomi: true, kunyomi: true, meaningId: true } },
        grammarPoints: { select: { id: true, pattern: true, explanation: true, exampleSentence: true, exampleTranslation: true, imageUrl: true } },
        quizQuestions: { select: { id: true, type: true, question: true, hint: true, options: true, correctAnswer: true, audioUrl: true, imageUrl: true } },
      },
    });
    if (!chapter) return null;
    const { scenarios, ...rest } = chapter;
    return { ...rest, scenario: scenarios[0] ?? null, quizQuestions: chapter.quizQuestions.map(toChapterExercise) };
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
      select: { id: true, type: true, options: true, correctAnswer: true, explanation: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    let correct = 0;
    let graded = 0;
    const results = answers.map((a) => {
      const row = byId.get(a.questionId);
      const ca = row?.correctAnswer ?? "";
      const skipped = !!a.skipped && row?.type === "berbicara";
      const isCorrect = !!row && !skipped && isAnswerCorrect({ type: row.type, correctAnswer: ca, options: stringList(row.options) }, a.answer);
      if (!skipped) graded++;
      if (isCorrect) correct++;
      return { questionId: a.questionId, correct: isCorrect, skipped, correctAnswer: ca, explanation: row?.explanation ?? null };
    });
    const score = graded > 0 ? Math.round((correct / graded) * 100) : 0;
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

    // Target = seluruh materi yang diterbitkan di level ini, jadi ikut berubah saat admin menambah/menghapus konten
    return {
      vocabLearned,
      vocabTarget: vocabIds.length,
      kanjiLearned,
      kanjiTarget: kanjiIds.length,
      chaptersCompleted,
      chaptersTotal: chapterIds.length,
    };
  }
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bentuk soal untuk siswa: kunci jawaban dibuang, kepingan susun diacak (tersimpan dengan urutan benar di depan).
 * Juga dipakai ujian naik level. */
export function toChapterExercise(q: { id: string; type: ExerciseType; question: string; hint: string | null; options: unknown; correctAnswer: string; audioUrl: string | null; imageUrl?: string | null }): ChapterExercise {
  const base = { id: q.id, type: q.type, question: q.question, hint: q.hint, audioUrl: q.audioUrl, imageUrl: q.imageUrl ?? null };
  if (q.type === "menulis") return { ...base, options: [], slots: [...q.correctAnswer].length, script: scriptOf(q.correctAnswer) };
  if (q.type === "berbicara") return { ...base, options: [], speakText: q.correctAnswer };
  const options = stringList(q.options);
  return { ...base, options: TILE_TYPES.includes(q.type) ? shuffled(options) : options };
}
