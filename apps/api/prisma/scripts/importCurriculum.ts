/**
 * Menyusun kurikulum dari dataset ke database:
 * - Pemula: bab hiragana, katakana, salam, dan angka.
 * - N5–N1: kosakata JLPT (dikelompokkan per tema), kanji per level, dan tata bahasa, lalu kuis otomatis.
 * - Bank soal ujian naik level per level (kosakata, tata bahasa, membaca, mendengar).
 *
 * Aman dijalankan ulang: bab/soal yang sourceKey-nya sudah ada dilewati, jadi hasil edit admin tidak tertimpa.
 * Jalankan dari apps/api: npx tsx prisma/scripts/importCurriculum.ts
 *
 * Sumber data:
 * - Kosakata: open-anki-jlpt-decks (MIT), berbasis daftar JLPT Jonathan Waller (tanos.co.uk, CC BY).
 * - Kanji: kanji-data oleh David Gouveia (MIT), berbasis KANJIDIC (EDRDG, CC BY-SA).
 * - Arti bahasa Indonesia: diterjemahkan dengan Gemini (lihat translateVocab.ts / translateKanji.ts).
 * - Tata bahasa & Pemula: ditulis khusus untuk aplikasi ini.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient, type ExamSection, type QuizType } from "@prisma/client";
import { DATA_DIR, THEMES, readVocabCsv, type TranslatedVocab } from "./vocabData";
import { PEMULA_CHAPTERS } from "./pemulaData";

const db = new PrismaClient();
const PRISMA_DATA = join(process.cwd(), "prisma", "data");

const JLPT_LEVELS = [
  { jlpt: 5, levelId: 2, perChapter: 12 },
  { jlpt: 4, levelId: 3, perChapter: 15 },
  { jlpt: 3, levelId: 4, perChapter: 20 },
  { jlpt: 2, levelId: 5, perChapter: 20 },
  { jlpt: 1, levelId: 6, perChapter: 20 },
];
const MAX_KANJI_PER_CHAPTER = 10;

interface Vocab {
  key: string;
  word: string;
  reading: string;
  meaningId: string;
}
interface Grammar {
  pattern: string;
  explanation: string;
  exampleSentence: string;
  exampleTranslation: string;
  quiz: { question: string; options: string[]; answer: string };
}
interface KanjiRow {
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  meaningId: string;
}
interface Quiz {
  type: QuizType;
  question: string;
  options: string[];
  correctAnswer: string;
  audioUrl?: string;
  explanation?: string;
}
interface ChapterDraft {
  key: string;
  title: string;
  explanation: string;
  vocab: Vocab[];
  kanji: KanjiRow[];
  grammar: Grammar[];
  quiz: Quiz[];
}

// ── Acak yang bisa diulang (hasil impor sama setiap kali dijalankan) ──
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Pilihan ganda: jawaban + 3 pengecoh unik, diacak. */
function choices(answer: string, pool: string[], rand: () => number): string[] | null {
  const distractors = shuffle([...new Set(pool.filter((p) => p && p !== answer))], rand).slice(0, 3);
  return distractors.length === 3 ? shuffle([answer, ...distractors], rand) : null;
}
const ttsUrl = (text: string) => `/api/tts?text=${encodeURIComponent(text)}`;
const hasKanji = (s: string) => /[一-鿿々]/.test(s);
/** Pengecoh cara baca hanya dari bacaan hiragana biasa, supaya tidak gampang ditebak dari jenis hurufnya. */
const isPlainReading = (s: string) => /^[ぁ-ゖー]+$/.test(s);
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("id") + s.slice(1);

// ── Data ──
function loadVocab(jlpt: number): Vocab[] {
  const path = join(DATA_DIR, `id-n${jlpt}.json`);
  if (!existsSync(path)) throw new Error(`Terjemahan N${jlpt} belum ada. Jalankan translateVocab.ts dulu.`);
  const tr = JSON.parse(readFileSync(path, "utf8")) as Record<string, TranslatedVocab>;
  const out: (Vocab & { theme: string })[] = [];
  const seen = new Set<string>();
  for (const row of readVocabCsv(jlpt)) {
    const t = tr[row.guid];
    if (!t) continue;
    // "足; 脚" → pakai penulisan pertama
    const word = row.expression.split(/[;；]/)[0].trim().slice(0, 50);
    const reading = (row.reading || word).split(/[;；]/)[0].trim().slice(0, 50);
    if (seen.has(word + reading)) continue;
    seen.add(word + reading);
    out.push({ key: row.guid, word, reading, meaningId: capitalize(t.meaningId), theme: t.theme });
  }
  return out as Vocab[];
}

function loadGrammar(jlpt: number): Grammar[] {
  const path = join(PRISMA_DATA, "grammar", `n${jlpt}.json`);
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Grammar[]) : [];
}

function loadKanji(jlpt: number): KanjiRow[] {
  const all = JSON.parse(readFileSync(join(PRISMA_DATA, "kanji-data", "kanji.json"), "utf8")) as Record<
    string,
    { jlpt_new: number | null; freq: number | null; meanings: string[]; readings_on: string[]; readings_kun: string[] }
  >;
  const idPath = join(PRISMA_DATA, "kanji-data", "id-kanji.json");
  const id = existsSync(idPath) ? (JSON.parse(readFileSync(idPath, "utf8")) as Record<string, string>) : {};
  return Object.entries(all)
    .filter(([, v]) => v.jlpt_new === jlpt)
    .sort(([, a], [, b]) => (a.freq ?? 9999) - (b.freq ?? 9999))
    .map(([character, v]) => ({
      character,
      onyomi: v.readings_on.slice(0, 3).join("、").slice(0, 50) || null,
      kunyomi: v.readings_kun.slice(0, 3).join("、").slice(0, 50) || null,
      meaningId: (id[character] ?? v.meanings.slice(0, 3).join(" / ")).toLocaleLowerCase("id"),
    }));
}

// ── Kuis bab ──
function vocabQuiz(chapter: { key: string; vocab: Vocab[]; grammar: Grammar[]; kanji: KanjiRow[] }, levelVocab: Vocab[]): Quiz[] {
  const rand = rng(chapter.key);
  const quiz: Quiz[] = [];
  const meanings = levelVocab.map((v) => v.meaningId);
  const words = levelVocab.map((v) => v.word);
  const picked = shuffle(chapter.vocab, rand);

  for (const v of picked.slice(0, 4)) {
    const options = choices(v.meaningId, meanings, rand);
    if (options) quiz.push({ type: "pilihan_ganda", question: `Apa arti「${v.word}」?`, options, correctAnswer: v.meaningId, explanation: `${v.word}（${v.reading}）artinya "${v.meaningId}".` });
  }
  for (const v of picked.filter((x) => hasKanji(x.word)).slice(0, 2)) {
    const readings = levelVocab.map((x) => x.reading).filter(isPlainReading);
    const options = choices(v.reading, readings, rand);
    if (options) quiz.push({ type: "pilihan_ganda", question: `Bagaimana cara membaca「${v.word}」?`, options, correctAnswer: v.reading, explanation: `${v.word} dibaca ${v.reading}.` });
  }
  const listen = picked[picked.length - 1];
  if (listen) {
    const options = choices(listen.word, words, rand);
    if (options) quiz.push({ type: "mendengar", question: "Dengarkan audionya. Kata mana yang diucapkan?", options, correctAnswer: listen.word, audioUrl: ttsUrl(listen.reading), explanation: `Yang diucapkan adalah ${listen.word}（${listen.reading}）, artinya "${listen.meaningId}".` });
  }
  for (const g of chapter.grammar) {
    quiz.push({ type: "pilihan_ganda", question: g.quiz.question, options: g.quiz.options, correctAnswer: g.quiz.answer, explanation: `Pola ${g.pattern}: ${g.explanation}` });
  }
  return quiz;
}

// ── Penyusunan bab per level JLPT ──
function buildJlptChapters(jlpt: number, perChapter: number): { chapters: ChapterDraft[]; vocab: Vocab[]; grammar: Grammar[] } {
  const vocab = loadVocab(jlpt) as (Vocab & { theme: string })[];
  const grammar = loadGrammar(jlpt);
  const kanji = loadKanji(jlpt);

  const drafts: Omit<ChapterDraft, "quiz" | "explanation" | "grammar" | "kanji">[] = [];
  for (const theme of THEMES) {
    const items = vocab.filter((v) => v.theme === theme.id);
    if (!items.length) continue;
    const parts = Math.ceil(items.length / perChapter);
    for (let p = 0; p < parts; p++) {
      const slice = items.slice(Math.floor((p * items.length) / parts), Math.floor(((p + 1) * items.length) / parts));
      drafts.push({ key: `jlpt:n${jlpt}:${theme.id}:${p + 1}`, title: parts > 1 ? `${theme.title} ${p + 1}` : theme.title, vocab: slice });
    }
  }

  // Kanji masuk ke bab pertama yang kosakatanya memakai kanji itu; sisanya dibagi rata
  const kanjiOf = drafts.map(() => [] as KanjiRow[]);
  const leftover: KanjiRow[] = [];
  for (const k of kanji) {
    const idx = drafts.findIndex((d, i) => kanjiOf[i].length < MAX_KANJI_PER_CHAPTER && d.vocab.some((v) => v.word.includes(k.character)));
    if (idx >= 0) kanjiOf[idx].push(k);
    else leftover.push(k);
  }
  for (const k of leftover) {
    let min = 0;
    for (let i = 1; i < kanjiOf.length; i++) if (kanjiOf[i].length < kanjiOf[min].length) min = i;
    kanjiOf[min].push(k);
  }

  const chapters = drafts.map((d, i) => {
    const g = grammar.slice(Math.floor((i * grammar.length) / drafts.length), Math.floor(((i + 1) * grammar.length) / drafts.length));
    const grammarNote = g.length ? ` Pola tata bahasa: ${g.map((x) => x.pattern).join("、")}.` : "";
    const chapter: ChapterDraft = {
      ...d,
      kanji: kanjiOf[i],
      grammar: g,
      explanation: `Pelajari ${d.vocab.length} kosakata bertema ${d.title.toLocaleLowerCase("id").replace(/ \d+$/, "")}${kanjiOf[i].length ? ` dan ${kanjiOf[i].length} kanji` : ""}.${grammarNote}`,
      quiz: [],
    };
    chapter.quiz = vocabQuiz(chapter, vocab);
    return chapter;
  });
  return { chapters, vocab, grammar };
}

// ── Bank soal ujian ──
interface ExamDraft {
  sourceKey: string;
  section: ExamSection;
  question: string;
  options: string[];
  correctAnswer: string;
  audioUrl?: string;
  explanation?: string;
  difficulty: number;
}

function buildExamBank(jlpt: number, vocab: Vocab[], grammar: Grammar[]): ExamDraft[] {
  const rand = rng(`exam:n${jlpt}`);
  const bank: ExamDraft[] = [];
  const meanings = vocab.map((v) => v.meaningId);
  const readings = vocab.map((v) => v.reading);
  const words = vocab.map((v) => v.word);
  const pool = shuffle(vocab, rand);

  for (const v of pool.slice(0, 100)) {
    const options = choices(v.meaningId, meanings, rand);
    if (options) bank.push({ sourceKey: `exam:n${jlpt}:kosakata:${v.key}`, section: "kosakata", question: `「${v.word}」の意味は？ (Apa artinya?)`, options, correctAnswer: v.meaningId, explanation: `${v.word}（${v.reading}）= ${v.meaningId}`, difficulty: 1 });
  }
  for (const v of pool.filter((x) => hasKanji(x.word)).slice(0, 80)) {
    const options = choices(v.reading, readings.filter(isPlainReading), rand);
    if (options) bank.push({ sourceKey: `exam:n${jlpt}:membaca:${v.key}`, section: "membaca", question: `「${v.word}」の読み方は？ (Bagaimana cara membacanya?)`, options, correctAnswer: v.reading, explanation: `${v.word} dibaca ${v.reading}.`, difficulty: 2 });
  }
  grammar.forEach((g, i) => {
    bank.push({ sourceKey: `exam:n${jlpt}:tata_bahasa:${i}`, section: "tata_bahasa", question: g.quiz.question, options: g.quiz.options, correctAnswer: g.quiz.answer, explanation: `Pola ${g.pattern}: ${g.explanation}`, difficulty: 2 });
  });
  for (const v of pool.slice(100, 160)) {
    const options = choices(v.word, words, rand);
    if (options) bank.push({ sourceKey: `exam:n${jlpt}:mendengar:${v.key}`, section: "mendengar", question: "Dengarkan audionya. Kata mana yang diucapkan?", options, correctAnswer: v.word, audioUrl: ttsUrl(v.reading), explanation: `Yang diucapkan: ${v.word}（${v.reading}）= ${v.meaningId}`, difficulty: 1 });
  }
  return bank;
}

// ── Pemula ──
function buildPemula(): { chapters: ChapterDraft[]; bank: ExamDraft[] } {
  const chapters = PEMULA_CHAPTERS.map((c) => {
    const rand = rng(c.key);
    const pool = PEMULA_CHAPTERS.flatMap((x) => x.vocab);
    const quiz: Quiz[] = [];
    for (const v of shuffle(c.vocab, rand).slice(0, 6)) {
      if (c.kind === "kana") {
        const options = choices(v.reading, pool.filter((x) => /^[a-z]+$/.test(x.reading)).map((x) => x.reading), rand);
        if (options) quiz.push({ type: "pilihan_ganda", question: `Huruf「${v.word}」dibaca apa?`, options, correctAnswer: v.reading, explanation: `${v.word} dibaca "${v.reading}".` });
      } else {
        const options = choices(v.meaningId, pool.map((x) => x.meaningId), rand);
        if (options) quiz.push({ type: "pilihan_ganda", question: `Apa arti「${v.word}」?`, options, correctAnswer: v.meaningId, explanation: `${v.word} artinya "${v.meaningId}".` });
      }
    }
    const listen = c.vocab[Math.floor(rand() * c.vocab.length)];
    const listenOptions = choices(listen.word, c.vocab.map((x) => x.word), rand);
    if (listenOptions) quiz.push({ type: "mendengar", question: "Dengarkan audionya. Mana yang diucapkan?", options: listenOptions, correctAnswer: listen.word, audioUrl: ttsUrl(listen.word), explanation: `Yang diucapkan adalah ${listen.word}.` });
    return { key: c.key, title: c.title, explanation: c.explanation, vocab: c.vocab.map((v, i) => ({ ...v, key: `${c.key}:${i}` })), kanji: [], grammar: [], quiz };
  });

  const rand = rng("exam:pemula");
  const kana = PEMULA_CHAPTERS.filter((c) => c.kind === "kana").flatMap((c) => c.vocab);
  const words = PEMULA_CHAPTERS.filter((c) => c.kind === "kata").flatMap((c) => c.vocab);
  const bank: ExamDraft[] = [];
  kana.forEach((v, i) => {
    const options = choices(v.reading, kana.map((x) => x.reading), rand);
    if (options) bank.push({ sourceKey: `exam:pemula:membaca:${i}`, section: "membaca", question: `「${v.word}」dibaca apa?`, options, correctAnswer: v.reading, difficulty: 1 });
    const listen = choices(v.word, kana.map((x) => x.word), rand);
    if (listen) bank.push({ sourceKey: `exam:pemula:mendengar:${i}`, section: "mendengar", question: "Dengarkan audionya. Huruf mana yang diucapkan?", options: listen, correctAnswer: v.word, audioUrl: ttsUrl(v.word), difficulty: 1 });
  });
  words.forEach((v, i) => {
    const options = choices(v.meaningId, words.map((x) => x.meaningId), rand);
    if (options) bank.push({ sourceKey: `exam:pemula:kosakata:${i}`, section: "kosakata", question: `Apa arti「${v.word}」?`, options, correctAnswer: v.meaningId, difficulty: 1 });
  });
  return { chapters, bank };
}

// ── Tulis ke database ──
async function saveChapters(levelId: number, chapters: ChapterDraft[]) {
  const existing = await db.chapter.findMany({ where: { levelId }, select: { sourceKey: true, sortOrder: true } });
  const keys = new Set(existing.map((c) => c.sourceKey));
  let sortOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), 0);
  let created = 0;
  for (const c of chapters) {
    if (keys.has(c.key)) continue;
    sortOrder++;
    await db.chapter.create({
      data: {
        levelId,
        sourceKey: c.key,
        title: c.title.slice(0, 150),
        explanation: c.explanation,
        sortOrder,
        status: "published",
        publishedAt: new Date(),
        vocabularies: { create: c.vocab.map((v) => ({ word: v.word, reading: v.reading, meaningId: v.meaningId.slice(0, 255) })) },
        kanji: { create: c.kanji.map((k) => ({ character: k.character, onyomi: k.onyomi, kunyomi: k.kunyomi, meaningId: capitalize(k.meaningId).slice(0, 255) })) },
        grammarPoints: { create: c.grammar.map((g) => ({ pattern: g.pattern.slice(0, 100), explanation: g.explanation, exampleSentence: g.exampleSentence, exampleTranslation: g.exampleTranslation })) },
        quizQuestions: {
          create: c.quiz.map((q) => ({
            type: q.type,
            question: q.question,
            options: q.options as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer,
            audioUrl: q.audioUrl,
            explanation: q.explanation,
          })),
        },
      },
    });
    created++;
  }
  return created;
}

async function saveExamBank(levelId: number, bank: ExamDraft[]) {
  const res = await db.examQuestion.createMany({
    data: bank.map((q) => ({ ...q, levelId, options: q.options as Prisma.InputJsonValue, status: "published" })),
    skipDuplicates: true,
  });
  await db.levelExam.upsert({
    where: { levelId_type: { levelId, type: "level_up" } },
    update: {},
    create: { levelId, type: "level_up", questionCount: 30, timeLimitMin: 25, passScore: 75, sectionMinScore: 60, cooldownHours: 24, minChapterCompletion: 80 },
  });
  return res.count;
}

async function main() {
  const pemula = buildPemula();
  console.log(`Pemula: ${await saveChapters(1, pemula.chapters)} bab baru, ${await saveExamBank(1, pemula.bank)} soal ujian baru`);

  for (const { jlpt, levelId, perChapter } of JLPT_LEVELS) {
    const { chapters, vocab, grammar } = buildJlptChapters(jlpt, perChapter);
    const created = await saveChapters(levelId, chapters);
    // Di N1 (level tertinggi) bank ini dipakai untuk Ujian Kelulusan Akhir
    const exam = await saveExamBank(levelId, buildExamBank(jlpt, vocab, grammar));
    console.log(`N${jlpt}: ${chapters.length} bab (${created} baru), ${vocab.length} kosakata, ${grammar.length} tata bahasa, ${exam} soal ujian baru`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
