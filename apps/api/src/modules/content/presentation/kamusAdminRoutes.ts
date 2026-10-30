import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { Errors } from "../../../shared/domain/errors";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";
import { syncKamusFromChapters } from "../infrastructure/kamusSync";
import { IMAGE_URL_PATTERN } from "./contentAdminRoutes";
import { KAMUS_TYPES } from "./kamusRoutes";

/**
 * Pengelolaan kamus oleh admin & super admin (dipasang di /api/admin/kamus, sudah melewati requireRole("admin")).
 * Perubahan langsung berlaku; entri draft tidak tampil ke siswa.
 */

const PAGE_SIZE = 30;
const opt = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .regex(IMAGE_URL_PATTERN, "Alamat gambar tidak valid.")
  .nullish()
  .or(z.literal(""))
  .transform((v) => v || null);

const entrySchema = z.object({
  type: z.enum(KAMUS_TYPES),
  levelId: z.number().int().min(1),
  categoryId: z.string().uuid().nullish().or(z.literal("")).transform((v) => v || null),
  term: z.string().trim().min(1, "Isi kata/karakter/pola.").max(100),
  reading: opt(150),
  romaji: opt(150),
  meaning: z.string().trim().min(1, "Arti wajib diisi.").max(500),
  onyomi: opt(100),
  kunyomi: opt(100),
  explanation: opt(5000),
  note: opt(500),
  exampleSentence: opt(500),
  exampleTranslation: opt(500),
  imageUrl,
  status: z.enum(["published", "draft"]).default("published"),
  sortOrder: z.number().int().min(0).max(100000).default(0),
});
type EntryInput = z.infer<typeof entrySchema>;

/** Aturan isi per jenis kamus; mengembalikan pesan kesalahan atau null. */
async function entryProblem(e: EntryInput): Promise<string | null> {
  if (e.type === "kanji" && [...e.term].length !== 1) return "Entri kanji berisi tepat satu karakter.";
  if (e.type === "gambar" && !e.imageUrl) return "Entri kamus bergambar wajib punya gambar.";
  if (e.type === "gambar" && !e.categoryId) return "Pilih kategori untuk entri bergambar.";
  if (e.categoryId) {
    const cat = await prisma.dictionaryCategory.findUnique({ where: { id: e.categoryId }, select: { type: true } });
    if (!cat) return "Kategori tidak ditemukan.";
    if (cat.type !== e.type) return "Kategori tidak cocok dengan jenis kamus.";
  }
  if (!(await prisma.level.findUnique({ where: { id: e.levelId }, select: { id: true } }))) return "Level tidak valid.";
  return null;
}

const categorySchema = z.object({
  type: z.enum(["gambar", "ungkapan"]),
  key: z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, "Kunci hanya huruf kecil, angka, - atau _."),
  title: z.string().trim().min(1).max(80),
  titleJa: opt(40),
  titleKana: opt(60),
  coverUrl: imageUrl,
  tint: z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Warna harus kode hex, mis. #fff3dc.").nullish().or(z.literal("")).transform((v) => v || null),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

const listQuery = z.object({
  type: z.enum(KAMUS_TYPES).default("kosakata"),
  levelId: z.coerce.number().int().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(["published", "draft"]).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

const adminSelect = {
  id: true,
  type: true,
  levelId: true,
  categoryId: true,
  term: true,
  reading: true,
  romaji: true,
  meaning: true,
  onyomi: true,
  kunyomi: true,
  explanation: true,
  note: true,
  exampleSentence: true,
  exampleTranslation: true,
  imageUrl: true,
  status: true,
  sortOrder: true,
  sourceKey: true,
  updatedAt: true,
  level: { select: { code: true } },
  category: { select: { title: true } },
} as const satisfies Prisma.DictionaryEntrySelect;

export function kamusAdminRoutes() {
  const r = Router();

  // ── Ringkasan per jenis ──
  r.get("/summary", asyncHandler(async (_req, res) => {
    const groups = await prisma.dictionaryEntry.groupBy({ by: ["type", "status"], _count: { _all: true } });
    const summary = Object.fromEntries(
      KAMUS_TYPES.map((t) => [
        t,
        {
          published: groups.find((g) => g.type === t && g.status === "published")?._count._all ?? 0,
          draft: groups.find((g) => g.type === t && g.status === "draft")?._count._all ?? 0,
        },
      ]),
    );
    res.json({ summary });
  }));

  // ── Entri ──
  r.get("/entries", asyncHandler(async (req, res) => {
    const q = parseBody(listQuery, req.query);
    const where: Prisma.DictionaryEntryWhereInput = {
      type: q.type,
      ...(q.levelId ? { levelId: q.levelId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.q
        ? {
            OR: (["term", "reading", "romaji", "meaning", "onyomi", "kunyomi"] as const).map((f) => ({ [f]: { contains: q.q, mode: "insensitive" as const } })),
          }
        : {}),
    };
    const [entries, total] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where,
        orderBy: [{ level: { sortOrder: "asc" } }, { sortOrder: "asc" }, { term: "asc" }],
        skip: (q.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: adminSelect,
      }),
      prisma.dictionaryEntry.count({ where }),
    ]);
    res.json({ entries, total, page: q.page, pageSize: PAGE_SIZE });
  }));

  r.post("/entries", asyncHandler(async (req, res) => {
    const data = parseBody(entrySchema, req.body);
    const problem = await entryProblem(data);
    if (problem) throw Errors.validation(problem);
    const entry = await prisma.dictionaryEntry.create({ data, select: adminSelect });
    res.status(201).json({ entry });
  }));

  r.patch("/entries/:id", asyncHandler(async (req, res) => {
    const current = await prisma.dictionaryEntry.findUnique({ where: { id: req.params.id } });
    if (!current) throw Errors.notFound("Entri kamus");
    const { id: _id, sourceKey: _s, createdAt: _c, updatedAt: _u, ...rest } = current;
    const data = parseBody(entrySchema, { ...rest, ...(req.body ?? {}) });
    const problem = await entryProblem(data);
    if (problem) throw Errors.validation(problem);
    const entry = await prisma.dictionaryEntry.update({ where: { id: req.params.id }, data, select: adminSelect });
    res.json({ entry });
  }));

  r.delete("/entries/:id", asyncHandler(async (req, res) => {
    await prisma.dictionaryEntry.delete({ where: { id: req.params.id } }).catch(() => {
      throw Errors.notFound("Entri kamus");
    });
    res.status(204).end();
  }));

  // Tarik kosakata/kanji/tata bahasa baru dari materi bab
  r.post("/sync", asyncHandler(async (_req, res) => {
    res.json({ added: await syncKamusFromChapters(prisma) });
  }));

  // ── Kategori ──
  r.get("/categories", asyncHandler(async (req, res) => {
    const { type } = parseBody(z.object({ type: z.enum(["gambar", "ungkapan"]).optional() }), req.query);
    const categories = await prisma.dictionaryCategory.findMany({
      where: type ? { type } : {},
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
      include: { _count: { select: { entries: true } } },
    });
    res.json({ categories });
  }));

  r.post("/categories", asyncHandler(async (req, res) => {
    const data = parseBody(categorySchema, req.body);
    const exists = await prisma.dictionaryCategory.findUnique({ where: { type_key: { type: data.type, key: data.key } } });
    if (exists) throw Errors.conflict("Kunci kategori sudah dipakai.");
    const category = await prisma.dictionaryCategory.create({ data });
    res.status(201).json({ category });
  }));

  r.patch("/categories/:id", asyncHandler(async (req, res) => {
    const current = await prisma.dictionaryCategory.findUnique({ where: { id: req.params.id } });
    if (!current) throw Errors.notFound("Kategori");
    const { id: _id, ...rest } = current;
    // Jenis kategori tidak bisa diubah karena entrinya terikat pada jenis itu
    const data = parseBody(categorySchema, { ...rest, ...(req.body ?? {}), type: current.type });
    if (data.key !== current.key) {
      const clash = await prisma.dictionaryCategory.findUnique({ where: { type_key: { type: data.type, key: data.key } } });
      if (clash) throw Errors.conflict("Kunci kategori sudah dipakai.");
    }
    const category = await prisma.dictionaryCategory.update({ where: { id: req.params.id }, data });
    res.json({ category });
  }));

  r.delete("/categories/:id", asyncHandler(async (req, res) => {
    const count = await prisma.dictionaryEntry.count({ where: { categoryId: req.params.id } });
    if (count > 0) throw Errors.conflict(`Kategori masih berisi ${count} entri. Pindahkan atau hapus entrinya dulu.`);
    await prisma.dictionaryCategory.delete({ where: { id: req.params.id } }).catch(() => {
      throw Errors.notFound("Kategori");
    });
    res.status(204).end();
  }));

  return r;
}
