import { Router, type Request } from "express";
import { z } from "zod";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { XP_REWARD, type ActivityRecorder } from "../../progress/domain/activity";
import { toChapterExercise } from "../../learning/infrastructure/PrismaLearningRepository";
import { workbookPassed } from "./workbookGateRoutes";
import { LATE_GRACE_MS, examTotal, parseSectionRules, pickQuestions, sectionMin, withUnanswered } from "../domain/SectionRules";
import { asExerciseType, gradeAnswers, saveAnswerRecords } from "./examGrading";

/**
 * Tes naik tahap (/exam/level-up/*) dan tes penempatan saat daftar (/exam/placement/*).
 * Keduanya memakai aturan LevelExam dan bank ExamQuestion per level, dibedakan oleh jenis tesnya.
 * - Naik tahap: levelId = level siswa sekarang; lulus = naik ke level berikutnya.
 * - Penempatan: levelId = level tujuan; lulus = boleh memilih level itu sebagai titik mulai (lihat CompleteOnboarding).
 * Simulasi JLPT punya alur sendiri (sesi berwaktu, skor 0-180): lihat jlptSimRoutes.ts.
 */
type ExamKind = "level_up" | "placement";
const KINDS: { path: string; type: ExamKind }[] = [
  { path: "level-up", type: "level_up" },
  { path: "placement", type: "placement" },
];

/** Aturan tes penempatan sebelum admin menyimpan aturan sendiri. */
const DEFAULT_PLACEMENT = { id: undefined, questionCount: 20, timeLimitMin: 20, passScore: 70, sectionMinScore: 0, cooldownHours: 0, sectionRules: null };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function learner(req: Request) {
  const user = currentUser(req);
  if (user.role === "admin" || user.role === "super_admin") {
    throw Errors.forbidden("Akun Administrator tidak mengikuti tes siswa.");
  }
  return user;
}

function levelIdQuery(raw: unknown): number {
  const levelId = Number(raw);
  if (!Number.isInteger(levelId) || levelId < 1) throw Errors.validation("levelId tidak valid.");
  return levelId;
}

async function examConfig(levelId: number, type: ExamKind) {
  const config = await prisma.levelExam.findUnique({ where: { levelId_type: { levelId, type } } });
  if (config) return config;
  if (type === "placement") return DEFAULT_PLACEMENT;
  throw Errors.notFound("Konfigurasi tes");
}

export const submitBody = z.object({
  attemptId: z.string().uuid(),
  levelId: z.number().int().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().max(500),
    section: z.string().optional(),
    /** Soal berbicara yang dilewati (tanpa mikrofon) tidak ikut dinilai. */
    skipped: z.boolean().optional(),
  })).max(200),
});

export function levelExamRoutes(activity: ActivityRecorder) {
  const r = Router();

  // GET /exam/readiness?levelId=N
  r.get("/readiness", asyncHandler(async (req, res) => {
    const levelId = levelIdQuery(req.query.levelId);
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

    // Gerbang Tulis: syarat menulis tangan sebelum ujian naik level
    const workbookOk = await workbookPassed(user.id, levelId);

    let ready: "yes" | "almost" | "no";
    let suggestion: string;

    if (pct < 80) {
      const need = Math.ceil(chaptersTotal * 0.8) - chaptersCompleted;
      ready = "no";
      suggestion = `Selesaikan dulu minimal 80% bab (${need} bab lagi).`;
    } else if (!workbookOk) {
      ready = "no";
      suggestion = "Lulus Gerbang Tulis dulu: tulis huruf-huruf level ini dengan tangan.";
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
      workbookPassed: workbookOk,
      canTakeTest: pct >= 80 && workbookOk,
    });
  }));

  for (const { path, type } of KINDS) {
    // GET /exam/{jenis}/status?levelId=N
    r.get(`/${path}/status`, asyncHandler(async (req, res) => {
      const levelId = levelIdQuery(req.query.levelId);
      const user = learner(req);
      const config = await examConfig(levelId, type);

      const lastFailed = await prisma.examAttempt.findFirst({
        where: { userId: user.id, levelId, type, passed: false, finishedAt: { not: null } },
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
        where: { userId: user.id, levelId, type, finishedAt: { not: null } },
        orderBy: { takenAt: "desc" },
        take: 5,
      });
      let consecutiveFails = 0;
      for (const a of recentAttempts) {
        if (!a.passed) consecutiveFails++;
        else break;
      }

      // Ujian naik level baru terbuka setelah Gerbang Tulis lulus (penempatan tidak memakai gerbang)
      const workbookOk = type === "level_up" ? await workbookPassed(user.id, levelId) : true;
      if (!workbookOk) canTake = false;

      const rules = parseSectionRules(config.sectionRules);
      res.json({
        canTake,
        workbookPassed: workbookOk,
        cooldownUntil,
        consecutiveFails,
        config: {
          passScore: config.passScore,
          sectionMinScore: config.sectionMinScore,
          timeLimitMin: config.timeLimitMin,
          questionCount: examTotal(config.questionCount, rules),
          cooldownHours: config.cooldownHours,
          sectionRules: rules,
        },
      });
    }));

    // GET /exam/{jenis}/questions?levelId=N
    r.get(`/${path}/questions`, asyncHandler(async (req, res) => {
      const levelId = levelIdQuery(req.query.levelId);
      const user = learner(req);
      const config = await examConfig(levelId, type);
      if (type === "level_up" && !(await workbookPassed(user.id, levelId))) {
        throw Errors.forbidden("Lulus Gerbang Tulis level ini dulu sebelum ikut tes naik tahap.");
      }

      const bank = await prisma.examQuestion.findMany({
        where: { levelId, examType: type, status: "published" },
        select: { id: true, section: true, type: true, question: true, hint: true, options: true, correctAnswer: true, difficulty: true, audioUrl: true, imageUrl: true },
      });

      type QuestionItem = (typeof bank)[number];
      let questions: QuestionItem[];
      const rules = parseSectionRules(config.sectionRules);
      const total = examTotal(config.questionCount, rules);

      // Bank penempatan dipakai begitu admin mengisinya; bank naik tahap baru dipakai jika sudah cukup untuk satu ujian
      const useBank = type === "placement" ? bank.length > 0 : bank.length >= total;
      if (useBank) {
        questions = pickQuestions(bank, config.questionCount, rules);
      } else {
        // Cadangan: latihan pilihan ganda dari bab. Tes penempatan menguji materi level sebelum level tujuan.
        let sourceLevelId = levelId;
        if (type === "placement") {
          const target = await prisma.level.findUnique({ where: { id: levelId } });
          const previous = target
            ? await prisma.level.findFirst({ where: { sortOrder: { lt: target.sortOrder } }, orderBy: { sortOrder: "desc" } })
            : null;
          sourceLevelId = previous?.id ?? levelId;
        }
        const quizQs = await prisma.quizQuestion.findMany({
          where: { chapter: { levelId: sourceLevelId }, type: "pilihan_ganda" },
          select: { id: true, type: true, question: true, hint: true, options: true, correctAnswer: true, audioUrl: true, imageUrl: true },
          take: total * 3,
        });
        questions = shuffle(quizQs)
          .slice(0, total)
          .map(q => ({ ...q, section: "kosakata" as const, difficulty: 1 }));
      }
      if (questions.length === 0) throw Errors.notFound("Soal tes");

      // Kanji level ini, untuk mengenali tulisan tangan pada soal menulis
      const kanji = questions.some(q => q.type === "menulis")
        ? (await prisma.kanji.findMany({ where: { chapter: { levelId } }, select: { character: true } })).map(k => k.character)
        : [];

      const attempt = await prisma.examAttempt.create({
        data: {
          userId: user.id,
          levelId,
          type,
          examId: config.id,
          score: 0,
          passed: false,
          startedAt: new Date(),
          // Daftar soal yang dibagikan: saat menilai, soal yang tidak dijawab dihitung salah
          details: { questions: questions.map((q) => ({ id: q.id, section: q.section })) },
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
        sectionRules: rules,
      });
    }));

    // POST /exam/{jenis}/submit
    r.post(`/${path}/submit`, asyncHandler(async (req, res) => {
      const body = parseBody(submitBody, req.body);
      const user = learner(req);
      const { attemptId, levelId } = body;
      const config = await examConfig(levelId, type);

      const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, userId: user.id, levelId, type, finishedAt: null } });
      if (!attempt) throw Errors.notFound("Sesi tes");
      const { results, perSection, correct, graded } = await gradeAnswers(withUnanswered(body.answers, attempt.details));

      const totalScore = Math.round((correct / Math.max(graded, 1)) * 100);
      // Bagian tanpa soal tidak ditampilkan dan tidak ikut syarat nilai minimal
      const sectionScores = Object.fromEntries(
        Object.entries(perSection)
          .filter(([, { total }]) => total > 0)
          .map(([s, { correct: c, total }]) => [s, Math.round((c / total) * 100)]),
      );
      const rules = parseSectionRules(config.sectionRules);
      const sectionMinScores = Object.fromEntries(Object.keys(sectionScores).map((sec) => [sec, sectionMin(rules, sec, config.sectionMinScore)]));
      const sectionsPassed = Object.entries(sectionScores).every(([sec, v]) => v >= sectionMinScores[sec]);
      // Batas waktu juga dicek di server; lewat dari batas + toleransi dianggap tidak lulus
      const late = !!attempt.startedAt && Date.now() > attempt.startedAt.getTime() + config.timeLimitMin * 60_000 + LATE_GRACE_MS;
      const passed = totalScore >= config.passScore && sectionsPassed && !late;

      // Naik tahap: cari level berikutnya. Penempatan: hasilnya level tujuan itu sendiri.
      let nextLevel: { id: number; isPremium: boolean } | null = null;
      if (type === "level_up") {
        const currentLevel = await prisma.level.findUnique({ where: { id: levelId } });
        nextLevel = currentLevel
          ? await prisma.level.findFirst({ where: { sortOrder: { gt: currentLevel.sortOrder } }, orderBy: { sortOrder: "asc" } })
          : null;
      }
      const resultLevelId = passed ? (nextLevel?.id ?? levelId) : levelId;

      await prisma.examAttempt.update({
        where: { id: attemptId },
        data: { score: totalScore, passed, finishedAt: new Date(), sectionScores, resultLevelId },
      });
      await saveAnswerRecords(attemptId, results);

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

      const xp = type === "placement" ? XP_REWARD.placement : passed ? XP_REWARD.levelExamPassed : XP_REWARD.levelExamTried;
      const progress = await activity.record(user.id, type === "placement" ? "placement" : "level_exam", xp);

      res.json({ passed, totalScore, sectionScores, sectionMinScores, late, resultLevelId, nextLevelId: nextLevel?.id ?? null, cooldownUntil, progress });
    }));
  }

  return r;
}
