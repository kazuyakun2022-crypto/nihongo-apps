import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { toChapterExercise } from "../../learning/infrastructure/PrismaLearningRepository";
import { XP_REWARD, type ActivityRecorder } from "../../progress/domain/activity";
import type { Notifier } from "../../notifications/domain/types";
import { LATE_GRACE_MS, examTotal, parseSectionRules, pickQuestions, withUnanswered } from "../domain/SectionRules";
import {
  JLPT_BREAK_MINUTES,
  JLPT_MAX_SCORE,
  JLPT_SIM_LEVELS,
  JLPT_SPEC,
  SIM_QUESTION_TYPES,
  SIM_SECTIONS,
  defaultJlptSimConfig,
  isJlptCode,
  jlptSessions,
  orderBySection,
  scoreJlpt,
  sessionOf,
  type JlptCode,
} from "../domain/JlptSim";
import { JLPT_PACKAGE_COUNT } from "../domain/jlptImport";
import { asExerciseType, gradeAnswers, saveAnswerRecords } from "./examGrading";
import { submitBody } from "./levelExamRoutes";

/** ?paket=N (1-10) memilih paket tetap; tanpa paket = soal acak dari seluruh bank. */
function paketQuery(raw: unknown): number | null {
  if (raw === undefined || raw === "" || raw === "acak") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > JLPT_PACKAGE_COUNT) throw Errors.validation("Nomor paket tidak valid.");
  return n;
}

/** Soal terbit sebuah paket (hanya soal pilihan). */
function packageWhere(levelId: number, paket: number) {
  return { levelId, examType: "jlpt_sim" as const, status: "published", packageNo: paket, type: { in: [...SIM_QUESTION_TYPES] } };
}

const paketOf = (details: unknown): number | null => {
  const p = (details as { paket?: unknown } | null)?.paket;
  return typeof p === "number" ? p : null;
};

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

/**
 * Struktur yang ditampilkan ke siswa: sesi berwaktu dan kelompok skor beserta ambangnya.
 * counts = jumlah soal nyata per bagian (paket tetap); tanpa itu dipakai target jumlah soal dari aturan.
 */
function structure(c: SimConfig, counts?: Record<string, number>) {
  const sessions = jlptSessions(c.level.code, c.timeLimitMin);
  return {
    pass: c.passScore,
    maxScore: JLPT_MAX_SCORE,
    breakMinutes: JLPT_BREAK_MINUTES,
    sessions: sessions.map((s) => ({
      key: s.key,
      title: s.title,
      minutes: s.minutes,
      questionCount: s.sections.reduce((n, sec) => n + (counts ? counts[sec] ?? 0 : c.rules?.[sec]?.count ?? 0), 0),
    })),
    groups: JLPT_SPEC[c.level.code].groups.map(({ key, label, max, min }) => ({ key, label, max, min })),
  };
}

export function jlptSimRoutes(activity: ActivityRecorder, notifier?: Notifier) {
  const r = Router();

  // GET /levels: daftar level simulasi beserta aturan dan riwayat nilai siswa (skor 0-180)
  r.get("/levels", asyncHandler(async (req, res) => {
    const user = learner(req);
    const levels = await prisma.level.findMany({ where: { code: { in: [...JLPT_SIM_LEVELS] } }, orderBy: { sortOrder: "asc" } });
    const levelIds = levels.map((l) => l.id);
    const [banks, packages, attempts] = await Promise.all([
      prisma.examQuestion.groupBy({
        by: ["levelId"],
        where: { levelId: { in: levelIds }, examType: { in: ["jlpt_sim", "level_up"] }, status: "published", type: { in: [...SIM_QUESTION_TYPES] } },
        _count: { _all: true },
      }),
      prisma.examQuestion.groupBy({
        by: ["levelId", "packageNo"],
        where: { levelId: { in: levelIds }, examType: "jlpt_sim", status: "published", packageNo: { not: null }, type: { in: [...SIM_QUESTION_TYPES] } },
        _count: { _all: true },
      }),
      prisma.examAttempt.findMany({
        where: { userId: user.id, type: "jlpt_sim", finishedAt: { not: null }, levelId: { in: levelIds } },
        orderBy: { takenAt: "desc" },
        select: { levelId: true, score: true, passed: true, takenAt: true, details: true },
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
        // Paket tetap yang sudah terbit, beserta skor terbaik siswa di paket itu
        packages: packages
          .filter((p) => p.levelId === l.id && p.packageNo !== null)
          .sort((a, b) => (a.packageNo ?? 0) - (b.packageNo ?? 0))
          .map((p) => {
            const tries = mine.filter((a) => paketOf(a.details) === p.packageNo);
            return {
              no: p.packageNo as number,
              questionCount: p._count._all,
              attempts: tries.length,
              bestScore: tries.length ? Math.max(...tries.map((a) => a.score)) : null,
              passed: tries.some((a) => a.passed),
            };
          }),
        attempts: mine.length,
        passedCount: mine.filter((a) => a.passed).length,
        bestScore: mine.length ? Math.max(...mine.map((a) => a.score)) : null,
        recent: mine.slice(0, 20).map((a) => ({ score: a.score, passed: a.passed, takenAt: a.takenAt.toISOString(), paket: paketOf(a.details) })),
      };
    }));
    res.json({ levels: items });
  }));

  // GET /status?levelId=N: aturan untuk layar sebelum mulai
  r.get("/status", asyncHandler(async (req, res) => {
    const user = learner(req);
    const c = await simConfig(levelIdQuery(req.query.levelId));
    const paket = paketQuery(req.query.paket);
    // Paket tetap: jumlah soal per sesi mengikuti isi paketnya, bukan target aturan
    let counts: Record<string, number> | undefined;
    if (paket) {
      const rows = await prisma.examQuestion.groupBy({ by: ["section"], where: packageWhere(c.level.id, paket), _count: { _all: true } });
      if (!rows.length) throw Errors.notFound(`Paket ${paket}`);
      counts = Object.fromEntries(rows.map((r) => [r.section, r._count._all]));
    }
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
        questionCount: counts ? Object.values(counts).reduce((a, b) => a + b, 0) : c.questionCount,
        cooldownHours: c.cooldownHours,
        sectionRules: c.rules,
      },
      paket,
      level: { code: c.level.code, name: c.level.name },
      jlpt: structure(c, counts),
    });
  }));

  // GET /questions?levelId=N: mulai percobaan baru, soal berurutan per sesi
  r.get("/questions", asyncHandler(async (req, res) => {
    const user = learner(req);
    const c = await simConfig(levelIdQuery(req.query.levelId));
    const paket = paketQuery(req.query.paket);
    const select = {
      id: true, examType: true, section: true, category: true, passage: true, type: true, question: true, hint: true,
      options: true, correctAnswer: true, difficulty: true, audioUrl: true, imageUrl: true, sourceKey: true,
    } as const;
    let questions;
    if (paket) {
      // Paket tetap: semua soal paket dipakai apa adanya, berurutan seperti kertas ujian
      questions = orderBySection(await prisma.examQuestion.findMany({ where: packageWhere(c.level.id, paket), select }));
      if (questions.length === 0) throw Errors.notFound(`Paket ${paket}`);
    } else {
      const bank = await prisma.examQuestion.findMany({
        where: { levelId: c.level.id, examType: { in: ["jlpt_sim", "level_up"] }, status: "published", type: { in: [...SIM_QUESTION_TYPES] } },
        select,
      });
      if (bank.length === 0) throw Errors.notFound("Soal simulasi");
      // Soal khusus simulasi didahulukan, lalu soal pinjaman dari bank naik tahap
      const shuffled = <T,>(xs: T[]) => xs.map((x) => ({ x, k: Math.random() })).sort((a, b) => a.k - b.k).map(({ x }) => x);
      const pool = [...shuffled(bank.filter((q) => q.examType === "jlpt_sim")), ...shuffled(bank.filter((q) => q.examType !== "jlpt_sim"))];
      questions = orderBySection(pickQuestions(pool, c.rawQuestionCount, c.rules, SIM_SECTIONS));
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        levelId: c.level.id,
        type: "jlpt_sim",
        examId: c.examId,
        score: 0,
        passed: false,
        startedAt: new Date(),
        details: { paket, questions: questions.map((q) => ({ id: q.id, section: q.section })) } as Prisma.InputJsonValue,
      },
    });

    // Jumlah soal per sesi dihitung dari soal yang benar-benar terpilih (bank yang kurang diisi bagian lain)
    const picked: Record<string, number> = {};
    for (const q of questions) picked[q.section] = (picked[q.section] ?? 0) + 1;
    const s = structure(c, picked);
    res.json({
      attemptId: attempt.id,
      paket,
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

    if (passed && notifier) {
      await notifier
        .notify(user.id, {
          type: "exam",
          title: "Simulasi JLPT lulus!",
          body: `Skormu ${score.total}. Pertahankan ritme belajarmu untuk ujian yang sebenarnya.`,
          url: "/beranda",
          dedupeKey: `exam:${attempt.id}`,
        })
        .catch((err) => console.error("[notifications] gagal membuat notifikasi simulasi", err instanceof Error ? err.message : err));
    }

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
