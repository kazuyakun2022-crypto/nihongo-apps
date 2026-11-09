import { Router, type Request } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { XP_REWARD, type ActivityRecorder } from "../../progress/domain/activity";
import type { Notifier } from "../../notifications/domain/types";
import { issueHistory, logIssues, takeCheckQuota } from "../../tulis/checkUsage";
import { checkDrawnGrid, checkHandwriting } from "../../tulis/handwritingCheck";
import { kanjiVgStrokes } from "../../tulis/kanjiVg";
import { cornersSchema, DATA_URL, photoSchema } from "../../tulis/tulisRoutes";
import { scoreCanvasChar, type Pt } from "../domain/strokeScore";
import {
  DRAWN_COLS,
  MAX_SHEET_TRIES,
  PAPER_WEIGHTS,
  REQUIRED_WRITES,
  WORKBOOK_DEFAULTS,
  drawnRows,
  drawnSheet,
  gradeGate,
  validDrawnLines,
  kanjiPool,
  paperStatus,
  pickKana,
  splitSheets,
  type GateChar,
  type GateCharResult,
  type GateMode,
  type SheetType,
  type WorkbookDetails,
} from "../domain/WorkbookGate";

/** Gerbang Tulis (dipasang di /api/exam/workbook). Lihat domain/WorkbookGate.ts. */

export async function workbookConfig(levelId: number) {
  const row = await prisma.levelExam.findUnique({ where: { levelId_type: { levelId, type: "workbook" } } });
  return {
    // Paling banyak 60 huruf: ±8 lembar foto (40 permintaan Gemini) per percobaan
    questionCount: Math.min(60, row?.questionCount ?? WORKBOOK_DEFAULTS.questionCount),
    passScore: row?.passScore ?? WORKBOOK_DEFAULTS.passScore,
    cooldownHours: row?.cooldownHours ?? WORKBOOK_DEFAULTS.cooldownHours,
    minChapterCompletion: row?.minChapterCompletion ?? WORKBOOK_DEFAULTS.minChapterCompletion,
  };
}

/** Sudah lulus Gerbang Tulis level ini? Dipakai ujian naik level dan Mastery Gate sebagai syarat. */
export async function workbookPassed(userId: string, levelId: number): Promise<boolean> {
  return (await prisma.examAttempt.count({ where: { userId, levelId, type: "workbook", passed: true } })) > 0;
}

function learner(req: Request) {
  const user = currentUser(req);
  if (user.role === "admin" || user.role === "super_admin") throw Errors.forbidden("Akun Administrator tidak mengikuti tes siswa.");
  return user;
}

function levelIdOf(raw: unknown): number {
  const levelId = Number(raw);
  if (!Number.isInteger(levelId) || levelId < 1) throw Errors.validation("levelId tidak valid.");
  return levelId;
}

async function status(userId: string, levelId: number) {
  const config = await workbookConfig(levelId);
  const chapters = await prisma.chapter.findMany({
    where: { levelId, status: "published" },
    select: { progress: { where: { userId }, select: { status: true } } },
  });
  const completed = chapters.filter((c) => c.progress[0]?.status === "completed").length;
  const chapterPct = chapters.length ? Math.round((completed / chapters.length) * 100) : 0;
  const [level, passed, lastFailed, active, best] = await Promise.all([
    prisma.level.findUnique({ where: { id: levelId }, select: { code: true, name: true } }),
    workbookPassed(userId, levelId),
    prisma.examAttempt.findFirst({
      where: { userId, levelId, type: "workbook", passed: false, finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true },
    }),
    prisma.examAttempt.findFirst({ where: { userId, levelId, type: "workbook", finishedAt: null }, orderBy: { startedAt: "desc" }, select: { id: true } }),
    prisma.examAttempt.findFirst({ where: { userId, levelId, type: "workbook", finishedAt: { not: null } }, orderBy: { score: "desc" }, select: { score: true } }),
  ]);
  const until = lastFailed?.finishedAt && config.cooldownHours ? new Date(lastFailed.finishedAt.getTime() + config.cooldownHours * 3_600_000) : null;
  const cooldownUntil = !passed && until && until > new Date() ? until.toISOString() : null;
  if (!level) throw Errors.notFound("Level");
  return {
    levelCode: level.code,
    levelName: level.name,
    passed,
    bestScore: best?.score ?? null,
    chaptersCompleted: completed,
    chaptersTotal: chapters.length,
    chapterPct,
    cooldownUntil,
    activeAttemptId: active?.id ?? null,
    canTake: !passed && chapterPct >= config.minChapterCompletion && !cooldownUntil,
    config,
  };
}

/** Item acak untuk satu percobaan. Hanya huruf yang punya data goresan KanjiVG (dipakai sebagai contoh & penilai). */
async function pickItems(levelId: number, count: number): Promise<GateChar[]> {
  const level = await prisma.level.findUnique({ where: { id: levelId }, select: { code: true } });
  if (!level) throw Errors.notFound("Level");
  const rows =
    level.code === "PEMULA"
      ? []
      : await prisma.kanji.findMany({
          where: { chapter: { levelId, status: "published" } },
          select: { character: true, onyomi: true, kunyomi: true, meaningId: true },
        });
  const pool = rows.length ? kanjiPool(rows) : pickKana(count);
  const chosen: GateChar[] = [];
  // Ambil per kelompok supaya tidak menunggu satu per satu; KanjiVG di-cache di memori setelah pertama kali
  for (let i = 0; i < pool.length && chosen.length < count; i += count) {
    const batch = pool.slice(i, i + count);
    const strokes = await Promise.all(batch.map((c) => kanjiVgStrokes(c.char)));
    batch.forEach((c, k) => strokes[k] && chosen.length < count && chosen.push(c));
  }
  if (!chosen.length) throw Errors.conflict("Data goresan huruf belum bisa dimuat. Coba lagi sebentar lagi.");
  return chosen;
}

async function activeAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, userId, type: "workbook" } });
  if (!attempt) throw Errors.notFound("Percobaan");
  if (attempt.finishedAt) throw Errors.conflict("Percobaan ini sudah selesai dinilai.");
  return { attempt, details: attempt.details as unknown as WorkbookDetails };
}

const allChars = (d: WorkbookDetails) => d.sheets.flatMap((s) => s.chars);

/** Bentuk yang dikirim ke web: tanpa hasil per huruf yang belum selesai. */
function publicAttempt(id: string, d: WorkbookDetails, passScore: number) {
  return {
    attemptId: id,
    mode: d.mode,
    sheetType: d.mode === "kertas" ? (d.sheetType ?? "cetak") : null,
    /** Kisi gambar sendiri: ukuran yang harus digambar. */
    grid: d.sheetType === "gambar" ? { cols: DRAWN_COLS, rows: drawnRows(allChars(d).length) } : null,
    passScore,
    requiredWrites: REQUIRED_WRITES,
    sheets: d.sheets.map((s) => ({ ...s, done: !!d.sheetResults[s.index], tries: d.sheetResults[s.index]?.tries ?? 0 })),
    maxSheetTries: MAX_SHEET_TRIES,
  };
}

async function finishAttempt(attemptId: string, levelId: number, details: WorkbookDetails, results: GateCharResult[]) {
  const config = await workbookConfig(levelId);
  const { score, passed } = gradeGate(results, allChars(details).length, config.passScore);
  await prisma.examAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      passed,
      finishedAt: new Date(),
      sectionScores: { huruf: score } as Prisma.InputJsonValue,
      details: details as unknown as Prisma.InputJsonValue,
    },
  });
  const cooldownUntil = !passed && config.cooldownHours ? new Date(Date.now() + config.cooldownHours * 3_600_000).toISOString() : null;
  return { score, passed, passScore: config.passScore, results, cooldownUntil };
}

function notifyWorkbookPass(notifier: Notifier | undefined, userId: string, attemptId: string): Promise<unknown> {
  if (!notifier) return Promise.resolve();
  return notifier
    .notify(userId, {
      type: "exam",
      title: "Gerbang Tulis lulus!",
      body: "Tulisan tanganmu lolos. Lanjut ke materi berikutnya dan terus latih kanjimu.",
      url: "/beranda",
      dedupeKey: `exam:${attemptId}`,
    })
    .catch((err) => console.error("[notifications] gagal membuat notifikasi gerbang tulis", err instanceof Error ? err.message : err));
}

/** Satu kisi bisa berisi hiragana, katakana, dan kanji sekaligus: aksaranya disebut di petunjuk untuk penilai. */
function drawnCharInfo(c: GateChar) {
  const hint = c.script === "kanji" ? c.meaning : c.script;
  return { char: c.char, reading: (hint ? `${c.reading}, ${hint}` : c.reading).slice(0, 40) };
}

const canvasBody = z.object({
  chars: z
    .array(
      z.object({
        char: z.string().min(1).max(2),
        // Goresan dalam koordinat kanvas 0–1; dibatasi supaya badan permintaan tetap kecil
        strokes: z.array(z.array(z.tuple([z.number().min(-0.5).max(1.5), z.number().min(-0.5).max(1.5)])).max(400)).max(40),
      }),
    )
    .max(60),
});

export function workbookGateRoutes(geminiApiKey: string, activity: ActivityRecorder, notifier?: Notifier) {
  const r = Router();

  // GET /exam/workbook/status?levelId=N
  r.get("/status", asyncHandler(async (req, res) => {
    const user = learner(req);
    res.json(await status(user.id, levelIdOf(req.query.levelId)));
  }));

  // POST /exam/workbook/start { levelId, mode } — melanjutkan percobaan yang belum selesai bila jalurnya sama
  r.post("/start", asyncHandler(async (req, res) => {
    const user = learner(req);
    const body = parseBody(
      z.object({ levelId: z.number().int().min(1), mode: z.enum(["kertas", "kanvas"]), sheetType: z.enum(["cetak", "gambar"]).default("cetak") }),
      req.body,
    );
    const sheetType: SheetType | undefined = body.mode === "kertas" ? body.sheetType : undefined;
    const s = await status(user.id, body.levelId);
    if (s.passed) throw Errors.conflict("Kamu sudah lulus Gerbang Tulis level ini.");
    if (s.activeAttemptId) {
      const { attempt, details } = await activeAttempt(user.id, s.activeAttemptId);
      if (details.mode === body.mode && (details.sheetType ?? "cetak") === (sheetType ?? "cetak")) {
        return res.json(publicAttempt(attempt.id, details, s.config.passScore));
      }
      // Ganti jalur/jenis lembar: percobaan lama belum dinilai, jadi dibuang
      await prisma.examAttempt.delete({ where: { id: attempt.id } });
    } else if (!s.canTake) {
      throw Errors.forbidden(
        s.cooldownUntil ? "Tunggu masa jeda sebelum mencoba lagi." : `Selesaikan minimal ${s.config.minChapterCompletion}% bab level ini dulu.`,
      );
    }
    const items = await pickItems(body.levelId, s.config.questionCount);
    const details: WorkbookDetails = {
      mode: body.mode as GateMode,
      ...(sheetType ? { sheetType } : {}),
      sheets: sheetType === "gambar" ? drawnSheet(items) : splitSheets(items),
      sheetResults: {},
    };
    const attempt = await prisma.examAttempt.create({
      data: {
        userId: user.id,
        levelId: body.levelId,
        type: "workbook",
        score: 0,
        passed: false,
        startedAt: new Date(),
        details: details as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    res.json(publicAttempt(attempt.id, details, s.config.passScore));
  }));

  // POST /exam/workbook/:attemptId/sheet { index, image, corners } — jalur kertas, satu lembar per foto
  r.post("/:attemptId/sheet", asyncHandler(async (req, res) => {
    const user = learner(req);
    const body = parseBody(
      z.object({
        index: z.number().int().min(0),
        image: photoSchema,
        corners: cornersSchema,
        // Kisi gambar sendiri: letak garis yang diukur pemindai (0–1 di bingkai yang diluruskan)
        grid: z.object({ xs: z.array(z.number()).max(20), ys: z.array(z.number()).max(40) }).optional(),
      }),
      req.body,
    );
    const { attempt, details } = await activeAttempt(user.id, String(req.params.attemptId));
    if (details.mode !== "kertas") throw Errors.validation("Percobaan ini memakai jalur kanvas.");
    const sheet = details.sheets[body.index];
    if (!sheet) throw Errors.notFound("Lembar");
    const tries = details.sheetResults[sheet.index]?.tries ?? 0;
    if (tries >= MAX_SHEET_TRIES) throw Errors.forbidden(`Lembar ini sudah difoto ${MAX_SHEET_TRIES} kali.`);
    if (!geminiApiKey) {
      return res.status(503).json({ error: { code: "UNAVAILABLE", message: "Pemeriksaan tulisan belum tersedia di server ini. Pakai jalur kanvas." } });
    }
    takeCheckQuota(user.id);
    const [, mimeType, data] = DATA_URL.exec(body.image)!;
    const references = await Promise.all(sheet.chars.map((c) => kanjiVgStrokes(c.char)));
    const history = await issueHistory(user.id, sheet.chars.map((c) => c.char));
    const drawn = details.sheetType === "gambar";
    if (drawn && (!body.grid || !validDrawnLines(body.grid.xs, DRAWN_COLS) || !validDrawnLines(body.grid.ys, drawnRows(sheet.chars.length)))) {
      throw Errors.validation(`Kisi belum terbaca: pastikan kisimu ${DRAWN_COLS} kolom × ${drawnRows(sheet.chars.length)} baris dan seluruhnya terlihat di foto.`);
    }
    let result;
    try {
      result = drawn
        ? await checkDrawnGrid(geminiApiKey, { mimeType, data }, sheet.chars.map(drawnCharInfo), { corners: body.corners, xs: body.grid!.xs, ys: body.grid!.ys }, {
            references,
            weights: PAPER_WEIGHTS,
            requiredWrites: 1,
          }, { history })
        : await checkHandwriting(
        geminiApiKey,
        { mimeType, data },
        sheet.script,
        sheet.chars.map((c, i) => ({ char: c.char, reading: c.meaning ? `${c.reading}, ${c.meaning}`.slice(0, 40) : c.reading, strokes: references[i]?.length })),
        body.corners,
        { history, exam: { references, weights: PAPER_WEIGHTS, requiredWrites: REQUIRED_WRITES } },
      );
    } catch (err) {
      console.error("[workbook/sheet]", err instanceof Error ? err.message : err);
      return res.status(502).json({ error: { code: "CHECK_FAILED", message: "Miu-chan belum bisa membaca fotomu sekarang. Coba lagi sebentar lagi." } });
    }
    // Foto yang tidak terbaca tidak dihitung sebagai percobaan lembar
    if (result.photoOk) {
      await logIssues(user.id, result);
      details.sheetResults[sheet.index] = {
        tries: tries + 1,
        results: result.chars.map((c) => ({ char: c.char, score: c.score, status: paperStatus(c), notes: [c.nekoFeedback.headlineText, c.tip].filter(Boolean) })),
      };
      await prisma.examAttempt.update({ where: { id: attempt.id }, data: { details: details as unknown as Prisma.InputJsonValue } });
    }
    res.json({ check: result, sheet: publicAttempt(attempt.id, details, 0).sheets[sheet.index] });
  }));

  // POST /exam/workbook/:attemptId/finish — jalur kertas, setelah semua lembar difoto
  r.post("/:attemptId/finish", asyncHandler(async (req, res) => {
    const user = learner(req);
    const { attempt, details } = await activeAttempt(user.id, String(req.params.attemptId));
    if (details.mode !== "kertas") throw Errors.validation("Percobaan ini memakai jalur kanvas.");
    const missing = details.sheets.filter((s) => !details.sheetResults[s.index]);
    if (missing.length) throw Errors.validation(`Masih ada ${missing.length} lembar yang belum difoto.`);
    const results = details.sheets.flatMap((s) => details.sheetResults[s.index].results);
    const outcome = await finishAttempt(attempt.id, attempt.levelId, details, results);
    const progress = await activity.record(user.id, "workbook_gate", outcome.passed ? XP_REWARD.gatePassed : XP_REWARD.gateTried);
    if (outcome.passed) await notifyWorkbookPass(notifier, user.id, attempt.id);
    res.json({ ...outcome, progress });
  }));

  // POST /exam/workbook/:attemptId/canvas { chars: [{ char, strokes }] } — jalur kanvas, dinilai & selesai sekaligus
  r.post("/:attemptId/canvas", asyncHandler(async (req, res) => {
    const user = learner(req);
    const body = parseBody(canvasBody, req.body);
    const { attempt, details } = await activeAttempt(user.id, String(req.params.attemptId));
    if (details.mode !== "kanvas") throw Errors.validation("Percobaan ini memakai jalur kertas.");
    const written = new Map(body.chars.map((c) => [c.char, c.strokes as Pt[][]]));
    const items = allChars(details);
    const refs = await Promise.all(items.map((c) => kanjiVgStrokes(c.char)));
    if (refs.some((x) => !x)) throw Errors.conflict("Data goresan huruf belum bisa dimuat. Coba kirim lagi sebentar lagi.");
    const results: (GateCharResult & { dims?: unknown; strokes?: unknown })[] = items.map((c, i) => {
      const r = scoreCanvasChar(written.get(c.char) ?? [], refs[i]!);
      return { char: c.char, score: r.score, status: r.status, notes: r.notes, dims: r.dims, strokes: r.strokes };
    });
    details.canvasResults = results;
    const outcome = await finishAttempt(attempt.id, attempt.levelId, details, results);
    const progress = await activity.record(user.id, "workbook_gate", outcome.passed ? XP_REWARD.gatePassed : XP_REWARD.gateTried);
    if (outcome.passed) await notifyWorkbookPass(notifier, user.id, attempt.id);
    res.json({ ...outcome, progress });
  }));

  return r;
}
