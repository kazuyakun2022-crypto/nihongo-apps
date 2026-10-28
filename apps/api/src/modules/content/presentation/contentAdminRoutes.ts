import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { EXERCISE_TYPES, exerciseProblem, type ExerciseType } from "../../learning/domain/Exercise";

/**
 * Pengelolaan konten belajar & ujian oleh admin (dipasang di /api/admin/content, sudah melewati requireRole("admin")).
 * Semua perubahan langsung berlaku; bab berstatus draft/review tidak tampil ke siswa.
 */

const statusSchema = z.enum(["draft", "review", "published"]);
const opt = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);

/** Isi soal latihan; aturan per jenis dicek terpisah oleh exerciseProblem. Dipakai latihan bab dan bank soal ujian. */
const exerciseFields = {
  type: z.enum(EXERCISE_TYPES).default("pilihan_ganda"),
  question: z.string().trim().min(1, "Pertanyaan wajib diisi.").max(1000),
  hint: opt(255),
  options: z.array(z.string().trim().min(1).max(200)).max(16).default([]),
  correctAnswer: z.string().trim().min(1, "Jawaban benar wajib diisi.").max(200),
  audioUrl: opt(500),
  explanation: opt(2000),
};

const itemSchemas = {
  vocab: z.object({
    word: z.string().trim().min(1).max(50),
    reading: z.string().trim().min(1).max(50),
    meaningId: z.string().trim().min(1).max(255),
    exampleSentence: opt(500),
    exampleTranslation: opt(500),
    audioUrl: opt(500),
  }),
  kanji: z.object({
    character: z.string().trim().length(1, "Isi satu karakter kanji."),
    onyomi: opt(50),
    kunyomi: opt(50),
    meaningId: z.string().trim().min(1).max(255),
    strokeOrderUrl: opt(500),
  }),
  grammar: z.object({
    pattern: z.string().trim().min(1).max(100),
    explanation: z.string().trim().min(1).max(3000),
    exampleSentence: opt(500),
    exampleTranslation: opt(500),
  }),
  // Aturan isi per jenis latihan dicek terpisah oleh checkExercise (butuh data bab untuk soal menulis kanji).
  quiz: z.object(exerciseFields),
} as const;
type ItemKind = keyof typeof itemSchemas;

const delegates = {
  vocab: () => prisma.vocabulary,
  kanji: () => prisma.kanji,
  grammar: () => prisma.grammarPoint,
  quiz: () => prisma.quizQuestion,
};

function itemKind(raw: string): ItemKind {
  if (raw in itemSchemas) return raw as ItemKind;
  throw Errors.notFound("Jenis materi");
}

function parseItem(kind: ItemKind, body: unknown, partial: boolean) {
  const schema = itemSchemas[kind];
  return parseBody(partial ? schema.partial() : schema, body) as Record<string, unknown>;
}

/**
 * Validasi soal latihan utuh (setelah digabung dengan data lama saat diubah).
 * Kanji yang boleh ditulis tangan: kanji bab itu, atau kanji semua bab di level untuk soal ujian.
 */
async function checkExercise(scope: { chapterId: string } | { levelId: number }, ex: { type: ExerciseType; options: unknown; correctAnswer: string }) {
  const where = "chapterId" in scope ? { chapterId: scope.chapterId } : { chapter: { levelId: scope.levelId } };
  const kanji = ex.type === "menulis" ? await prisma.kanji.findMany({ where, select: { character: true } }) : [];
  const options = Array.isArray(ex.options) ? (ex.options as string[]) : [];
  const problem = exerciseProblem({ type: ex.type, options, correctAnswer: ex.correctAnswer }, kanji.map((k) => k.character));
  if (problem) throw Errors.validation(problem);
}

const levelIdParam = (raw: string) => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw Errors.validation("Level tidak valid.");
  return id;
};

const examConfigSchema = z.object({
  questionCount: z.number().int().min(4).max(200),
  timeLimitMin: z.number().int().min(1).max(300),
  passScore: z.number().int().min(1).max(100),
  sectionMinScore: z.number().int().min(0).max(100),
  cooldownHours: z.number().int().min(0).max(720),
  minChapterCompletion: z.number().int().min(0).max(100),
});

const examQuestionSchema = z
  .object({
    section: z.enum(["kosakata", "tata_bahasa", "membaca", "mendengar"]),
    difficulty: z.number().int().min(1).max(5).default(1),
    status: statusSchema.default("published"),
    ...exerciseFields,
  });

export function contentAdminRoutes() {
  const r = Router();

  // ── Ringkasan level ──
  r.get("/levels", asyncHandler(async (_req, res) => {
    const [levels, chapterCounts, questionCounts, configs] = await Promise.all([
      prisma.level.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.chapter.groupBy({ by: ["levelId", "status"], _count: { _all: true } }),
      prisma.examQuestion.groupBy({ by: ["levelId"], _count: { _all: true } }),
      prisma.levelExam.findMany({ where: { type: "level_up" } }),
    ]);
    res.json({
      levels: levels.map((l) => ({
        ...l,
        chapters: Object.fromEntries(chapterCounts.filter((c) => c.levelId === l.id).map((c) => [c.status, c._count._all])),
        examQuestions: questionCounts.find((q) => q.levelId === l.id)?._count._all ?? 0,
        hasExam: configs.some((c) => c.levelId === l.id),
      })),
    });
  }));

  // ── Bab ──
  r.get("/levels/:levelId/chapters", asyncHandler(async (req, res) => {
    const chapters = await prisma.chapter.findMany({
      where: { levelId: levelIdParam(req.params.levelId) },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, title: true, status: true, sortOrder: true, publishedAt: true,
        _count: { select: { vocabularies: true, kanji: true, grammarPoints: true, quizQuestions: true } },
      },
    });
    res.json({ chapters });
  }));

  r.post("/levels/:levelId/chapters", asyncHandler(async (req, res) => {
    const levelId = levelIdParam(req.params.levelId);
    const body = parseBody(z.object({ title: z.string().trim().min(1).max(150), explanation: opt(5000) }), req.body);
    const last = await prisma.chapter.aggregate({ where: { levelId }, _max: { sortOrder: true } });
    const chapter = await prisma.chapter.create({
      data: { levelId, title: body.title, explanation: body.explanation, sortOrder: (last._max.sortOrder ?? 0) + 1, status: "draft", createdById: req.user?.id },
    });
    res.status(201).json({ chapter });
  }));

  r.put("/levels/:levelId/chapters/order", asyncHandler(async (req, res) => {
    const levelId = levelIdParam(req.params.levelId);
    const { ids } = parseBody(z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) }), req.body);
    await prisma.$transaction(ids.map((id, i) => prisma.chapter.updateMany({ where: { id, levelId }, data: { sortOrder: i + 1 } })));
    res.json({ ok: true });
  }));

  r.get("/chapters/:id", asyncHandler(async (req, res) => {
    const chapter = await prisma.chapter.findUnique({
      where: { id: req.params.id },
      include: { vocabularies: true, kanji: true, grammarPoints: true, quizQuestions: true, level: true },
    });
    if (!chapter) throw Errors.notFound("Bab");
    res.json({ chapter });
  }));

  r.patch("/chapters/:id", asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({ title: z.string().trim().min(1).max(150), explanation: opt(5000), status: statusSchema, levelId: z.number().int().min(1) }).partial(),
      req.body,
    );
    const current = await prisma.chapter.findUnique({ where: { id: req.params.id }, select: { status: true } });
    if (!current) throw Errors.notFound("Bab");
    const publishing = body.status === "published" && current.status !== "published";
    const chapter = await prisma.chapter.update({
      where: { id: req.params.id },
      data: { ...body, ...(publishing ? { publishedAt: new Date(), approvedById: req.user?.id } : {}) },
    });
    res.json({ chapter });
  }));

  r.delete("/chapters/:id", asyncHandler(async (req, res) => {
    const progress = await prisma.userChapterProgress.count({ where: { chapterId: req.params.id } });
    if (progress > 0) throw Errors.conflict(`Bab ini sudah dipelajari ${progress} siswa. Ubah statusnya ke draft untuk menyembunyikan.`);
    await prisma.chapter.delete({ where: { id: req.params.id } }).catch(() => {
      throw Errors.notFound("Bab");
    });
    res.status(204).end();
  }));

  // ── Materi bab: kosakata, kanji, tata bahasa, kuis ──
  r.post("/chapters/:id/:kind", asyncHandler(async (req, res) => {
    const kind = itemKind(req.params.kind);
    const data = parseItem(kind, req.body, false);
    if (kind === "quiz") await checkExercise({ chapterId: req.params.id }, data as Parameters<typeof checkExercise>[1]);
    const delegate = delegates[kind]() as unknown as { create(args: unknown): Promise<unknown> };
    const item = await delegate.create({ data: { ...data, chapterId: req.params.id } });
    res.status(201).json({ item });
  }));

  r.patch("/items/:kind/:itemId", asyncHandler(async (req, res) => {
    const kind = itemKind(req.params.kind);
    const data = parseItem(kind, req.body, true);
    if (kind === "quiz") {
      const current = await prisma.quizQuestion.findUnique({ where: { id: req.params.itemId } });
      if (!current) throw Errors.notFound("Soal");
      await checkExercise({ chapterId: current.chapterId }, {
        type: (data.type ?? current.type) as ExerciseType,
        options: data.options ?? current.options,
        correctAnswer: (data.correctAnswer ?? current.correctAnswer) as string,
      });
    }
    const delegate = delegates[kind]() as unknown as { update(args: unknown): Promise<unknown> };
    const item = await delegate.update({ where: { id: req.params.itemId }, data }).catch(() => {
      throw Errors.notFound("Materi");
    });
    res.json({ item });
  }));

  r.delete("/items/:kind/:itemId", asyncHandler(async (req, res) => {
    const delegate = delegates[itemKind(req.params.kind)]() as unknown as { delete(args: unknown): Promise<unknown> };
    await delegate.delete({ where: { id: req.params.itemId } }).catch(() => {
      throw Errors.notFound("Materi");
    });
    res.status(204).end();
  }));

  // ── Ujian naik level ──
  r.get("/levels/:levelId/exam", asyncHandler(async (req, res) => {
    const levelId = levelIdParam(req.params.levelId);
    const q = parseBody(
      z.object({
        section: z.enum(["kosakata", "tata_bahasa", "membaca", "mendengar"]).optional(),
        search: z.string().trim().max(100).optional(),
        page: z.coerce.number().int().min(1).default(1),
      }),
      req.query,
    );
    const where: Prisma.ExamQuestionWhereInput = {
      levelId,
      ...(q.section ? { section: q.section } : {}),
      ...(q.search ? { OR: [{ question: { contains: q.search, mode: "insensitive" } }, { correctAnswer: { contains: q.search, mode: "insensitive" } }] } : {}),
    };
    const pageSize = 25;
    const [config, total, questions, sections] = await Promise.all([
      prisma.levelExam.findUnique({ where: { levelId_type: { levelId, type: "level_up" } } }),
      prisma.examQuestion.count({ where }),
      prisma.examQuestion.findMany({ where, orderBy: [{ section: "asc" }, { id: "asc" }], skip: (q.page - 1) * pageSize, take: pageSize }),
      prisma.examQuestion.groupBy({ by: ["section"], where: { levelId, status: "published" }, _count: { _all: true } }),
    ]);
    res.json({
      config,
      questions,
      total,
      page: q.page,
      pageSize,
      publishedPerSection: Object.fromEntries(sections.map((s) => [s.section, s._count._all])),
    });
  }));

  r.put("/levels/:levelId/exam", asyncHandler(async (req, res) => {
    const levelId = levelIdParam(req.params.levelId);
    const data = parseBody(examConfigSchema, req.body);
    const config = await prisma.levelExam.upsert({
      where: { levelId_type: { levelId, type: "level_up" } },
      create: { levelId, type: "level_up", ...data },
      update: data,
    });
    res.json({ config });
  }));

  r.post("/levels/:levelId/exam/questions", asyncHandler(async (req, res) => {
    const levelId = levelIdParam(req.params.levelId);
    const data = parseBody(examQuestionSchema, req.body);
    await checkExercise({ levelId }, data);
    const question = await prisma.examQuestion.create({ data: { ...data, levelId, options: data.options } });
    res.status(201).json({ question });
  }));

  r.patch("/exam/questions/:id", asyncHandler(async (req, res) => {
    const current = await prisma.examQuestion.findUnique({ where: { id: req.params.id } });
    if (!current) throw Errors.notFound("Soal");
    const merged = { section: current.section, difficulty: current.difficulty, status: current.status, type: current.type, question: current.question, hint: current.hint, options: current.options, correctAnswer: current.correctAnswer, audioUrl: current.audioUrl, explanation: current.explanation, ...(req.body ?? {}) };
    const data = parseBody(examQuestionSchema, merged);
    await checkExercise({ levelId: current.levelId }, data);
    const question = await prisma.examQuestion.update({ where: { id: req.params.id }, data: { ...data, options: data.options } });
    res.json({ question });
  }));

  r.delete("/exam/questions/:id", asyncHandler(async (req, res) => {
    const answered = await prisma.examAttemptAnswer.count({ where: { questionId: req.params.id } });
    if (answered > 0) {
      // Soal yang pernah dijawab disimpan untuk riwayat; cukup disembunyikan dari ujian berikutnya
      await prisma.examQuestion.update({ where: { id: req.params.id }, data: { status: "draft" } });
      res.json({ archived: true });
      return;
    }
    await prisma.examQuestion.delete({ where: { id: req.params.id } }).catch(() => {
      throw Errors.notFound("Soal");
    });
    res.status(204).end();
  }));

  return r;
}
