import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { toChapterExercise } from "../../learning/infrastructure/PrismaLearningRepository";
import { XP_REWARD, type ActivityRecorder } from "../../progress/domain/activity";
import { LATE_GRACE_MS, examTotal, parseSectionRules, pickQuestions, withUnanswered } from "../domain/SectionRules";
import {
  JLPT_BREAK_MINUTES,
  JLPT_MAX_SCORE,
  JLPT_SIM_LEVELS,
  JLPT_SPEC,
  SIM_SECTIONS,
  defaultJlptSimConfig,
  isJlptCode,
  jlptSessions,
  orderBySection,
  scoreJlpt,
  sessionOf,
  type JlptCode,
} from "../domain/JlptSim";
import { asExerciseType, gradeAnswers, saveAnswerRecords } from "./examGrading";
import { submitBody } from "./levelExamRoutes";

/**
 * Simulasi JLPT (/api/exam/jlpt-sim/*): ujian latihan N5–N1 dengan struktur resmi.
 * Soal khusus simulasi (examType jlpt_sim) didahulukan; kekurangannya diambil dari bank tes naik tahap level yang sama.
 * Skor disimpan dalam skala 0–180. Hasil tidak mengubah level siswa.
 */

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

/** Aturan simulasi level ini: yang disimpan admin, atau bawaan resmi. */
async function simConfig(levelId: number) {
  const level = await prisma.level.findUnique({ where: { id: levelId }, select: { id: true, code: true, name: true } });
  if (!level || !isJlptCode(level.code)) throw Errors.notFound("Simulasi JLPT untuk level ini");
  const saved = await prisma.levelExam.findUnique({ where: { levelId_type: { levelId, type: "jlpt_sim" } } });
  const base = saved ?? defaultJlptSimConfig(level.code);
  const rules = parseSectionRules(base.sectionRules, SIM_SECTIONS);
  return {
    level: level as { id: number; code: JlptCode; name: string },
    examId: saved?.id,
    rules,
    questionCount: examTotal(base.questionCount, rules),
    rawQuestionCount: base.questionCount,
    timeLimitMin: base.timeLimitMin,
    passScore: Math.min(JLPT_MAX_SCORE, base.passScore),
    cooldownHours: base.cooldownHours,
    custom: !!saved,
  };
}

type SimConfig = Awaited<ReturnType<typeof simConfig>>;

/** Struktur yang ditampilkan ke siswa: sesi berwaktu dan kelompok skor beserta ambangnya. */
function structure(c: SimConfig) {
  const sessions = jlptSessions(c.level.code, c.timeLimitMin);
  return {
    pass: c.passScore,
    maxScore: JLPT_MAX_SCORE,
    breakMinutes: JLPT_BREAK_MINUTES,
    sessions: sessions.map((s) => ({
      key: s.key,
      title: s.title,
      minutes: s.minutes,
      questionCount: s.sections.reduce((n, sec) => n + (c.rules?.[sec]?.count ?? 0), 0),
    })),
    groups: JLPT_SPEC[c.level.code].groups.map(({ key, label, max, min }) => ({ key, label, max, min })),
  };
}

export function jlptSimRoutes(activity: ActivityRecorder) {
  const r = Router();

  // GET /levels: daftar level simulasi beserta aturan dan riwayat nilai siswa (skor 0-180)
  r.get("/levels", asyncHandler(async (req, res) => {
    const user = learner(req);
    const levels = await prisma.level.findMany({ where: { code: { in: [...JLPT_SIM_LEVELS] } }, orderBy: { sortOrder: "asc" } });
    const levelIds = levels.map((l) => l.id);
    const [banks, attempts] = await Promise.all([
      prisma.examQuestion.groupBy({
        by: ["levelId"],
        where: { levelId: { in: levelIds }, examType: { in: ["jlpt_sim", "level_up"] }, status: "published" },
        _count: { _all: true },
      }),
      prisma.examAttempt.findMany({
        where: { userId: user.id, type: "jlpt_sim", finishedAt: { not: null }, levelId: { in: levelIds } },
        orderBy: { takenAt: "desc" },
        select: { levelId: true, score: true, passed: true, takenAt: true },
      }),
    ]);
    const items = await Promise.all(levels.map(async (l) => {
      const c = await simConfig(l.id);
      const mine = attempts.filter((a) => a.levelId === l.id);
      const s = structure(c);
      return {
        levelId: l.id,
        code: l.code,
        name: l.name,
        available: (banks.find((b) => b.levelId === l.id)?._count._all ?? 0) > 0,
        questionCount: c.questionCount,
        timeLimitMin: c.timeLimitMin,
        passScore: c.passScore,
        sessions: s.sessions,
        attempts: mine.length,
        passedCount: mine.filter((a) => a.passed).length,
        bestScore: mine.length ? Math.max(...mine.map((a) => a.score)) : null,
        recent: mine.slice(0, 5).map((a) => ({ score: a.score, passed: a.passed, takenAt: a.takenAt.toISOString() })),
      };
    }));
    res.json({ levels: items });
  }));

  // GET /status?levelId=N: aturan untuk layar sebelum mulai
  r.get("/status", asyncHandler(async (req, res) => {
    const user = learner(req);
    const c = await simConfig(levelIdQuery(req.query.levelId));
    let canTake = true;
    let cooldownUntil: string | null = null;
    if (c.cooldownHours > 0) {
      const lastFailed = await prisma.examAttempt.findFirst({
        where: { userId: user.id, levelId: c.level.id, type: "jlpt_sim", passed: false, finishedAt: { not: null } },
        orderBy: { takenAt: "desc" },
      });
      const until = lastFailed ? new Date(lastFailed.takenAt.getTime() + c.cooldownHours * 3_600_000) : null;
      if (until && until > new Date()) {
        canTake = false;
        cooldownUntil = until.toISOString();
      }
    }
    res.json({
      canTake,
      workbookPassed: true,
      cooldownUntil,
      consecutiveFails: 0,
      config: {
        passScore: c.passScore,
        sectionMinScore: 0,
        timeLimitMin: c.timeLimitMin,
        questionCount: c.questionCount,
        cooldownHours: c.cooldownHours,
        sectionRules: c.rules,
      },
      jlpt: structure(c),
    });
  }));

  // GET /questions?levelId=N: mulai percobaan baru, soal berurutan per sesi
  r.get("/questions", asyncHandler(async (req, res) => {
    const user = learner(req);
    const c = await simConfig(levelIdQuery(req.query.levelId));
    const bank = await prisma.examQuestion.findMany({
      where: { levelId: c.level.id, examType: { in: ["jlpt_sim", "level_up"] }, status: "published" },
      select: {
        id: true, examType: true, section: true, category: true, passage: true, type: true, question: true, hint: true,
        options: true, correctAnswer: true, difficulty: true, audioUrl: true, imageUrl: true,
      },
    });
    if (bank.length === 0) throw Errors.notFound("Soal simulasi");
    // Soal khusus simulasi didahulukan, lalu soal pinjaman dari bank naik tahap
    const shuffled = <T,>(xs: T[]) => xs.map((x) => ({ x, k: Math.random() })).sort((a, b) => a.k - b.k).map(({ x }) => x);
    const pool = [...shuffled(bank.filter((q) => q.examType === "jlpt_sim")), ...shuffled(bank.filter((q) => q.examType !== "jlpt_sim"))];
    const questions = orderBySection(pickQuestions(pool, c.rawQuestionCount, c.rules, SIM_SECTIONS));

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        levelId: c.level.id,
        type: "jlpt_sim",
        examId: c.examId,
        score: 0,
        passed: false,
        startedAt: new Date(),
        details: { questions: questions.map((q) => ({ id: q.id, section: q.section })) } as Prisma.InputJsonValue,
      },
    });

    const s = structure(c);
    res.json({
      attemptId: attempt.id,
      questions: questions.map((q) => ({
        ...toChapterExercise({ ...q, type: asExerciseType(q.type) }),
        section: q.section,
        category: q.category,
        session: sessionOf(c.level.code, q.section),
        // Skrip Choukai tidak boleh terlihat saat ujian; teks bacaan Dokkai justru wajib tampil
        passage: q.section === "mendengar" ? null : q.passage,
        difficulty: q.difficulty,
      })),
      kanji: [],
      timeLimitMin: c.timeLimitMin,
      sectionRules: c.rules,
      jlpt: s,
    });
  }));

  // POST /submit
  r.post("/submit", asyncHandler(async (req, res) => {
    const body = parseBody(submitBody, req.body);
    const user = learner(req);
    const c = await simConfig(body.levelId);
    const attempt = await prisma.examAttempt.findFirst({ where: { id: body.attemptId, userId: user.id, levelId: c.level.id, type: "jlpt_sim", finishedAt: null } });
    if (!attempt) throw Errors.notFound("Sesi simulasi");

    const answers = withUnanswered(body.answers, attempt.details);
    const { results, perSection } = await gradeAnswers(answers);
    const score = scoreJlpt(c.level.code, perSection, c.passScore);

    // Batas waktu total + istirahat di antara sesi + toleransi jaringan
    const breaks = (JLPT_SPEC[c.level.code].sessions.length - 1) * JLPT_BREAK_MINUTES;
    const late = !!attempt.startedAt && Date.now() > attempt.startedAt.getTime() + (c.timeLimitMin + breaks) * 60_000 + LATE_GRACE_MS;
    const passed = score.passed && !late;

    const sectionScores = Object.fromEntries(
      Object.entries(perSection).filter(([, v]) => v.total > 0).map(([s, v]) => [s, Math.round((v.correct / v.total) * 100)]),
    );
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: score.total,
        passed,
        finishedAt: new Date(),
        resultLevelId: c.level.id,
        sectionScores: Object.fromEntries(score.groups.map((g) => [g.key, g.scaled])) as Prisma.InputJsonValue,
      },
    });
    await saveAnswerRecords(attempt.id, results);

    const cooldownUntil = !passed && c.cooldownHours > 0 ? new Date(Date.now() + c.cooldownHours * 3_600_000).toISOString() : null;
    const progress = await activity.record(user.id, "jlpt_sim", passed ? XP_REWARD.jlptSimPassed : XP_REWARD.jlptSimTried);

    res.json({
      passed,
      totalScore: score.total,
      sectionScores,
      late,
      resultLevelId: c.level.id,
      nextLevelId: null,
      cooldownUntil,
      progress,
      // Simulasi adalah latihan: kunci jawaban, pembahasan, dan skrip dengar boleh ditampilkan
      simulation: {
        scaledScore: score.total,
        pass: score.pass,
        maxScore: JLPT_MAX_SCORE,
        partial: score.partial,
        groups: score.groups,
        review: results.map((r) => ({
          questionId: r.questionId,
          section: r.key?.section ?? "kosakata",
          category: r.key?.category ?? null,
          question: r.key?.question ?? "",
          passage: r.key?.passage ?? null,
          given: r.answer,
          correctAnswer: r.key?.correct ?? "",
          correct: r.isCorrect,
          skipped: r.skipped,
          explanation: r.key?.explanation ?? null,
        })),
      },
    });
  }));

  return r;
}
