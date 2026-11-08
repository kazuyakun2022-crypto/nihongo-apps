/**
 * Membuat satu paket Simulasi JLPT dengan AI, lalu menyimpannya sebagai DRAFT untuk ditinjau admin.
 *
 *   npm run content:jlpt-generate -- N5 2            (level N5, paket 2)
 *   npm run content:jlpt-generate -- N3 4 --hanya-file  (buat file JSON saja, tanpa menulis ke database)
 *   Opsi lain: --tanpa-cek (lewati pemeriksaan kunci oleh model kedua), --debug (simpan balasan mentah AI)
 *
 * Cara kerja:
 * - Distribusi soal mengikuti tipe soal resmi (Daimon) per level, lihat PLAN di bawah.
 * - Soal berpijak pada kosakata & pola tata bahasa level itu dari database, supaya tingkatnya tepat.
 * - Kata/pola yang sudah dipakai paket lain dihindari; posisi jawaban benar diacak ulang (AI cenderung memilih nomor 1).
 * - Hasil disimpan per batch di prisma/data/jlpt-sim/generated/. Bila kuota habis, jalankan lagi perintah yang sama
 *   untuk melanjutkan dari batch terakhir.
 * - Setelah lengkap, soal diimpor sebagai draft: tidak muncul di ujian sampai admin menekan "Terbitkan paket".
 *
 * Model: Gemini Flash (berpikir rendah) -> Flash-Lite -> Groq gpt-oss-120b. Kunci dari apps/api/.env.
 * Catatan: kuota gratis dipakai bersama fitur AI aplikasi; skrip memberi jeda antar-panggilan.
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { JLPT_PACKAGE_COUNT, jlptPackageSchema, mapJlptPackage, type JlptPackage } from "../../src/modules/exam/domain/jlptImport";
import { isJlptCode, type JlptCode } from "../../src/modules/exam/domain/JlptSim";
import { PLAN, type PlanItem, type SectionType } from "../../src/modules/exam/domain/jlptPlan";

/** Petunjuk format per tipe soal, meniru soal resmi. */
const TYPE_GUIDE: Record<string, string> = {
  KANJI_READING:
    "漢字読み: kalimat pendek dengan SATU kata berkanji diberi garis bawah memakai tag <u>…</u>. Pertanyaan: cara baca kata bergaris bawah. 4 pilihan berupa bacaan hiragana yang mirip (beda dakuten, panjang vokal, っ, dsb.).",
  ORTHOGRAPHY:
    "表記: kalimat dengan SATU kata ditulis hiragana dan diberi garis bawah <u>…</u>. Pertanyaan: penulisan kanji/katakana yang benar. 4 pilihan berupa kanji/katakana yang mirip bentuk atau bunyinya.",
  WORD_FORMATION: "語形成: kalimat dengan （　） sebelum/sesudah sebuah kata. Pilihan berupa imbuhan (prefiks/sufiks) seperti 非・不・未・無・〜化・〜的・〜性.",
  CONTEXTUAL_EXPRESSION: "文脈規定: kalimat dengan （　）. Pilih kata yang paling cocok dengan konteks. Pilihan berupa kata dari kelas kata yang sama.",
  PARAPHRASE:
    "言い換え類義: kalimat dengan satu kata/frasa bergaris bawah <u>…</u>. Pilih ungkapan yang maknanya paling dekat. Pilihan berupa kalimat/ungkapan pendek.",
  USAGE: "用法: promptText berisi SATU kata saja. 4 pilihan berupa kalimat lengkap; hanya satu yang memakai kata itu dengan benar.",
  GRAMMAR_FORM: "文の文法1: kalimat dengan （　）. Pilih bentuk/pola tata bahasa yang tepat.",
  SENTENCE_COMPOSITION:
    "文の文法2 (並べ替え): JANGAN menulis options/answer. Tulis satu kalimat wajar yang bagian tengahnya dipotong jadi tepat 4 potongan: before (awal kalimat), pieces (4 potongan dalam URUTAN BENAR), after (akhir kalimat), star (posisi ★, 1-4; biasanya 3). Urutan potongan harus satu-satunya urutan yang benar secara tata bahasa. Skrip akan menyusun soal dan kuncinya sendiri.",
  TEXT_GRAMMAR:
    "文章の文法: passage berisi paragraf pendek dengan penanda （1）. promptText: 「（1）に入るのは何か。」. Pilihan berupa kata sambung/bentuk konjugasi.",
  SHORT_PASSAGE: "内容理解(短文): passage 100–200 karakter (memo, email, pengumuman). Satu pertanyaan isi.",
  MID_PASSAGE: "内容理解(中文): passage 300–450 karakter (esai/cerita sebab-akibat). Satu pertanyaan tentang alasan/maksud.",
  LONG_PASSAGE: "内容理解(長文): passage 600–900 karakter berisi argumen penulis. Satu pertanyaan tentang pendapat penulis.",
  INTEGRATED_READING: "統合理解: passage berisi dua teks pendek A dan B (tandai 「A」「B」) dengan topik sama. Pertanyaan membandingkan pendapat A dan B.",
  INFORMATION_RETRIEVAL: "情報検索: passage berupa brosur/jadwal/pengumuman dalam bentuk teks berbaris (pakai baris baru dan ・). Pertanyaan mencari informasi yang sesuai syarat tertentu.",
  TASK_BASED: "課題理解: audioScript berisi situasi + percakapan dua orang (tanpa label nama) + pertanyaan di akhir 'このあと何をしますか'. promptText = pertanyaannya.",
  POINT_COMPREHENSION: "ポイント理解: audioScript berisi pertanyaan di awal, percakapan, lalu pertanyaan diulang di akhir. promptText = pertanyaannya (alasan/perasaan/hal tertentu).",
  SUMMARY_COMPREHENSION: "概要理解: audioScript monolog pendek (pengumuman/ceramah). promptText: pertanyaan ide utama atau maksud pembicara.",
  QUICK_RESPONSE: "即時応答: audioScript SATU ucapan pendek. promptText: 「最もよい返事を選んでください。」. 4 pilihan berupa tanggapan; hanya satu yang alami.",
  INTEGRATED_LISTENING: "統合理解: audioScript percakapan tiga orang tentang beberapa pilihan. promptText: pilihan mana yang akhirnya dipilih.",
};

const LEVEL_GUIDE: Record<JlptCode, string> = {
  N5: "JLPT N5: kalimat sangat sederhana, hiragana dengan kanji N5 saja, beri spasi antar-kata seperti soal N5 asli.",
  N4: "JLPT N4: kalimat sederhana, kanji N5–N4, bentuk biasa/sopan.",
  N3: "JLPT N3: kalimat sehari-hari dan kantor, kanji hingga N3.",
  N2: "JLPT N2: bahasa koran/bisnis, kanji hingga N2, keigo bila sesuai.",
  N1: "JLPT N1: bahasa tulis formal, editorial, ungkapan tingkat lanjut.",
};

const SECTIONS_ORDER: SectionType[] = ["MOJI_GOI", "BUNPOU", "DOKKAI", "CHOUKAI"];
const BATCH: Record<SectionType, number> = { MOJI_GOI: 7, BUNPOU: 6, DOKKAI: 2, CHOUKAI: 4 };
const OUT_DIR = join(process.cwd(), "prisma", "data", "jlpt-sim", "generated");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GenQuestion {
  promptText: string;
  passage?: string;
  audioScript?: string;
  options: string[];
  /** Teks jawaban benar (lebih andal daripada nomor: AI kadang menomori dari 0). */
  answer?: string;
  /** Soal ★ (並べ替え): kalimat dipotong; soal dan kunci disusun skrip, bukan AI. */
  before?: string;
  pieces?: string[];
  after?: string;
  star?: number;
  /** Kalimat utuh soal ★, untuk pemeriksa kedua. */
  full?: string;
  correctOptionIndex: number;
  explanation: string;
  target?: string;
}

// ── Pemanggil AI ──
async function callGemini(model: string, prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY kosong");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "low" } },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY kosong");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 8000,
      reasoning_effort: "medium",
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

const PROVIDERS: { name: string; call: (p: string) => Promise<string> }[] = [
  { name: "gemini-flash-latest", call: (p) => callGemini("gemini-flash-latest", p) },
  { name: "gemini-flash-lite-latest", call: (p) => callGemini("gemini-flash-lite-latest", p) },
  { name: "groq gpt-oss-120b", call: callGroq },
];

async function askAi(prompt: string): Promise<{ text: string; provider: string }> {
  const errors: string[] = [];
  for (const p of PROVIDERS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return { text: await p.call(prompt), provider: p.name };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${p.name}#${attempt}: ${msg}`);
        // 429/503: tunggu lalu coba sekali lagi sebelum pindah ke model berikutnya
        if (/\b(429|503)\b/.test(msg) && attempt === 1) await sleep(20_000);
        else break;
      }
    }
  }
  throw new Error(`Semua model gagal:\n  ${errors.join("\n  ")}`);
}

/**
 * Pemeriksa kedua: model lain menilai apakah kunci jawaban benar dan satu-satunya.
 * Urutan Groq gpt-oss-120b (paling teliti untuk fakta bahasa) lalu Gemini Flash-Lite.
 * Mengembalikan nomor soal (0-based) yang dinilai bermasalah; gagal memeriksa = tidak ada yang dibuang.
 */
async function rejectedByChecker(level: JlptCode, questions: GenQuestion[]): Promise<Set<number>> {
  const list = questions
    .map((q, i) => {
      const ctx = [
        q.passage ? `Teks: ${q.passage}` : "",
        q.audioScript ? `Audio: ${q.audioScript}` : "",
        q.full ? `Kalimat lengkap (soal susun ★): ${q.full}` : "",
      ].filter(Boolean).join("\n");
      const opts = q.options.map((o, j) => `${j + 1}) ${o}`).join("  ");
      return [`#${i}`, ctx, `Soal: ${q.promptText}`, `Pilihan: ${opts}`, `Kunci: ${q.options[q.correctOptionIndex - 1]}`].filter(Boolean).join("\n");
    })
    .join("\n\n");
  const prompt = [
    `Kamu pemeriksa soal JLPT ${level} yang sangat teliti. Untuk tiap soal di bawah, periksa:`,
    "1) Apakah kunci benar? 2) Apakah ada pilihan lain yang JUGA benar? 3) Apakah bahasa Jepangnya wajar dan sesuai level?",
    "Untuk soal susun ★: kuncinya sudah pasti benar bila kalimat lengkapnya wajar; tandai bermasalah hanya bila kalimatnya janggal atau potongannya bisa disusun dalam urutan lain yang juga benar.",
    "Tandai soal bermasalah bila salah satu jawabannya tidak memuaskan.",
    'Balas HANYA JSON: {"bad":[nomor soal bermasalah], "alasan":{"nomor":"alasan singkat"}}',
    "",
    list,
  ].join("\n");
  for (const call of [callGroq, (p: string) => callGemini("gemini-flash-lite-latest", p)]) {
    try {
      const text = await call(prompt);
      const body = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const data = JSON.parse(body) as { bad?: unknown[]; alasan?: Record<string, string> };
      const bad = new Set((data.bad ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < questions.length));
      for (const n of bad) console.log(`    dibuang #${n}: ${data.alasan?.[String(n)] ?? "kunci diragukan"}`);
      return bad;
    } catch {
      // coba pemeriksa berikutnya
    }
  }
  console.log("    (pemeriksa tidak tersedia, batch disimpan tanpa pemeriksaan kedua)");
  return new Set();
}

// ── Prompt ──
function buildPrompt(level: JlptCode, item: PlanItem, count: number, material: { vocab: string[]; grammar: string[] }, avoid: string[]) {
  const listening = item.sectionType === "CHOUKAI";
  const reading = item.sectionType === "DOKKAI" || item.questionType === "TEXT_GRAMMAR";
  return [
    `Kamu penulis soal ujian JLPT berpengalaman. Buat ${count} soal ${level} bertipe ${item.questionType}.`,
    LEVEL_GUIDE[level],
    `Format soal: ${TYPE_GUIDE[item.questionType]}`,
    item.sectionType === "MOJI_GOI" && material.vocab.length
      ? `Ambil kata yang diuji dari daftar kosakata ${level} berikut (boleh kata lain yang setara tingkatnya bila perlu): ${material.vocab.join("、")}`
      : "",
    item.sectionType === "BUNPOU" && material.grammar.length ? `Uji pola tata bahasa ${level} dari daftar ini: ${material.grammar.join("、")}` : "",
    avoid.length ? `JANGAN menguji kata/pola berikut karena sudah dipakai di paket lain: ${avoid.join("、")}` : "",
    "Aturan wajib:",
    "- Tepat 4 pilihan, semuanya berbeda, hanya SATU yang benar tanpa keraguan. Pengecoh harus masuk akal tapi jelas salah bagi penutur asli.",
    "- Bahasa Jepang alami dan benar secara tata bahasa. Jangan memakai kata Inggris di dalam kalimat Jepang.",
    "- explanation dalam Bahasa Indonesia (1–3 kalimat): kenapa jawaban benar, dan arti kata/pola yang diuji.",
    "- target: kata atau pola yang diuji (untuk mencegah pengulangan).",
    "- promptText hanya kalimat soalnya. JANGAN menulis instruksi umum seperti 「つぎの…えらんで ください」 (instruksi sudah ada di judul Daimon).",
    reading ? "- passage wajib diisi (teks bacaan dalam Bahasa Jepang)." : "",
    listening
      ? "- audioScript wajib diisi: teks yang akan dibacakan TTS (maksimal 250 karakter, tanpa label nama pembicara, tanpa tanda kurung keterangan). promptText = pertanyaan dalam Bahasa Jepang."
      : "",
    item.questionType === "SENTENCE_COMPOSITION"
      ? 'Balas HANYA JSON: {"questions":[{"before":"…","pieces":["…","…","…","…"],"after":"…","star":3,"explanation":"arti kalimat & pola yang diuji","target":"…"}]}'
      : "- answer: salin PERSIS teks pilihan yang benar.",
    item.questionType === "SENTENCE_COMPOSITION"
      ? ""
      : 'Balas HANYA JSON: {"questions":[{"promptText":"…","passage":"…(opsional)","audioScript":"…(opsional)","options":["…","…","…","…"],"answer":"…","explanation":"…","target":"…"}]}',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Terima {"questions":[…]} maupun langsung […]; buang pagar kode ``` bila ada. */
function parseQuestions(text: string): GenQuestion[] {
  const body = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("]"), body.lastIndexOf("}"));
  const data = JSON.parse(body.slice(start, end + 1)) as GenQuestion[] | { questions?: GenQuestion[] };
  if (Array.isArray(data)) return data;
  return Array.isArray(data.questions) ? data.questions : [];
}

/**
 * Soal ★ (並べ替え) disusun dari potongan berurutan: 「before ＿＿ ＿＿ ＿★＿ ＿＿ after」, pilihan = 4 potongan,
 * kunci = potongan di posisi ★. Kunci jadi benar dengan sendirinya; AI tidak perlu menghitungnya.
 */
function composeStarQuestion(q: GenQuestion): GenQuestion | null {
  const pieces = Array.isArray(q.pieces) ? q.pieces.map((x) => String(x).trim()) : [];
  if (pieces.length !== 4 || pieces.some((x) => !x) || new Set(pieces).size !== 4) return null;
  const star = Number.isInteger(Number(q.star)) && Number(q.star) >= 1 && Number(q.star) <= 4 ? Number(q.star) : 3;
  const before = String(q.before ?? "").trim();
  const after = String(q.after ?? "").trim();
  const slots = pieces.map((_, i) => (i === star - 1 ? "＿★＿" : "＿＿")).join(" ");
  const full = `${before}${pieces.join("")}${after}`;
  return {
    ...q,
    promptText: `${before} ${slots} ${after}`.trim(),
    options: pieces,
    answer: pieces[star - 1],
    correctOptionIndex: star,
    full,
    explanation: `Urutan benar: ${pieces.join("・")} (★ = ${pieces[star - 1]}). Kalimat lengkap: 「${full}」. ${q.explanation ?? ""}`.trim(),
  };
}

/**
 * Buang paragraf instruksi Daimon (「つぎの…えらんで ください」) yang kadang ditulis AI di setiap soal;
 * di kertas ujian instruksi hanya ada sekali per Daimon. Garis bawah kosong <u>　</u> juga dibuang.
 */
export function stripInstruction(text: string): string {
  const paras = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const kept = paras.filter((x) => !/えらんで\s*ください|えらびなさい|選んでください|選びなさい/.test(x) || paras.length === 1);
  return (kept.length ? kept : paras).join("\n\n").replace(/<u>[\s　]*<\/u>/g, "").trim();
}

const INSTRUCTION = /えらんで\s*ください|えらびなさい|選んでください|選びなさい/;
/** Tipe yang memang memakai teks bacaan; selain ini, kalimat soal harus ada di promptText. */
const READING_TYPES = new Set(["TEXT_GRAMMAR", "SHORT_PASSAGE", "MID_PASSAGE", "LONG_PASSAGE", "INTEGRATED_READING", "INFORMATION_RETRIEVAL"]);

/**
 * Rapikan kalimat soal: buang instruksi Daimon; bila yang tersisa hanya instruksi dan AI menaruh kalimat soal
 * di passage (sering terjadi pada 文脈規定), pindahkan kalimat itu ke promptText.
 */
export function normalizePrompt<T extends { promptText: string; passage?: string | null }>(q: T, questionType: string): T {
  if (questionType === "QUICK_RESPONSE" || questionType.endsWith("COMPREHENSION") || questionType === "TASK_BASED" || questionType === "INTEGRATED_LISTENING") return q;
  const prompt = stripInstruction(q.promptText);
  const onlyInstruction = !prompt || INSTRUCTION.test(prompt);
  if (onlyInstruction && q.passage?.trim() && !READING_TYPES.has(questionType)) {
    return { ...q, promptText: q.passage.trim(), passage: undefined };
  }
  return { ...q, promptText: prompt };
}

/** Buang soal cacat; acak ulang posisi jawaban benar. */
function cleanQuestion(raw: GenQuestion, item: PlanItem): GenQuestion | null {
  const composed = item.questionType === "SENTENCE_COMPOSITION" && raw ? composeStarQuestion(raw) : raw;
  if (!composed || typeof composed.promptText !== "string") return null;
  const q = normalizePrompt(composed, item.questionType);
  // Soal yang tetap hanya berisi instruksi (tanpa kalimat soal) tidak bisa dijawab
  if (!q.promptText.trim() || (item.questionType !== "QUICK_RESPONSE" && INSTRUCTION.test(q.promptText) && !q.audioScript)) return null;
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  const options = q.options.map((o) => String(o).trim());
  if (options.some((o) => !o) || new Set(options).size !== 4) return null;
  // Utamakan teks jawaban; nomor hanya cadangan (1-4, atau 0-3 bila AI menomori dari nol)
  const answer = typeof q.answer === "string" ? q.answer.trim() : undefined;
  const byText = answer ? options.find((o) => o === answer) : undefined;
  const n = Number(q.correctOptionIndex);
  const byIndex = Number.isInteger(n) ? (n === 0 ? options[0] : options[n - 1]) : undefined;
  const correct = byText ?? (q.answer === undefined ? byIndex : undefined);
  if (!correct) return null;
  if (item.sectionType === "CHOUKAI" && (!q.audioScript || q.audioScript.length > 290)) return null;
  if ((item.sectionType === "DOKKAI" || item.questionType === "TEXT_GRAMMAR") && !q.passage?.trim()) return null;
  if (/[A-Za-z]{4,}/.test(q.promptText.replace(/<\/?u>/g, ""))) return null;
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return { ...q, options: shuffled, correctOptionIndex: shuffled.indexOf(correct) + 1 };
}

// ── Utama ──

/** Pembuatan berhenti di tengah (kuota habis / semua soal ditolak); hasil sementara sudah tersimpan di file. */
export class GenerationStopped extends Error {}

export interface GenerateOptions {
  /** Hanya tulis file JSON, jangan impor ke database. */
  fileOnly?: boolean;
  /** Simpan balasan mentah AI ke folder generated/. */
  debug?: boolean;
  /** Lewati pemeriksaan kunci oleh model kedua. */
  skipCheck?: boolean;
  db?: PrismaClient;
}

/**
 * Buat (atau lanjutkan) satu paket. Soal yang sudah ada di database TIDAK ditimpa: paket yang sudah
 * direview & diterbitkan admin aman walau perintah ini dijalankan ulang.
 */
export async function generatePackage(level: JlptCode, paket: number, opts: GenerateOptions = {}) {
  const { fileOnly = false, debug = false, skipCheck = false } = opts;
  const db = opts.db ?? new PrismaClient();
  const ownDb = !opts.db;
  try {
    return await run();
  } finally {
    if (ownDb) await db.$disconnect();
  }

  async function run() {
  const levelRow = await db.level.findUnique({ where: { code: level } });
  if (!levelRow) throw new Error(`Level ${level} belum ada di database.`);

  // Bahan dari kurikulum level ini
  const [vocab, grammar] = await Promise.all([
    db.vocabulary.findMany({ where: { chapter: { levelId: levelRow.id } }, select: { word: true }, take: 2000 }),
    db.grammarPoint.findMany({ where: { chapter: { levelId: levelRow.id } }, select: { pattern: true }, take: 400 }),
  ]);
  const sample = <T,>(xs: T[], n: number) => [...xs].sort(() => Math.random() - 0.5).slice(0, n);

  // Kata/pola yang sudah dipakai paket lain di level ini (dari tag "target" file hasil sebelumnya)
  mkdirSync(OUT_DIR, { recursive: true });
  const prefix = `${level.toLowerCase()}-paket-`;
  const outFile = join(OUT_DIR, `${prefix}${String(paket).padStart(2, "0")}.json`);
  const used = new Set<string>();
  for (const f of readdirSync(OUT_DIR).filter((f) => f.startsWith(prefix) && join(OUT_DIR, f) !== outFile)) {
    const other = JSON.parse(readFileSync(join(OUT_DIR, f), "utf8")) as JlptPackage;
    for (const s of other.sections) for (const q of s.questions) for (const t of q.tags ?? []) if (!/^N\d$/.test(t)) used.add(t);
  }

  // Lanjutkan dari file yang sudah ada (batch yang sudah jadi tidak dibuat ulang)
  const pkg: JlptPackage = existsSync(outFile)
    ? (JSON.parse(readFileSync(outFile, "utf8")) as JlptPackage)
    : { examSlug: `jlpt-${level.toLowerCase()}-mock-${String(paket).padStart(2, "0")}`, levelCode: level, variantIndex: paket, title: `Simulasi JLPT ${level} - Paket ${paket}`, sections: [] };
  const sectionOf = (t: SectionType) => {
    let s = pkg.sections.find((x) => x.sectionType === t);
    if (!s) {
      s = { sectionType: t, questions: [] };
      pkg.sections.push(s);
      pkg.sections.sort((a, b) => SECTIONS_ORDER.indexOf(a.sectionType as SectionType) - SECTIONS_ORDER.indexOf(b.sectionType as SectionType));
    }
    return s;
  };
  const save = () => writeFileSync(outFile, JSON.stringify(pkg, null, 2) + "\n");

  for (const item of PLAN[level]) {
    const section = sectionOf(item.sectionType);
    let have = section.questions.filter((q) => q.questionType === item.questionType).length;
    let failures = 0;
    while (have < item.count) {
      const need = Math.min(BATCH[item.sectionType], item.count - have);
      const avoid = [...used].slice(-150);
      const prompt = buildPrompt(level, item, need, { vocab: sample(vocab.map((v) => v.word), 120), grammar: sample(grammar.map((g) => g.pattern), 40) }, avoid);
      process.stdout.write(`${level} paket ${paket} · ${item.questionType}: ${have}/${item.count} → minta ${need}… `);
      let made: GenQuestion[] = [];
      try {
        const { text, provider } = await askAi(prompt);
        // --debug: simpan balasan mentah AI untuk diperiksa bila soal banyak ditolak
        if (debug) writeFileSync(join(OUT_DIR, `debug-${level.toLowerCase()}-${item.questionType}-${Date.now()}.txt`), `${provider}\n\n${text}`);
        made = parseQuestions(text)
          .map((q) => cleanQuestion(q, item))
          .filter((q): q is GenQuestion => !!q && !used.has(q.target ?? ""))
          .slice(0, need);
        console.log(`${made.length} lolos format (${provider})`);
        if (made.length && !skipCheck) {
          const bad = await rejectedByChecker(level, made);
          made = made.filter((_, i) => !bad.has(i));
        }
      } catch (err) {
        console.log("gagal");
        console.error(err instanceof Error ? err.message : err);
      }
      if (made.length === 0) {
        if (++failures >= 3) {
          save();
          throw new GenerationStopped(
            `Berhenti di ${level} paket ${paket} (${item.questionType}): 3 percobaan berturut-turut tidak menghasilkan soal yang lolos ` +
              "(kuota AI habis, atau semua soal ditolak pemeriksa; lihat baris 'dibuang' di atas). Jalankan perintah yang sama nanti untuk melanjutkan.",
          );
        }
        await sleep(15_000);
        continue;
      }
      failures = 0;
      for (const q of made) {
        const num = section.questions.length + 1;
        section.questions.push({
          questionNumber: num,
          questionType: item.questionType,
          promptText: q.promptText.trim(),
          passage: q.passage?.trim() || undefined,
          audioScript: q.audioScript?.trim() || undefined,
          options: q.options.map((text, i) => ({ index: i + 1, text })),
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation?.trim() || undefined,
          tags: [level, ...(q.target ? [q.target.trim()] : [])],
        });
        if (q.target) used.add(q.target.trim());
      }
      have += made.length;
      save();
      await sleep(5_000);
    }
  }

  // Bersihkan juga soal lama di file (dibuat sebelum pembersih instruksi ada)
  for (const s of pkg.sections) {
    s.questions = s.questions.map((q) => {
      const n = normalizePrompt({ promptText: q.promptText, passage: q.passage }, q.questionType ?? "");
      return { ...q, promptText: n.promptText, passage: n.passage ?? undefined };
    });
  }
  save();
  const parsed = jlptPackageSchema.parse(pkg);
  const { questions, errors } = mapJlptPackage(parsed);
  if (errors.length) throw new Error(`Paket belum valid:\n- ${errors.join("\n- ")}`);
  console.log(`\nFile siap: ${outFile} (${questions.length} soal)`);

  let created = 0;
  if (!fileOnly) {
    // Hanya soal yang belum ada: hasil review/edit admin di database tidak pernah ditimpa
    const res = await db.examQuestion.createMany({
      data: questions.map((q) => ({ ...q, levelId: levelRow.id, examType: "jlpt_sim" as const, status: "draft", options: q.options })),
      skipDuplicates: true,
    });
    created = res.count;
    console.log(
      `${created} soal baru diimpor sebagai DRAFT (${questions.length - created} sudah ada, tidak diubah). ` +
        `Tinjau di Admin > Konten > Ujian > Simulasi JLPT > ${level}, lalu "Terbitkan" paket ${paket}.`,
    );
  }
  return { file: outFile, total: questions.length, created };
  }
}

async function cli() {
  const args = process.argv.slice(2);
  const [rawLevel, rawPaket] = args.filter((a) => !a.startsWith("--"));
  const level = (rawLevel ?? "").toUpperCase();
  const paket = Number(rawPaket);
  if (!isJlptCode(level) || !Number.isInteger(paket) || paket < 1 || paket > JLPT_PACKAGE_COUNT) {
    console.error(`Pemakaian: npm run content:jlpt-generate -- <N5|N4|N3|N2|N1> <1-${JLPT_PACKAGE_COUNT}> [--hanya-file] [--tanpa-cek] [--debug]`);
    process.exit(1);
  }
  try {
    await generatePackage(level, paket, { fileOnly: args.includes("--hanya-file"), debug: args.includes("--debug"), skipCheck: args.includes("--tanpa-cek") });
  } catch (err) {
    if (err instanceof GenerationStopped) {
      console.error(`\n${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}

// Dijalankan langsung (npm run content:jlpt-generate); bila diimpor modul bank, hanya generatePackage yang dipakai.
// tsx menjalankan file ini sebagai ESM, jadi require.main tidak tersedia: cek nama file di argv.
if (/generateJlptPackage\.ts$/.test(process.argv[1] ?? "")) {
  cli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
