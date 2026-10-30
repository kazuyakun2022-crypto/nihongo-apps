import type { Prisma } from "@prisma/client";
import type { Db } from "../../../shared/infrastructure/prisma";

/** Bab yang isinya boleh masuk kamus: terbit, atau bab dataset (tetap terkurasi walau disembunyikan dari jalur belajar). */
const SOURCE_CHAPTERS: Prisma.ChapterWhereInput = { OR: [{ status: "published" }, { sourceKey: { not: null } }] };

export interface KamusSyncResult {
  kosakata: number;
  kanji: number;
  tata_bahasa: number;
}

/**
 * Menambahkan kosakata, kanji, dan pola tata bahasa dari materi bab ke kamus.
 * Hanya entri baru yang ditambahkan (berdasarkan sourceKey); entri yang sudah diubah admin tidak disentuh.
 * Level entri = level terendah tempat materi itu muncul.
 */
export async function syncKamusFromChapters(db: Db): Promise<KamusSyncResult> {
  const chapterSelect = { chapter: { select: { levelId: true } } } as const;
  const [levels, vocab, kanji, grammar] = await Promise.all([
    db.level.findMany({ select: { id: true, sortOrder: true } }),
    db.vocabulary.findMany({
      // Kartu latihan huruf di bab kana ("Dibaca …") bukan kosakata
      where: { chapter: SOURCE_CHAPTERS, NOT: { meaningId: { startsWith: "Dibaca " } } },
      select: { word: true, reading: true, meaningId: true, exampleSentence: true, exampleTranslation: true, imageUrl: true, ...chapterSelect },
    }),
    db.kanji.findMany({ where: { chapter: SOURCE_CHAPTERS }, select: { character: true, onyomi: true, kunyomi: true, meaningId: true, ...chapterSelect } }),
    db.grammarPoint.findMany({
      where: { chapter: SOURCE_CHAPTERS },
      select: { pattern: true, explanation: true, exampleSentence: true, exampleTranslation: true, imageUrl: true, ...chapterSelect },
    }),
  ]);

  const order = new Map(levels.map((l) => [l.id, l.sortOrder]));
  /** Satu entri per kunci, diambil dari level terendah. */
  function lowest<T extends { chapter: { levelId: number } }>(rows: T[], key: (r: T) => string) {
    const best = new Map<string, T>();
    for (const r of rows) {
      const k = key(r);
      const cur = best.get(k);
      if (!cur || (order.get(r.chapter.levelId) ?? 0) < (order.get(cur.chapter.levelId) ?? 0)) best.set(k, r);
    }
    return best;
  }
  // Contoh kalimat boleh diambil dari kemunculan mana pun yang punya
  const vocabExample = new Map<string, (typeof vocab)[number]>();
  for (const r of vocab) if (r.exampleSentence && !vocabExample.has(`${r.word}|${r.reading}`)) vocabExample.set(`${r.word}|${r.reading}`, r);

  const data: Prisma.DictionaryEntryCreateManyInput[] = [];
  for (const [k, v] of lowest(vocab, (r) => `${r.word}|${r.reading}`)) {
    const example = v.exampleSentence ? v : vocabExample.get(k);
    data.push({
      type: "kosakata",
      levelId: v.chapter.levelId,
      term: v.word.slice(0, 100),
      reading: v.reading,
      meaning: v.meaningId,
      exampleSentence: example?.exampleSentence ?? null,
      exampleTranslation: example?.exampleTranslation ?? null,
      imageUrl: v.imageUrl,
      sourceKey: `bab:vocab:${k}`.slice(0, 200),
    });
  }
  for (const [k, v] of lowest(kanji, (r) => r.character)) {
    data.push({ type: "kanji", levelId: v.chapter.levelId, term: v.character, meaning: v.meaningId, onyomi: v.onyomi, kunyomi: v.kunyomi, sourceKey: `bab:kanji:${k}` });
  }
  for (const [k, g] of lowest(grammar, (r) => r.pattern)) {
    data.push({
      type: "tata_bahasa",
      levelId: g.chapter.levelId,
      term: g.pattern,
      meaning: g.explanation.split(/(?<=[.。])\s/)[0].slice(0, 500),
      explanation: g.explanation,
      exampleSentence: g.exampleSentence,
      exampleTranslation: g.exampleTranslation,
      imageUrl: g.imageUrl,
      sourceKey: `bab:grammar:${k}`.slice(0, 200),
    });
  }

  const existing = new Set(
    (await db.dictionaryEntry.findMany({ where: { sourceKey: { startsWith: "bab:" } }, select: { sourceKey: true } })).map((e) => e.sourceKey),
  );
  const fresh = data.filter((d) => !existing.has(d.sourceKey ?? null));
  for (let i = 0; i < fresh.length; i += 1000) {
    await db.dictionaryEntry.createMany({ data: fresh.slice(i, i + 1000), skipDuplicates: true });
  }
  const count = (type: string) => fresh.filter((d) => d.type === type).length;
  return { kosakata: count("kosakata"), kanji: count("kanji"), tata_bahasa: count("tata_bahasa") };
}
