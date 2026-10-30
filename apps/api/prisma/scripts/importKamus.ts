/**
 * Mengisi kamus (dictionary_entries & dictionary_categories) dari data awal:
 * - Kamus bergambar: kamusGambarData.ts (22 kategori, gambar di web/public/images/kamus)
 * - Ungkapan & sebutan: kamusUngkapanData.ts
 * - Kosakata, kanji, tata bahasa: materi bab (sama seperti tombol "Ambil dari materi bab" di admin)
 *
 * Aman dijalankan ulang: entri/kategori yang sudah ada (sourceKey / key) dilewati, jadi hasil edit admin aman.
 * Jalankan dari apps/api: npm run content:kamus
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { syncKamusFromChapters } from "../../src/modules/content/infrastructure/kamusSync";
import { KAMUS_CATEGORIES, iconSrc } from "./kamusGambarData";
import { UNGKAPAN, UNGKAPAN_CATEGORIES } from "./kamusUngkapanData";

const db = new PrismaClient();

async function upsertCategory(type: "gambar" | "ungkapan", key: string, data: { title: string; titleJa?: string; titleKana?: string; coverUrl?: string; tint?: string; sortOrder: number }) {
  return db.dictionaryCategory.upsert({
    where: { type_key: { type, key } },
    create: { type, key, ...data },
    update: {},
    select: { id: true },
  });
}

async function main() {
  const levels = await db.level.findMany();
  const levelId = (code: string) => {
    const l = levels.find((x) => x.code === code);
    if (!l) throw new Error(`Level ${code} belum ada; jalankan seed lebih dulu.`);
    return l.id;
  };
  const lowest = [...levels].sort((a, b) => a.sortOrder - b.sortOrder)[0];

  // Kamus bergambar: benda sehari-hari, terbuka untuk semua level
  let gambar = 0;
  for (const [ci, c] of KAMUS_CATEGORIES.entries()) {
    const cat = await upsertCategory("gambar", c.id, { title: c.title, titleJa: c.titleJa, titleKana: c.titleKana, coverUrl: iconSrc(c.cover), tint: c.tint, sortOrder: ci + 1 });
    const res = await db.dictionaryEntry.createMany({
      data: c.items.map((item, i) => ({
        type: "gambar",
        levelId: lowest.id,
        categoryId: cat.id,
        term: item.ja,
        reading: item.kana,
        romaji: item.romaji,
        meaning: item.arti,
        imageUrl: iconSrc(item.icon),
        sortOrder: i + 1,
        sourceKey: `gambar:${c.id}:${item.ja}:${item.icon}`.slice(0, 200),
      })),
      skipDuplicates: true,
    });
    gambar += res.count;
  }

  let ungkapan = 0;
  const catIds = new Map<string, string>();
  for (const [i, c] of UNGKAPAN_CATEGORIES.entries()) {
    catIds.set(c.key, (await upsertCategory("ungkapan", c.key, { title: c.label, sortOrder: i + 1 })).id);
  }
  const res = await db.dictionaryEntry.createMany({
    data: UNGKAPAN.map((u, i) => ({
      type: "ungkapan",
      levelId: levelId(u.level),
      categoryId: catIds.get(u.kategori) ?? null,
      term: u.ja,
      reading: u.kana,
      romaji: u.romaji,
      meaning: u.arti,
      note: u.catatan,
      sortOrder: i + 1,
      sourceKey: `ungkapan:${u.kategori}:${u.ja}`.slice(0, 200),
    })),
    skipDuplicates: true,
  });
  ungkapan = res.count;

  const bab = await syncKamusFromChapters(db);
  console.log(`Kamus terisi. Baru — bergambar: ${gambar}, ungkapan: ${ungkapan}, kosakata: ${bab.kosakata}, kanji: ${bab.kanji}, tata bahasa: ${bab.tata_bahasa}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
