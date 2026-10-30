import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import { prisma } from "../../../shared/infrastructure/prisma";

const PAGE_SIZE = 40;

export const KAMUS_TYPES = ["gambar", "kosakata", "kanji", "tata_bahasa", "ungkapan"] as const;

const querySchema = z.object({
  tab: z.enum(["kosakata", "kanji", "tata_bahasa", "ungkapan"]).default("kosakata"),
  q: z.string().trim().max(60).optional(),
  level: z.string().trim().max(10).optional(),
  kategori: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

/** Kolom yang dikirim ke siswa. */
export const entrySelect = {
  id: true,
  type: true,
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
  level: { select: { code: true } },
  category: { select: { key: true, title: true } },
} as const satisfies Prisma.DictionaryEntrySelect;

type EntryRow = Prisma.DictionaryEntryGetPayload<{ select: typeof entrySelect }>;
const toItem = ({ level, ...e }: EntryRow) => ({ ...e, level: level.code });

/**
 * Batas level yang boleh dilihat: level siswa saat ini (atau level tujuan tes penempatan).
 * Admin & pengajar melihat semuanya; siswa baru mulai dari level terendah.
 */
async function levelCeiling(userId: string, role: string): Promise<number> {
  if (role !== "student" && role !== "premium" && role !== "guest") return 32767; // batas SMALLINT sort_order
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentLevel: { select: { sortOrder: true } }, pendingLevel: { select: { sortOrder: true } } },
  });
  const orders = [user?.currentLevel?.sortOrder, user?.pendingLevel?.sortOrder].filter((n): n is number => n != null);
  return orders.length ? Math.max(...orders) : 1;
}

/** Kamus untuk siswa (isi dikelola admin di /api/admin/kamus). */
export function kamusRoutes() {
  const r = Router();

  // Kamus bergambar: semua kategori beserta entrinya, terbuka untuk semua level
  r.get("/gambar", asyncHandler(async (_req, res) => {
    const categories = await prisma.dictionaryCategory.findMany({
      where: { type: "gambar" },
      orderBy: { sortOrder: "asc" },
      select: {
        key: true,
        title: true,
        titleJa: true,
        titleKana: true,
        coverUrl: true,
        tint: true,
        entries: {
          where: { status: "published" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true, term: true, reading: true, romaji: true, meaning: true, imageUrl: true },
        },
      },
    });
    res.json({ categories: categories.filter((c) => c.entries.length > 0) });
  }));

  r.get("/", asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const q = parseBody(querySchema, req.query);
    const [levels, ceiling] = await Promise.all([
      prisma.level.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true, sortOrder: true } }),
      levelCeiling(user.id, user.role),
    ]);
    const unlocked = levels.filter((l) => l.sortOrder <= ceiling);
    const nextLevel = levels.find((l) => l.sortOrder > ceiling) ?? null;
    // Filter level hanya boleh menyempit ke level yang sudah terbuka
    const chosen = q.level ? unlocked.find((l) => l.code === q.level) : undefined;

    const fields: Record<typeof q.tab, (keyof Prisma.DictionaryEntryWhereInput)[]> = {
      kosakata: ["term", "reading", "romaji", "meaning"],
      kanji: ["term", "onyomi", "kunyomi", "meaning"],
      tata_bahasa: ["term", "meaning", "explanation", "exampleSentence"],
      ungkapan: ["term", "reading", "romaji", "meaning"],
    };
    const base: Prisma.DictionaryEntryWhereInput = {
      type: q.tab,
      status: "published",
      ...(q.kategori ? { category: { key: q.kategori } } : {}),
      ...(q.q ? { OR: fields[q.tab].map((f) => ({ [f]: { contains: q.q, mode: "insensitive" as const } })) } : {}),
    };
    const where = (open: boolean): Prisma.DictionaryEntryWhereInput => ({
      ...base,
      level: chosen ? { id: chosen.id } : { sortOrder: open ? { lte: ceiling } : { gt: ceiling } },
    });

    const [rows, total, lockedCount, categories] = await Promise.all([
      prisma.dictionaryEntry.findMany({
        where: where(true),
        orderBy: [{ level: { sortOrder: "asc" } }, { sortOrder: "asc" }, { reading: "asc" }, { term: "asc" }],
        skip: (q.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: entrySelect,
      }),
      prisma.dictionaryEntry.count({ where: where(true) }),
      chosen ? Promise.resolve(0) : prisma.dictionaryEntry.count({ where: where(false) }),
      q.tab === "ungkapan"
        ? prisma.dictionaryCategory.findMany({
            where: { type: "ungkapan", entries: { some: { status: "published", level: { sortOrder: { lte: ceiling } } } } },
            orderBy: { sortOrder: "asc" },
            select: { key: true, title: true },
          })
        : Promise.resolve(undefined),
    ]);

    res.json({
      items: rows.map(toItem),
      total,
      lockedCount,
      page: q.page,
      pageSize: PAGE_SIZE,
      unlockedLevels: unlocked.map(({ code, name }) => ({ code, name })),
      nextLevel: nextLevel ? { code: nextLevel.code, name: nextLevel.name } : null,
      categories: categories?.map((c) => ({ key: c.key, label: c.title })),
    });
  }));

  return r;
}
