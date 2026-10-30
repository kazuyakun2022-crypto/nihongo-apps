/**
 * Mengimpor kurikulum utama (docs/kurikulum.md) dari kurikulumData.ts ke database.
 *
 * - Bab kurikulum diberi sourceKey "kurikulum:<level>:<urutan>" dan menjadi jalur utama di awal tiap level.
 * - Bab lain di level yang sama yang masih terbit dijadikan draft (tidak dihapus), supaya admin bisa memutuskan
 *   sendiri mana yang diterbitkan lagi. Bab dataset tetap menjadi sumber kamus walau draft.
 * - Aman dijalankan ulang: bab yang sudah ada tidak ditimpa (hasil edit admin aman). Pakai --force untuk menulis
 *   ulang isi bab kurikulum, dan --keep-old untuk tidak menyembunyikan bab lain.
 *
 * Jalankan dari apps/api: npm run content:kurikulum [-- --force] [-- --keep-old]
 */
import "dotenv/config";
import { PrismaClient, type QuizType } from "@prisma/client";
import { exerciseProblem, type ExerciseType } from "../../src/modules/learning/domain/Exercise";
import { KURIKULUM, type KChapter, type KQuiz, type KScenario } from "./kurikulumData";
import { N1_AI, N1_LEVEL_UP, N1_SCENARIOS } from "./kurikulumN1";
import { N2_AI, N2_LEVEL_UP, N2_SCENARIOS } from "./kurikulumN2";
import { N3_AI, N3_LEVEL_UP, N3_SCENARIOS } from "./kurikulumN3";
import { N4_AI, N4_LEVEL_UP, N4_SCENARIOS } from "./kurikulumN4";
import { N5_AI, N5_LEVEL_UP, N5_SCENARIOS } from "./kurikulumN5";
import { PRE_N5_AI } from "./kurikulumPreN5";

const db = new PrismaClient();
const FORCE = process.argv.includes("--force");
const KEEP_OLD = process.argv.includes("--keep-old");
const TTS = "/api/tts?text=";

interface QuizRow {
  type: QuizType;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string | null;
  explanation: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

function toQuizRow(q: KQuiz): QuizRow {
  const base = { hint: null, explanation: null, audioUrl: null, imageUrl: null };
  switch (q.type) {
    case "pilihan_ganda":
      return { ...base, type: q.type, question: q.question, options: q.options, correctAnswer: q.answer, hint: q.hint ?? null, explanation: q.explanation ?? null, imageUrl: q.image ?? null };
    case "mendengar":
      return { ...base, type: q.type, question: q.question, options: q.options, correctAnswer: q.answer, explanation: q.explanation ?? null, audioUrl: TTS + encodeURIComponent(q.audio) };
    case "susun_kalimat":
      return { ...base, type: q.type, question: q.question, options: [...q.pieces, ...(q.extras ?? [])], correctAnswer: q.pieces.join(""), explanation: q.explanation ?? null };
    case "susun_huruf":
      return { ...base, type: q.type, question: q.question, options: [...q.pieces, ...(q.extras ?? [])], correctAnswer: q.pieces.join(""), hint: q.hint ?? null, imageUrl: q.image ?? null };
    case "menulis":
      return { ...base, type: q.type, question: q.question, options: [], correctAnswer: q.answer, hint: q.hint ?? null, imageUrl: q.image ?? null };
    case "berbicara":
      return { ...base, type: q.type, question: q.question ?? "Ucapkan kalimat berikut dengan jelas.", options: q.accept ?? [], correctAnswer: q.answer, hint: q.hint ?? null };
  }
}

/** Semua soal dicek dulu dengan aturan editor admin; satu kesalahan membatalkan seluruh impor. */
function validate(chapters: KChapter[]) {
  const problems: string[] = [];
  for (const ch of chapters) {
    const kanji = ch.kanji.map((k) => k[0]);
    ch.quiz.forEach((q, i) => {
      const row = toQuizRow(q);
      const problem = exerciseProblem({ type: row.type as ExerciseType, options: row.options, correctAnswer: row.correctAnswer }, kanji);
      if (problem) problems.push(`[${ch.level}] ${ch.title} · soal ${i + 1} (${row.type}): ${problem}`);
    });
  }
  if (problems.length) throw new Error(`Soal kurikulum tidak valid:\n- ${problems.join("\n- ")}`);
}

function chapterData(ch: KChapter) {
  return {
    title: ch.title,
    explanation: ch.explanation,
    moduleTitle: ch.module,
    passScore: ch.passScore ?? null,
    lessonBlocks: {
      create: ch.blocks.map((b, i) => ({ type: b.type, title: b.title ?? null, body: b.body ?? null, imageUrl: b.image ?? null, caption: b.caption ?? null, sortOrder: i + 1 })),
    },
    vocabularies: {
      create: ch.vocab.map(([word, reading, meaningId, exampleSentence, exampleTranslation]) => ({
        word,
        reading,
        meaningId,
        exampleSentence: exampleSentence ?? null,
        exampleTranslation: exampleTranslation ?? null,
      })),
    },
    kanji: {
      create: ch.kanji.map(([character, onyomi, kunyomi, meaningId]) => ({ character, onyomi: onyomi || null, kunyomi: kunyomi || null, meaningId })),
    },
    grammarPoints: {
      create: ch.grammar.map((g) => ({ pattern: g.pattern, explanation: g.explanation, exampleSentence: g.ex, exampleTranslation: g.tr })),
    },
    quizQuestions: { create: ch.quiz.map(toQuizRow) },
  };
}

/** Konfigurasi AI per level dari spesifikasi, beserta prompt bawaan seed lama yang boleh ditimpa. */
const LEVEL_AI = [
  { code: "PEMULA", config: PRE_N5_AI, oldPrompt: "Pakai kosakata sangat dasar, kalimat 3–5 kata, bentuk です/ます." },
  { code: "N5", config: N5_AI, oldPrompt: "Pakai kosakata dan pola tata bahasa N5 saja, bentuk sopan です/ます." },
  { code: "N4", config: N4_AI, oldPrompt: "Pakai kosakata N5–N4. Boleh bentuk kasual sederhana jika pengguna memakainya." },
  { code: "N3", config: N3_AI, oldPrompt: "Pakai kosakata sampai N3, campuran sopan dan kasual." },
  { code: "N2", config: N2_AI, oldPrompt: "Bahasa alami tingkat N2, termasuk keigo dasar dan topik abstrak." },
  { code: "N1", config: N1_AI, oldPrompt: "Bahasa alami seperti penutur asli, termasuk keigo dan ungkapan idiomatis." },
];

/** Prompt yang sudah diubah admin tidak ditimpa, kecuali dengan --force. */
async function applyLevelAi(levelId: (code: string) => number) {
  for (const { code, config, oldPrompt } of LEVEL_AI) {
    const id = levelId(code);
    const current = await db.aiLevelPrompt.findUnique({ where: { levelId: id } });
    if (current && current.systemPrompt !== oldPrompt && current.systemPrompt !== config.systemPrompt && !FORCE) {
      console.log(`Prompt AI ${code} sudah diubah admin; tidak ditimpa (pakai --force untuk menerapkan spesifikasi).`);
      continue;
    }
    await db.aiLevelPrompt.upsert({ where: { levelId: id }, create: { levelId: id, ...config }, update: config });
    console.log(`Prompt AI ${code} diterapkan sesuai spesifikasi.`);
  }
}

/** Skenario dibuat bila belum ada (berdasarkan sourceKey); --force menulis ulang isinya. */
async function importScenarios(list: KScenario[], levelId: (code: string) => number) {
  let created = 0;
  let updated = 0;
  for (const [i, sc] of list.entries()) {
    const chapter = sc.chapterKey ? await db.chapter.findUnique({ where: { sourceKey: sc.chapterKey }, select: { id: true } }) : null;
    const data = {
      levelId: levelId(sc.level),
      chapterId: chapter?.id ?? null,
      title: sc.title,
      goal: sc.goal,
      mascotRole: sc.mascotRole,
      initialMessage: sc.initialMessage,
      targetGrammar: sc.targetGrammar,
      maxTurns: sc.maxTurns ?? 20,
      sortOrder: i + 1,
    };
    const existing = await db.scenario.findUnique({ where: { sourceKey: sc.key }, select: { id: true } });
    if (!existing) {
      await db.scenario.create({ data: { ...data, sourceKey: sc.key, status: "published" } });
      created++;
    } else if (FORCE) {
      await db.scenario.update({ where: { id: existing.id }, data });
      updated++;
    }
  }
  // Skenario contoh dari seed lama sudah digantikan versi kurikulum
  const legacy = await db.scenario.updateMany({ where: { sourceKey: null, title: "Belanja di konbini", status: "published" }, data: { status: "draft" } });
  console.log(`Skenario: ${created} baru, ${updated} ditulis ulang${legacy.count ? `, ${legacy.count} skenario contoh lama disembunyikan` : ""}.`);
}

/** Aturan tes naik tahap dari spesifikasi; konfigurasi yang sudah diubah admin dari bawaan seed tidak ditimpa. */
async function applyLevelGate(code: string, levelId: number, gate: typeof N5_LEVEL_UP) {
  const current = await db.levelExam.findUnique({ where: { levelId_type: { levelId, type: "level_up" } } });
  const isSeedDefault = !current || (current.questionCount === 30 && current.timeLimitMin === 25 && current.passScore === 75 && current.sectionMinScore === 60 && !current.sectionRules);
  const alreadyApplied =
    !!current &&
    current.questionCount === gate.questionCount &&
    current.timeLimitMin === gate.timeLimitMin &&
    current.passScore === gate.passScore &&
    Object.entries(gate.sectionRules).every(([sec, r]) => {
      // JSONB menyimpan key dengan urutan sendiri, jadi bandingkan per bagian
      const saved = (current.sectionRules as Record<string, { count?: number; minScore?: number }> | null)?.[sec];
      return saved?.count === r.count && saved?.minScore === r.minScore;
    });
  if (alreadyApplied && !FORCE) {
    console.log(`Tes naik tahap ${code} sudah sesuai spesifikasi.`);
    return;
  }
  if (!isSeedDefault && !FORCE) {
    console.log(`Aturan tes naik tahap ${code} sudah diubah admin; tidak ditimpa (pakai --force).`);
    return;
  }
  await db.levelExam.upsert({
    where: { levelId_type: { levelId, type: "level_up" } },
    create: { levelId, type: "level_up", ...gate },
    update: gate,
  });
  const parts = Object.values(gate.sectionRules).map((r) => r.count).join("·");
  console.log(`Tes naik tahap ${code}: ${gate.questionCount} soal / ${gate.timeLimitMin} menit, per bagian ${parts}, lulus total ${gate.passScore}.`);
}

async function main() {
  validate(KURIKULUM);
  const levels = await db.level.findMany();
  const levelId = (code: string) => {
    const level = levels.find((l) => l.code === code);
    if (!level) throw new Error(`Level ${code} belum ada; jalankan seed lebih dulu.`);
    return level.id;
  };

  const byLevel = new Map<string, KChapter[]>();
  for (const ch of KURIKULUM) byLevel.set(ch.level, [...(byLevel.get(ch.level) ?? []), ch]);

  let created = 0;
  let rewritten = 0;
  let kept = 0;
  let hidden = 0;
  const now = new Date();

  for (const [code, chapters] of byLevel) {
    const lid = levelId(code);
    const keys: string[] = [];
    for (const [i, ch] of chapters.entries()) {
      const sourceKey = ch.key ?? `kurikulum:${code.toLowerCase()}:${i + 1}`;
      keys.push(sourceKey);
      const existing = await db.chapter.findUnique({ where: { sourceKey }, select: { id: true } });
      if (!existing) {
        await db.chapter.create({ data: { ...chapterData(ch), levelId: lid, sourceKey, sortOrder: i + 1, status: "published", publishedAt: now } });
        created++;
      } else if (FORCE) {
        // Tulis ulang isi; progres siswa (user_chapter_progress) tetap karena bab tidak dihapus
        await db.$transaction([
          db.lessonBlock.deleteMany({ where: { chapterId: existing.id } }),
          db.vocabulary.deleteMany({ where: { chapterId: existing.id } }),
          db.kanji.deleteMany({ where: { chapterId: existing.id } }),
          db.grammarPoint.deleteMany({ where: { chapterId: existing.id } }),
          db.quizQuestion.deleteMany({ where: { chapterId: existing.id } }),
          db.chapter.update({ where: { id: existing.id }, data: { ...chapterData(ch), levelId: lid, sortOrder: i + 1 } }),
        ]);
        rewritten++;
      } else {
        await db.chapter.update({ where: { id: existing.id }, data: { sortOrder: i + 1 } });
        kept++;
      }
    }

    // Bab lain di level ini diletakkan setelah kurikulum utama; yang masih terbit disembunyikan
    const others = await db.chapter.findMany({
      where: { levelId: lid, OR: [{ sourceKey: null }, { sourceKey: { notIn: keys } }] },
      orderBy: { sortOrder: "asc" },
      select: { id: true, status: true },
    });
    for (const [j, other] of others.entries()) {
      const hide = !KEEP_OLD && other.status === "published";
      await db.chapter.update({ where: { id: other.id }, data: { sortOrder: chapters.length + j + 1, ...(hide ? { status: "draft" } : {}) } });
      if (hide) hidden++;
    }
    console.log(`${code}: ${chapters.length} bab kurikulum, ${others.length} bab lain dipindah ke belakang`);
  }

  await importScenarios([...N5_SCENARIOS, ...N4_SCENARIOS, ...N3_SCENARIOS, ...N2_SCENARIOS, ...N1_SCENARIOS], levelId);
  await applyLevelAi(levelId);
  await applyLevelGate("N5", levelId("N5"), N5_LEVEL_UP);
  await applyLevelGate("N4", levelId("N4"), N4_LEVEL_UP);
  await applyLevelGate("N3", levelId("N3"), N3_LEVEL_UP);
  await applyLevelGate("N2", levelId("N2"), N2_LEVEL_UP);
  await applyLevelGate("N1", levelId("N1"), N1_LEVEL_UP);
  console.log(`\nSelesai. Baru: ${created}, ditulis ulang: ${rewritten}, dibiarkan: ${kept}, bab lama disembunyikan (draft): ${hidden}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
