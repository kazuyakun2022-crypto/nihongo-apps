import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { EXERCISE_TYPES, isAnswerCorrect, type ExerciseType } from "../../learning/domain/Exercise";
import { stringList, toChapterExercise } from "../../learning/infrastructure/PrismaLearningRepository";

const asExerciseType = (type: string): ExerciseType =>
  (EXERCISE_TYPES as readonly string[]).includes(type) ? (type as ExerciseType) : "pilihan_ganda";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function examLevelUpRoutes() {
  const r = Router();

  // GET /exam/readiness?levelId=N
  r.get("/readiness", asyncHandler(async (req, res) => {
    const levelId = Number(req.query.levelId);
    if (!Number.isInteger(levelId) || levelId < 1) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "levelId tidak valid." } });
    }
    const user = currentUser(req);

    const chapters = await prisma.chapter.findMany({
      where: { levelId, status: "published" },
      include: {
        progress: { where: { userId: user.id }, take: 1 },
      },
    });

    const chaptersTotal = chapters.length;
    const chaptersCompleted = chapters.filter(ch => ch.progress[0]?.status === "completed").length;
    const pct = chaptersTotal > 0 ? (chaptersCompleted / chaptersTotal) * 100 : 0;

    const progresses = await prisma.userChapterProgress.findMany({
      where: { userId: user.id, chapter: { levelId }, status: "completed" },
      select: { bestScore: true },
    });
    const avgQuizScore = progresses.length
      ? Math.round(progresses.reduce((s, p) => s + (p.bestScore ?? 0), 0) / progresses.length)
      : 0;

    // Weak SRS cards: isWeak flag
    const weakCards = await prisma.srsCard.count({
      where: { userId: user.id, isWeak: true },
    });

    let ready: "yes" | "almost" | "no";
    let suggestion: string;

    if (pct < 80) {
      const need = Math.ceil(chaptersTotal * 0.8) - chaptersCompleted;
      ready = "no";
      suggestion = `Selesaikan dulu minimal 80% bab (${need} bab lagi).`;
    } else if (avgQuizScore < 80 || weakCards >= 10) {
      ready = "almost";
      suggestion = avgQuizScore < 80
        ? `Rata-rata kuis ${avgQuizScore}% — latih lagi bab dengan nilai rendah.`
        : `Masih ada ${weakCards} kata yang sering terlupa — ulang flashcard dulu.`;
    } else {
      ready = "yes";
      suggestion = "Kamu sudah siap! Selamat ikut tes naik tahap.";
    }

    res.json({
      chaptersCompleted,
      chaptersTotal,
      avgQuizScore,
      weakCards,
      ready,
      suggestion,
      canTakeTest: pct >= 80,
    });
  }));

  // GET /exam/level-up/status?levelId=N
  r.get("/level-up/status", asyncHandler(async (req, res) => {
    const levelId = Number(req.query.levelId);
    if (!Number.isInteger(levelId) || levelId < 1) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "levelId tidak valid." } });
    }
    const user = currentUser(req);

    const config = await prisma.levelExam.findUnique({
      where: { levelId_type: { levelId, type: "level_up" } },
    });
    if (!config) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Konfigurasi tes tidak ditemukan." } });
    }

    const lastFailed = await prisma.examAttempt.findFirst({
      where: { userId: user.id, levelId, type: "level_up", passed: false },
      orderBy: { takenAt: "desc" },
    });

    let canTake = true;
    let cooldownUntil: string | null = null;

    if (lastFailed && config.cooldownHours > 0) {
      const until = new Date(lastFailed.takenAt.getTime() + config.cooldownHours * 3_600_000);
      if (until > new Date()) {
        canTake = false;
        cooldownUntil = until.toISOString();
      }
    }

    const recentAttempts = await prisma.examAttempt.findMany({
      where: { userId: user.id, levelId, type: "level_up" },
      orderBy: { takenAt: "desc" },
      take: 5,
    });
    let consecutiveFails = 0;
    for (const a of recentAttempts) {
      if (!a.passed) consecutiveFails++;
      else break;
    }

    res.json({
      canTake,
      cooldownUntil,
      consecutiveFails,
      config: {
        passScore: config.passScore,
        sectionMinScore: config.sectionMinScore,
        timeLimitMin: config.timeLimitMin,
        questionCount: config.questionCount,
      },
    });
  }));

  // GET /exam/level-up/questions?levelId=N
  r.get("/level-up/questions", asyncHandler(async (req, res) => {
    const levelId = Number(req.query.levelId);
    if (!Number.isInteger(levelId) || levelId < 1) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "levelId tidak valid." } });
    }
    const user = currentUser(req);

    const config = await prisma.levelExam.findUnique({
      where: { levelId_type: { levelId, type: "level_up" } },
    });
    if (!config) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Konfigurasi tes tidak ditemukan." } });
    }

    // Try exam_questions bank first
    const examQs = await prisma.examQuestion.findMany({
      where: { levelId, status: "published" },
      select: { id: true, section: true, type: true, question: true, hint: true, options: true, correctAnswer: true, difficulty: true, audioUrl: true },
    });

    type QuestionItem = (typeof examQs)[number];
    let questions: QuestionItem[] = [];

    if (examQs.length >= config.questionCount) {
      const sections = ["kosakata", "tata_bahasa", "membaca", "mendengar"] as const;
      const perSection = Math.floor(config.questionCount / sections.length);
      for (const sec of sections) {
        const pool = examQs.filter(q => q.section === sec);
        questions.push(...shuffle(pool).slice(0, perSection));
      }
    } else {
      // Fallback: quiz_questions from chapters of this level
      const quizQs = await prisma.quizQuestion.findMany({
        where: { chapter: { levelId }, type: "pilihan_ganda" },
        select: { id: true, type: true, question: true, hint: true, options: true, correctAnswer: true, audioUrl: true },
        take: config.questionCount * 3,
      });
      questions = shuffle(quizQs)
        .slice(0, config.questionCount)
        .map(q => ({ ...q, section: "kosakata" as const, difficulty: 1 }));
    }

    // Kanji level ini, untuk mengenali tulisan tangan pada soal menulis
    const kanji = questions.some(q => q.type === "menulis")
      ? (await prisma.kanji.findMany({ where: { chapter: { levelId } }, select: { character: true } })).map(k => k.character)
      : [];

    // Record attempt start
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        levelId,
        type: "level_up",
        score: 0,
        passed: false,
        startedAt: new Date(),
      },
    });

    res.json({
      attemptId: attempt.id,
      questions: shuffle(questions).map(q => ({
        ...toChapterExercise({ ...q, type: asExerciseType(q.type) }),
        section: q.section,
        difficulty: q.difficulty,
      })),
      kanji,
      timeLimitMin: config.timeLimitMin,
    });
  }));

  // POST /exam/level-up/submit
  r.post("/level-up/submit", asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        attemptId: z.string().uuid(),
        levelId: z.number().int().min(1).max(6),
        answers: z.array(z.object({
          questionId: z.string(),
          answer: z.string().max(500),
          section: z.string().optional(),
          /** Soal berbicara yang dilewati (tanpa mikrofon) tidak ikut dinilai. */
          skipped: z.boolean().optional(),
        })).min(1).max(40),
      }),
      req.body,
    );
    const user = currentUser(req);
    const { attemptId, levelId, answers } = body;

    const config = await prisma.levelExam.findUnique({
      where: { levelId_type: { levelId, type: "level_up" } },
    });
    if (!config) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Konfigurasi tes tidak ditemukan." } });
    }

    // Build correct-answer map from exam_questions
    const qIds = answers.map(a => a.questionId);
    const examQs = await prisma.examQuestion.findMany({
      where: { id: { in: qIds } },
      select: { id: true, type: true, options: true, correctAnswer: true, section: true },
    });
    const correctMap = new Map<string, { type: ExerciseType; options: unknown; correct: string; section: string }>();
    for (const q of examQs) correctMap.set(q.id, { type: asExerciseType(q.type), options: q.options, correct: q.correctAnswer, section: q.section });

    // Fallback: quiz_questions for IDs not found above
    const missing = qIds.filter(id => !correctMap.has(id));
    if (missing.length) {
      const quizQs = await prisma.quizQuestion.findMany({
        where: { id: { in: missing } },
        select: { id: true, type: true, options: true, correctAnswer: true },
      });
      for (const q of quizQs) correctMap.set(q.id, { type: q.type, options: q.options, correct: q.correctAnswer, section: "kosakata" });
    }

    // Grade
    const sectionCounts: Record<string, { correct: number; total: number }> = {
      kosakata: { correct: 0, total: 0 },
      tata_bahasa: { correct: 0, total: 0 },
      membaca: { correct: 0, total: 0 },
      mendengar: { correct: 0, total: 0 },
    };
    let totalCorrect = 0;
    let graded = 0;

    const answerRecords = answers.map(a => {
      const info = correctMap.get(a.questionId);
      const skipped = !!a.skipped && info?.type === "berbicara";
      const isCorrect = !!info && !skipped && isAnswerCorrect({ type: info.type, correctAnswer: info.correct, options: stringList(info.options) }, a.answer);
      const section = a.section ?? info?.section ?? "kosakata";
      if (skipped) return { attemptId, questionId: a.questionId, answer: a.answer, isCorrect };
      graded++;
      if (sectionCounts[section]) {
        sectionCounts[section].total++;
        if (isCorrect) sectionCounts[section].correct++;
      }
      if (isCorrect) totalCorrect++;
      return { attemptId, questionId: a.questionId, answer: a.answer, isCorrect };
    });

    const totalScore = Math.round((totalCorrect / Math.max(graded, 1)) * 100);
    const sectionScores = Object.fromEntries(
      Object.entries(sectionCounts).map(([s, { correct, total }]) => [
        s,
        total > 0 ? Math.round((correct / total) * 100) : 100,
      ]),
    );
    const sectionsPassed = Object.values(sectionScores).every(v => v >= config.sectionMinScore);
    const passed = totalScore >= config.passScore && sectionsPassed;

    // Find next level
    const currentLevel = await prisma.level.findUnique({ where: { id: levelId } });
    const nextLevel = currentLevel
      ? await prisma.level.findFirst({
          where: { sortOrder: { gt: currentLevel.sortOrder } },
          orderBy: { sortOrder: "asc" },
        })
      : null;

    const resultLevelId = passed ? (nextLevel?.id ?? levelId) : levelId;

    // Update attempt
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: { score: totalScore, passed, finishedAt: new Date(), sectionScores, resultLevelId },
    });

    // Save per-answer records (only for exam_questions, skip quiz_questions fallback)
    const examOnlyAnswers = answerRecords.filter(a => examQs.some(q => q.id === a.questionId));
    if (examOnlyAnswers.length) {
      await prisma.examAttemptAnswer.createMany({ data: examOnlyAnswers });
    }

    // Promote user level if passed
    if (passed && nextLevel) {
      if (!nextLevel.isPremium) {
        await prisma.user.update({ where: { id: user.id }, data: { currentLevelId: nextLevel.id } });
      } else {
        await prisma.user.update({ where: { id: user.id }, data: { pendingLevelId: nextLevel.id } });
      }
    }

    const cooldownUntil = !passed && config.cooldownHours > 0
      ? new Date(Date.now() + config.cooldownHours * 3_600_000).toISOString()
      : null;

    res.json({ passed, totalScore, sectionScores, resultLevelId, nextLevelId: nextLevel?.id ?? null, cooldownUntil });
  }));

  return r;
}
