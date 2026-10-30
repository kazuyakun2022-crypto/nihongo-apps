import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { HIRAGANA_BASIC, MASTERY_GATE, buildGateItems, gradeGate, type GateItem } from "../domain/MasteryGate";

/** Bab Pre-N5 hasil impor kurikulum (lihat prisma/scripts/kurikulumData.ts). */
const PRE_N5_CHAPTERS: Prisma.ChapterWhereInput = { sourceKey: { startsWith: "pren5:" } };
const MIN_CHAPTER_PCT = 80;

function learner(req: Parameters<typeof currentUser>[0]) {
  const user = currentUser(req);
  if (user.role === "admin" || user.role === "super_admin") throw Errors.forbidden("Akun Administrator tidak mengikuti tes siswa.");
  return user;
}

/** Level terendah (Pemula/Pre-N5) dan level sesudahnya. */
async function gateLevels() {
  const levels = await prisma.level.findMany({ orderBy: { sortOrder: "asc" }, take: 2 });
  if (!levels[0]) throw Errors.notFound("Level");
  return { level: levels[0], next: levels[1] ?? null };
}

async function eligibility(userId: string, levelId: number) {
  const chapters = await prisma.chapter.findMany({
    where: { levelId, status: "published" },
    select: { progress: { where: { userId }, select: { status: true } } },
  });
  const completed = chapters.filter((c) => c.progress[0]?.status === "completed").length;
  const pct = chapters.length ? Math.round((completed / chapters.length) * 100) : 0;
  const config = await prisma.levelExam.findUnique({ where: { levelId_type: { levelId, type: "level_up" } } });
  const lastFailed = await prisma.examAttempt.findFirst({
    where: { userId, levelId, type: "level_up", passed: false, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: { finishedAt: true },
  });
  const cooldownMs = (config?.cooldownHours ?? 0) * 3_600_000;
  const cooldownUntil = lastFailed?.finishedAt && cooldownMs ? new Date(lastFailed.finishedAt.getTime() + cooldownMs) : null;
  const coolingDown = !!cooldownUntil && cooldownUntil > new Date();
  return {
    chaptersCompleted: completed,
    chaptersTotal: chapters.length,
    chapterPct: pct,
    minChapterPct: MIN_CHAPTER_PCT,
    cooldownUntil: coolingDown ? cooldownUntil!.toISOString() : null,
    canTake: pct >= MIN_CHAPTER_PCT && !coolingDown,
    examId: config?.id ?? null,
  };
}

/** Mastery Gate Pre-N5 (dipasang di /api/exam/mastery-gate). */
export function masteryGateRoutes() {
  const r = Router();

  r.get("/status", asyncHandler(async (req, res) => {
    const user = learner(req);
    const { level, next } = await gateLevels();
    const { examId: _examId, ...status } = await eligibility(user.id, level.id);
    const passedBefore = await prisma.examAttempt.count({ where: { userId: user.id, levelId: level.id, type: "level_up", passed: true } });
    res.json({ ...status, rules: MASTERY_GATE, totalItems: HIRAGANA_BASIC.length + MASTERY_GATE.vocabItems, levelCode: level.code, nextLevel: next?.name ?? null, passedBefore: passedBefore > 0 });
  }));

  r.post("/start", asyncHandler(async (req, res) => {
    const user = learner(req);
    const { level } = await gateLevels();
    const status = await eligibility(user.id, level.id);
    if (!status.canTake) {
      throw Errors.forbidden(status.cooldownUntil ? "Tunggu masa jeda sebelum mencoba lagi." : `Selesaikan minimal ${MIN_CHAPTER_PCT}% bab Pemula dulu.`);
    }
    // Kosakata kana dari bab Pre-N5 (bukan kartu huruf "Dibaca …")
    const vocab = await prisma.vocabulary.findMany({
      where: { chapter: { ...PRE_N5_CHAPTERS, levelId: level.id }, NOT: { meaningId: { startsWith: "Dibaca " } } },
      select: { id: true, word: true, meaningId: true },
    });
    const unique = [...new Map(vocab.map((v) => [v.word, { id: v.id, word: v.word, meaning: v.meaningId }])).values()];
    const items = buildGateItems(unique);
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        levelId: level.id,
        type: "level_up",
        examId: status.examId,
        score: 0,
        passed: false,
        startedAt: new Date(),
        details: { masteryGate: true, items } as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    res.json({ attemptId: attempt.id, items: items.map(({ kind, prompt, options }) => ({ kind, prompt, options })), rules: MASTERY_GATE });
  }));

  r.post("/submit", asyncHandler(async (req, res) => {
    const user = learner(req);
    const body = parseBody(
      z.object({
        attemptId: z.string().uuid(),
        answers: z.array(z.object({ index: z.number().int().min(0), answer: z.string().max(200).nullable(), ms: z.number().int().min(0).max(600000) })).max(200),
      }),
      req.body,
    );
    const attempt = await prisma.examAttempt.findFirst({ where: { id: body.attemptId, userId: user.id, finishedAt: null } });
    const details = attempt?.details as { masteryGate?: boolean; items?: GateItem[] } | null;
    if (!attempt || !details?.masteryGate || !details.items) throw Errors.notFound("Tes");

    const { results, accuracy, avgMs, passed } = gradeGate(details.items, body.answers);
    const { level, next } = await gateLevels();
    const now = new Date();

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: accuracy,
        passed,
        finishedAt: now,
        resultLevelId: passed ? (next?.id ?? level.id) : level.id,
        details: { masteryGate: true, items: details.items, accuracy, avgMs } as unknown as Prisma.InputJsonValue,
      },
    });

    // Huruf/kata yang salah atau lambat masuk kartu SRS lemah untuk drilling harian
    const missed = results.filter((r) => !r.correct);
    let weakMarked = 0;
    if (missed.length) {
      const chars = missed.filter((r) => r.kind === "huruf").map((r) => r.prompt);
      const kanaCards = chars.length
        ? await prisma.vocabulary.findMany({ where: { chapter: { levelId: level.id }, word: { in: chars }, meaningId: { startsWith: "Dibaca " } }, select: { id: true, word: true } })
        : [];
      const ids = new Set<string>([
        ...[...new Map(kanaCards.map((k) => [k.word, k.id])).values()],
        ...missed.map((r) => details.items![r.index].vocabId).filter((id): id is string => !!id),
      ]);
      const today = new Date(now.toISOString().slice(0, 10));
      for (const itemId of ids) {
        await prisma.srsCard.upsert({
          where: { userId_itemType_itemId: { userId: user.id, itemType: "vocab", itemId } },
          create: { userId: user.id, itemType: "vocab", itemId, dueDate: today, isWeak: true },
          update: { isWeak: true, dueDate: today },
        });
      }
      weakMarked = ids.size;
    }

    if (passed && next) {
      const current = await prisma.user.findUnique({ where: { id: user.id }, select: { currentLevel: { select: { sortOrder: true } } } });
      // Hanya naik bila siswa memang masih di level Pemula
      if (!current?.currentLevel || current.currentLevel.sortOrder <= level.sortOrder) {
        await prisma.user.update({ where: { id: user.id }, data: next.isPremium ? { pendingLevelId: next.id } : { currentLevelId: next.id } });
      }
    }

    res.json({ passed, accuracy, avgMs, results, weakMarked, nextLevel: passed ? next?.name ?? null : null, rules: MASTERY_GATE });
  }));

  return r;
}
