import sharp from "sharp";
import { compareChars, DIMENSION_OF, DISTINCT, ISSUE_CODES, ISSUES, lookalikes, QUADRANT_NAME, QUADRANTS, type Dimension, type IssueCode, type Quadrant } from "./writingGuide";
import { measureModel, measureWriting, placementScore, proportionScore, type GlyphShape } from "./cellMetrics";
import { buildNekoFeedback, type MainIssue, type NekoFeedback } from "./nekoFeedback";
import { apply, cellOrigin, composeLabeled, composePair, geometry, homography, inkFit, inkRatio, PRINT_LAYOUT, rectify, type Geometry, type Matrix, type Point, type RawImage } from "./sheetLayout";

/**
 * Pemeriksaan tulisan tangan dari foto lembar latihan (Tulis di Buku).
 *
 * Jalur tepat (lembar cetak dengan 4 penanda hitam): penanda dicari tanpa AI, foto diluruskan, dan letak setiap
 * kotak dihitung dari tata letak cetak, sehingga tanda koreksi pasti jatuh di kotak yang benar. Tiap baris huruf
 * yang sudah lurus dinilai Gemini Flash-Lite dalam satu permintaan; tanda dari model "ditempelkan" ke kotak
 * terdekat, dan kotak kosong dipastikan dengan menghitung tinta.
 * Jalur perkiraan (lembar lama / salinan di buku): model membaca seluruh foto, posisi tanda bisa sedikit meleset.
 *
 * Model hanya memberi putusan dan kode masalah; kalimat koreksi diambil dari panduan manual (writingGuide),
 * dan nilai dihitung di sini dari putusan tiap kotak.
 */

export interface SheetChar {
  char: string;
  reading: string;
  strokes?: number;
  /** Urutan goresan, mis. "1. Garis mendatar pendek …". */
  tips?: string[];
}

/** Koordinat di foto, skala 0–1000: [atas, kiri, bawah, kanan]. */
export type Box = [number, number, number, number];

export type CellStatus = "rapi" | "kurang" | "salah" | "kosong";

export interface CheckMark {
  box: Box;
  kind: Exclude<CellStatus, "rapi">;
  read: string;
  /** Label kotak di lembar, mis. "A5". */
  cell: string;
  /** Bagian kotak (grid juuji 2×2) tempat masalahnya, dan areanya di foto untuk disorot. */
  quadrant: Quadrant | null;
  focus: Box | null;
  /** Dimensi rubrik yang terkena. */
  dimension: Dimension | null;
  severity: "ringan" | "sedang" | "berat";
  /** Apa yang salah pada kotak ini. */
  problem: string;
  /** Cara memperbaikinya. */
  fix: string;
}

/** Rubrik 5 dimensi (0–100). */
export interface DimensionScores {
  strokeCountScore: number;
  strokeEndingScore: number;
  proportionScore: number;
  centerAlignmentScore: number;
  legibilityScore: number;
}

export interface CharResult {
  char: string;
  reading: string;
  row: Box | null;
  best: Box | null;
  written: number;
  neat: number;
  counts: Record<CellStatus, number>;
  score: number;
  isPass: boolean;
  dimensionScores: DimensionScores;
  nekoFeedback: NekoFeedback;
  /** Kunci riwayat masalah utama (HandwritingLog), null bila tidak ada masalah. */
  issueKey: string | null;
  praise: string;
  tip: string;
  marks: CheckMark[];
}

export interface CheckResult {
  photoOk: boolean;
  photoProblem: string;
  /** true bila penanda lembar ditemukan sehingga letak setiap kotak dihitung tepat. */
  precise: boolean;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  isPass: boolean;
  summary: string;
  chars: CharResult[];
}

export type Script = "hiragana" | "katakana" | "kanji";

export interface ModelChoice {
  model: string;
  thinking?: string;
  timeoutMs: number;
}

export const JUDGE_MODELS: ModelChoice[] = [
  { model: "gemini-flash-lite-latest", thinking: "low", timeoutMs: 20000 },
  { model: "gemini-3.5-flash-lite", thinking: "low", timeoutMs: 16000 },
  // Kuota gratis dihitung per model (±500 permintaan/hari), jadi model ketiga menambah kapasitas harian
  { model: "gemini-3.1-flash-lite", thinking: "low", timeoutMs: 16000 },
];

/**
 * Batas waktu seluruh pemeriksaan. Fungsi Vercel dibatasi 60 detik dan proxy web 65 detik (next.config); biasanya
 * selesai 10–15 detik, sisanya cadangan saat layanan Gemini gratis sedang sibuk.
 */
const TOTAL_BUDGET_MS = 54000;
/** Batas tahap 1 (menjaring), supaya tahap 2 (memastikan) masih punya waktu. */
const STAGE1_BUDGET_MS = 30000;
/** Proporsi tinta: kotak kosong terukur 0, tulisan paling tipis di uji ≥ 1,7%. */
const INK_EMPTY = 0.004;
const INK_WRITTEN = 0.012;

const SCRIPT_NAME: Record<Script, string> = { hiragana: "hiragana", katakana: "katakana", kanji: "kanji" };

// ───────────────────────── Gemini ─────────────────────────

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

/** `seed` + temperature 0: foto yang sama selalu mendapat jawaban yang sama. */
async function gemini<T>(apiKey: string, parts: Part[], schema: object, models: ModelChoice[], deadline: number, seed = 7): Promise<T> {
  let lastError: unknown = new Error("Waktu pemeriksaan habis");
  // Tiap model dicoba sampai 3 kali bila layanan gratis sedang membatasi (429) atau sibuk (503)
  const attempts = models.flatMap((m) => [m, m, m].map((x, i) => ({ ...x, retry: i })));
  for (const { model, thinking, timeoutMs, retry } of attempts) {
    // Kuota harian yang habis tidak pulih dengan menunggu: langsung pindah ke model berikutnya
    if (retry && !(lastError instanceof Error && /(429|503)/.test(lastError.message) && !/PerDay/.test(lastError.message))) continue;
    if (retry) await new Promise((r) => setTimeout(r, 2500 * retry + Math.random() * 1000));
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;
    const started = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0,
            seed,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
            responseSchema: schema,
            ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
          },
        }),
        signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
      });
      if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
      if (process.env.TULIS_DEBUG) console.log(`[tulis] ${model} ok ${Date.now() - started}ms`);
      return JSON.parse(text) as T;
    } catch (err) {
      if (process.env.TULIS_DEBUG) console.log(`[tulis] ${model} gagal ${Date.now() - started}ms ${String(err).slice(0, 100)}`);
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Pemeriksaan tulisan gagal");
}

// ───────────────────────── Skema & prompt ─────────────────────────

const box2d = { type: "ARRAY", items: { type: "INTEGER" } };
const problemSchema = {
  type: "OBJECT",
  properties: {
    box_2d: box2d,
    status: { type: "STRING", enum: ["kurang", "salah", "kosong"] },
    read: { type: "STRING" },
    issues: { type: "ARRAY", items: { type: "STRING", enum: [...ISSUE_CODES] } },
    stroke: { type: "INTEGER" },
    quadrant: { type: "STRING", enum: [...QUADRANTS] },
    detail: { type: "STRING" },
  },
  required: ["box_2d", "status"],
};

interface RawProblem {
  box_2d?: number[];
  status: "kurang" | "salah" | "kosong";
  read?: string;
  issues?: string[];
  stroke?: number;
  quadrant?: string;
  detail?: string;
}

const RULES = `Status kotak yang bermasalah:
- "kurang": hurufnya benar tetapi ada masalah bentuk yang JELAS terlihat dan bisa kamu sebutkan.
- "salah": yang tertulis huruf lain atau tidak bisa dikenali sebagai huruf yang diminta (isi read dengan huruf yang terbaca).
  Bila tambahan/kekurangan goresan membuatnya menjadi huruf lain yang ada (mis. 目 untuk 日, 入 untuk 人, お untuk あ,
  ツ untuk シ), statusnya "salah", bukan "kurang".
  Bentuk variasi tulisan tangan yang sah tetap BENAR, bukan salah: mis. そ dengan goresan atas terpisah (seperti ソ di
  atas て), き/さ dengan goresan bawah terpisah, り yang tersambung, ふ dengan titik berbeda. Untuk シ vs ツ, lihat arah
  goresan panjang (シ naik dari kiri bawah, ツ turun dari kanan atas), bukan hanya posisi titiknya.
- "kosong": kotak tanpa tulisan tangan. Huruf abu-abu tipis hasil cetakan yang TIDAK ditebalkan pensil juga dianggap kosong.
Kotak yang hurufnya benar dan bentuk, proporsi, serta panjang goresannya sudah mirip contoh (tidak harus sempurna)
adalah "rapi" dan TIDAK perlu dicantumkan. Bila ragu antara rapi dan kurang, anggap rapi. Jangan mengarang kesalahan.
Untuk setiap masalah isi juga:
- issues: kode masalah yang terlihat (wajib ≥1 untuk "kurang"): goresan_kurang, goresan_lebih, terlalu_panjang,
  terlalu_pendek, sambung (seharusnya terpisah), terputus (seharusnya bersambung), lengkung, miring, proporsi,
  terlalu_kecil, keluar_kotak, tanda (titik/tenten/goresan kecil hilang atau salah posisi), tidak_jelas,
  tome (ujung goresan yang harus berhenti tegas malah tidak), hane (kait kecil di ujung goresan hilang),
  harai (ujung goresan yang harus menyapu runcing malah tumpul).
- quadrant: bagian kotak (garis bantu membagi kotak jadi 4) tempat masalahnya: kiri_atas, kanan_atas, kiri_bawah,
  kanan_bawah, atau tengah.
- stroke: nomor goresan (urutan goresan baku) yang paling bermasalah; 0 bila tidak spesifik.
- detail: maksimal 10 kata bahasa Indonesia tentang bagian yang bermasalah, hanya yang benar-benar terlihat.`;

function charInfo(c: SheetChar): string {
  const strokes = c.strokes ? `, ${c.strokes} goresan` : "";
  const tips = c.tips?.length ? ` Urutan goresan baku: ${c.tips.join(" ")}` : "";
  const own = DISTINCT[c.char] ? ` Ciri ${c.char}: ${DISTINCT[c.char]}.` : "";
  const alike = lookalikes(c.char);
  const warn = alike.length ? ` Periksa teliti apakah ada kotak yang sebenarnya menjadi: ${alike.join("; ")}.` : "";
  return `${c.char} (${c.reading}${strokes}).${tips}${own}${warn}`;
}

const LABEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    sheets: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          image: { type: "INTEGER" },
          best: { type: "STRING" },
          problems: {
            type: "ARRAY",
            items: { ...problemSchema, properties: { cell: { type: "STRING" }, ...problemSchema.properties }, required: ["cell", "status"] },
          },
        },
        required: ["image", "problems"],
      },
    },
  },
  required: ["sheets"],
};

interface LabelJudged {
  sheets: { image: number; best?: string; problems: (RawProblem & { cell: string })[] }[];
}

/** Jawaban pemeriksaan ulang (tahap 2). */
const VERIFY_SCHEMA = {
  type: "OBJECT",
  properties: {
    checks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          status: { type: "STRING", enum: ["rapi", "kurang", "salah"] },
          read: { type: "STRING" },
          issues: { type: "ARRAY", items: { type: "STRING", enum: [...ISSUE_CODES] } },
          stroke: { type: "INTEGER" },
          quadrant: { type: "STRING", enum: [...QUADRANTS] },
          detail: { type: "STRING" },
        },
        required: ["id", "status"],
      },
    },
  },
  required: ["checks"],
};

interface VerifyJudged {
  checks: ({ id: string } & Pick<RawProblem, "read" | "issues" | "stroke" | "quadrant" | "detail"> & { status: "rapi" | "kurang" | "salah" })[];
}

/** Batas jumlah kotak yang diperiksa ulang dalam satu permintaan. */
const MAX_CANDIDATES = 30;
/** Resolusi pemeriksaan ulang (piksel per mm): kotak ≈ 195 piksel. */
const VERIFY_SCALE = 12;

/** "A3" → baris 0, kolom 2. */
function parseCell(label: string | undefined): { l: number; k: number } | null {
  const m = label?.trim().toUpperCase().match(/^([AB])\s*-?\s*([1-9])$/);
  return m ? { l: m[1] === "A" ? 0 : 1, k: Number(m[2]) - 1 } : null;
}

// ───────────────────────── Rubrik 5 dimensi & komentar ─────────────────────────

/** Bobot rubrik: kelengkapan goresan 30%, akhiran goresan 20%, proporsi 25%, posisi tengah 15%, kerapian 10%. */
const WEIGHTS: Record<Dimension, number> = { strokeCount: 0.3, strokeEnding: 0.2, proportion: 0.25, centerAlignment: 0.15, legibility: 0.1 };
/** Nilai huruf yang dianggap lulus. */
const PASS_SCORE = 70;
/** Posisi/ukuran di bawah ini ditandai otomatis walau AI tidak menandai (kotak rapi di uji ≥ 68). */
const PLACEMENT_MARK = 60;

export function gradeOf(score: number): CheckResult["grade"] {
  return score >= 90 ? "S" : score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D";
}

interface Cell {
  label: string;
  status: CellStatus;
  box: Box | null;
  read: string;
  issues: IssueCode[];
  stroke: number;
  detail: string;
  quadrant: Quadrant | null;
  dims: DimensionScores | null;
  score: number;
}

/** Masalah yang memang menyangkut goresan tertentu; untuk miring/keluar kotak dsb. nomor goresan tidak relevan. */
const STROKE_ISSUES = new Set<IssueCode>(["goresan_kurang", "goresan_lebih", "terlalu_panjang", "terlalu_pendek", "sambung", "terputus", "lengkung", "tanda", "tome", "hane", "harai"]);

const stripNumber = (tip: string) => tip.replace(/^\s*\d+[.)]\s*/, "").replace(/\.$/, "");

function strokeHint(c: SheetChar, stroke: number): string {
  const tip = stroke > 0 ? c.tips?.[stroke - 1] : undefined;
  return tip ? `Goresan ke-${stroke} seharusnya: ${stripNumber(tip).toLowerCase()}. ` : "";
}

function issueFix(c: SheetChar, code: IssueCode): string {
  const fix = ISSUES[code].fix;
  if (!fix.includes("{n}")) return fix;
  return c.strokes ? fix.replace("{n}", String(c.strokes)) : "Bandingkan jumlah dan urutan goresanmu dengan contoh.";
}

function markText(c: SheetChar, cell: Cell): { problem: string; fix: string } {
  const detail = cell.detail.trim().replace(/\.$/, "");
  if (cell.status === "kosong") return { problem: "Kotak ini belum diisi.", fix: "Isi semua kotak: makin sering ditulis, tanganmu makin hafal bentuknya." };
  if (cell.status === "salah") {
    const compare = cell.read ? compareChars(c.char, cell.read) : null;
    return {
      problem: cell.read ? `Tulisan ini terbaca ${cell.read}, padahal seharusnya ${c.char}.` : `Tulisan ini belum bisa dikenali sebagai ${c.char}.`,
      fix: compare ? `Bedanya — ${compare}` : `${strokeHint(c, cell.stroke)}Lihat lagi contohnya dan tulis pelan-pelan sesuai urutan goresan.`,
    };
  }
  const code = cell.issues[0] ?? "proporsi";
  const stroke = STROKE_ISSUES.has(code) ? cell.stroke : 0;
  const where = stroke > 0 ? ` (goresan ke-${stroke})` : "";
  const part = cell.quadrant && cell.quadrant !== "tengah" ? ` di bagian ${QUADRANT_NAME[cell.quadrant]}` : "";
  return { problem: `${ISSUES[code].label}${where}${part}${detail ? `: ${detail}` : ""}.`, fix: `${strokeHint(c, stroke)}${issueFix(c, code)}` };
}

function praiseText(counts: Record<CellStatus, number>, written: number): string {
  const neat = counts.rapi;
  if (!written) return "";
  if (neat === written) return `Semua ${written} kotak rapi dan konsisten. Hebat!`;
  const ratio = neat / written;
  if (ratio >= 0.8) return `${neat} dari ${written} kotak sudah rapi. Tulisan terbaikmu ditandai ✓, jadikan patokan.`;
  if (ratio >= 0.5) return `Lebih dari separuh kotak (${neat} dari ${written}) sudah rapi. Kamu di jalur yang benar!`;
  return `Kamu sudah menulis ${written} kotak. Fokus ke satu perbaikan di bawah, pasti cepat membaik.`;
}

function mostCommon<T>(items: T[]): T | undefined {
  const tally = new Map<T, number>();
  for (const i of items) tally.set(i, (tally.get(i) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/** Pesan Miu-chan untuk seluruh lembar, disusun dari hasil nyata. */
function summaryText(results: CharResult[]): string {
  const written = results.filter((r) => r.written);
  if (!written.length) return "Miu-chan belum menemukan tulisanmu. Isi kotak-kotaknya dulu, lalu foto lagi ya, nya~";
  const best = [...written].sort((a, b) => b.score - a.score)[0];
  const weak = [...written].sort((a, b) => a.score - b.score)[0];
  const wrong = results.reduce((n, r) => n + r.counts.salah, 0);
  if (weak.score >= 90 && !wrong) return `すごい！ Semua huruf sudah rapi, ${best.char} paling cantik. Tanganmu sudah hafal, ayo lanjut ke lembar berikutnya, nya~`;
  const praise = best.score >= 80 ? `Tulisan ${best.char}-mu sudah rapi sekali` : `Kamu sudah berusaha menulis ${written.length} huruf`;
  const focus = wrong
    ? `Hati-hati, ada ${wrong} kotak yang hurufnya tertukar; lihat tanda merah dan bedanya di bawah.`
    : `Sekarang fokus merapikan ${weak.char}, lihat catatan di kartunya ya.`;
  return `${praise}! ${focus} がんばって、nya~`;
}

function cleanRead(read: string | undefined): string {
  return read?.match(/[぀-ヿ一-鿿]/)?.[0] ?? "";
}

function toCell(p: RawProblem, c: SheetChar, base: Pick<Cell, "label" | "box">): Cell {
  const read = cleanRead(p.read);
  const issues = (p.issues ?? []).filter((i): i is IssueCode => i in ISSUES);
  let status: CellStatus = p.status;
  // "Salah" yang terbaca sebagai huruf yang diminta sebenarnya hanya kurang rapi
  if (status === "salah" && read === c.char) status = "kurang";
  if (status === "kurang" && !issues.length) issues.push("proporsi");
  const quadrant = (QUADRANTS as readonly string[]).includes(p.quadrant ?? "") ? (p.quadrant as Quadrant) : null;
  return { ...base, status, read: status === "salah" ? read : "", issues, stroke: Math.max(0, p.stroke ?? 0), detail: p.detail ?? "", quadrant, dims: null, score: 0 };
}

/**
 * Nilai 5 dimensi satu kotak. Posisi tengah dan proporsi diukur langsung dari gambar (deterministik); kelengkapan dan
 * akhiran goresan serta kerapian berasal dari kode masalah penilai AI.
 */
function scoreCell(cell: Cell, writing: GlyphShape | null, model: GlyphShape | null): Cell {
  if (cell.status === "kosong") return { ...cell, dims: null, score: 0 };
  const wrong = cell.status === "salah";
  const count = (d: Dimension) => cell.issues.filter((i) => DIMENSION_OF[i] === d).length;
  const placement = writing ? placementScore(writing) : null;
  const proportion = writing ? proportionScore(writing, model) : null;
  let next = cell;
  // Posisi/ukuran yang jelas meleset ditandai walau AI tidak menandainya
  if (cell.status === "rapi" && placement && placement.issue && placement.score < PLACEMENT_MARK) {
    next = { ...cell, status: "kurang", issues: [placement.issue], quadrant: placement.quadrant };
  } else if (next.status === "kurang" && !next.quadrant) {
    const code = next.issues[0];
    next = { ...next, quadrant: DIMENSION_OF[code] === "centerAlignment" ? (placement?.quadrant ?? null) : (proportion?.quadrant ?? null) };
  }
  const dims: DimensionScores = {
    strokeCountScore: wrong ? 0 : count("strokeCount") ? 40 : 100,
    strokeEndingScore: Math.max(30, 100 - 30 * count("strokeEnding")),
    proportionScore: wrong ? 0 : Math.min(proportion?.score ?? 100, next.issues.includes("proporsi") ? 55 : 100),
    centerAlignmentScore: Math.min(placement?.score ?? 100, next.issues.some((i) => DIMENSION_OF[i] === "centerAlignment") ? 60 : 100),
    legibilityScore: wrong ? 40 : next.issues.some((i) => DIMENSION_OF[i] === "legibility") ? 60 : 95,
  };
  const score = wrong
    ? 0
    : Math.round(
        WEIGHTS.strokeCount * dims.strokeCountScore +
          WEIGHTS.strokeEnding * dims.strokeEndingScore +
          WEIGHTS.proportion * dims.proportionScore +
          WEIGHTS.centerAlignment * dims.centerAlignmentScore +
          WEIGHTS.legibility * dims.legibilityScore,
      );
  return { ...next, dims, score };
}

function meanDims(cells: Cell[]): DimensionScores {
  const scored = cells.filter((x) => x.dims);
  const avg = (k: keyof DimensionScores) => (scored.length ? Math.round(scored.reduce((n, x) => n + x.dims![k], 0) / scored.length) : 0);
  return {
    strokeCountScore: avg("strokeCountScore"),
    strokeEndingScore: avg("strokeEndingScore"),
    proportionScore: avg("proportionScore"),
    centerAlignmentScore: avg("centerAlignmentScore"),
    legibilityScore: avg("legibilityScore"),
  };
}

/** Masalah utama huruf ini (untuk umpan balik dan riwayat). */
function mainIssueOf(cells: Cell[]): MainIssue | null {
  const wrong = cells.filter((x) => x.status === "salah" && x.read);
  const read = mostCommon(wrong.map((x) => x.read));
  if (read) return { key: `salah:${read}`, code: null, read, cells: wrong.filter((x) => x.read === read).map((x) => x.label), quadrant: null, stroke: 0 };
  const untidy = cells.filter((x) => x.status === "kurang");
  const code = mostCommon(untidy.flatMap((x) => x.issues));
  if (!code) return null;
  const withCode = untidy.filter((x) => x.issues.includes(code));
  return {
    key: code,
    code,
    read: "",
    cells: withCode.map((x) => x.label),
    quadrant: mostCommon(withCode.map((x) => x.quadrant).filter((q): q is Quadrant => !!q)) ?? null,
    stroke: STROKE_ISSUES.has(code) ? (mostCommon(withCode.map((x) => x.stroke).filter((s) => s > 0)) ?? 0) : 0,
  };
}

/** Area kuadran kotak (mm, relatif terhadap sudut kiri-atas kotak). */
function quadrantArea(q: Quadrant, B: number): [number, number, number, number] {
  if (q === "tengah") return [B / 4, B / 4, B / 2, B / 2];
  return [q.includes("kanan") ? B / 2 : 0, q.includes("bawah") ? B / 2 : 0, B / 2, B / 2];
}

function buildChar(c: SheetChar, cells: Cell[], row: Box | null, best: Box | null, attempt: number, focusOf: (cell: Cell) => Box | null): CharResult {
  const counts: Record<CellStatus, number> = { rapi: 0, kurang: 0, salah: 0, kosong: 0 };
  for (const x of cells) counts[x.status]++;
  const written = cells.length - counts.kosong;
  const score = written ? Math.round(cells.reduce((n, x) => n + x.score, 0) / cells.length) : 0;
  const marks = cells.flatMap((x): CheckMark[] =>
    x.status === "rapi" || !x.box
      ? []
      : [
          {
            box: x.box,
            kind: x.status,
            read: x.read,
            cell: x.label,
            quadrant: x.status === "kurang" ? x.quadrant : null,
            focus: x.status === "kurang" ? focusOf(x) : null,
            dimension: x.status === "kurang" && x.issues[0] ? DIMENSION_OF[x.issues[0]] : x.status === "salah" ? "strokeCount" : null,
            severity: x.status === "salah" ? "berat" : x.status === "kurang" && x.score < 60 ? "sedang" : "ringan",
            ...markText(c, x),
          },
        ],
  );
  const issue = written ? mainIssueOf(cells) : null;
  const feedback = buildNekoFeedback(c, score, issue, attempt, counts.salah);
  return {
    char: c.char,
    reading: c.reading,
    row,
    best: counts.rapi ? best : null,
    written,
    neat: counts.rapi,
    counts,
    score,
    isPass: score >= PASS_SCORE,
    dimensionScores: meanDims(cells),
    nekoFeedback: written
      ? feedback
      : { ...feedback, emotionState: "encouraging", headlineText: "Ayo mulai, nya~", detailedExplanation: `Belum ada tulisan untuk ${c.char}.`, actionableTip: "Mulai dengan menebalkan huruf abu-abu, lalu tulis sendiri di kotak kosong." },
    issueKey: issue?.key ?? null,
    praise: praiseText(counts, written),
    tip: feedback.actionableTip,
    marks,
  };
}

function finish(results: CharResult[], precise: boolean): CheckResult {
  const score = results.length ? Math.round(results.reduce((n, r) => n + r.score, 0) / results.length) : 0;
  // Predikat "sempurna" (S) hanya bila tidak ada huruf yang tertukar
  const grade = gradeOf(score) === "S" && results.some((r) => r.counts.salah) ? "A" : gradeOf(score);
  return { photoOk: true, photoProblem: "", precise, score, grade, isPass: score >= PASS_SCORE, summary: summaryText(results), chars: results };
}

// ───────────────────────── Jalur tepat: lembar bertanda ─────────────────────────

function photoBox(h: Matrix, size: { width: number; height: number }, x: number, y: number, w: number, hh: number): Box {
  const pts = ([[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]] as Point[]).map((p) => apply(h, p));
  const xs = pts.map((p) => (p[0] / size.width) * 1000);
  const ys = pts.map((p) => (p[1] / size.height) * 1000);
  const clamp = (n: number) => Math.max(0, Math.min(1000, Math.round(n)));
  return [clamp(Math.min(...ys)), clamp(Math.min(...xs)), clamp(Math.max(...ys)), clamp(Math.max(...xs))];
}

/**
 * Pemeriksaan dua tahap supaya hasilnya konsisten:
 *  1. Menjaring: tiga penilai melihat tiga versi gambar (asli, kontras tinggi, hitam-putih). Kotak yang dicurigai
 *     salah satu penilai menjadi kandidat, supaya tidak ada kesalahan yang terlewat.
 *  2. Memastikan: setiap kandidat diperiksa ulang satu per satu dalam resolusi tinggi, berdampingan dengan huruf
 *     contoh, oleh dua penilai. Tanda hanya diberikan bila keduanya sepakat; "huruf salah" hanya bila keduanya bilang salah.
 * Bila tahap 2 gagal (layanan sibuk), dipakai suara terbanyak tahap 1.
 */
type Verdict = Pick<RawProblem, "read" | "issues" | "stroke" | "quadrant" | "detail"> & { status: "rapi" | "kurang" | "salah" };

/** Suara terbanyak tahap 1 untuk satu kotak (cadangan bila pemeriksaan ulang tidak tersedia). */
function majority(votes: (RawProblem | null)[]): RawProblem | null {
  const flagged = votes.filter((v): v is RawProblem => !!v && v.status !== "kosong");
  if (flagged.length * 2 <= votes.length) return null;
  const wrong = flagged.filter((v) => v.status === "salah");
  if (wrong.length * 2 > votes.length) return wrong[0];
  const untidy = flagged.find((v) => v.status === "kurang") ?? flagged[0];
  return { ...untidy, status: "kurang", read: "" };
}

/**
 * Putusan akhir satu kandidat dari semua suara (3 penjaring + 2 pemeriksa ulang):
 *  - ditandai bila mayoritas penjaring (≥2 dari 3) didukung minimal satu pemeriksa ulang, atau kedua pemeriksa ulang sepakat;
 *  - "huruf salah" bila mayoritas penjaring bilang salah dan minimal satu pemeriksa ulang juga bilang salah (atau keduanya);
 *    selain itu "kurang rapi".
 * Masalah posisi/ukuran (keluar kotak, terlalu kecil) ditangkap ukuran deterministik, bukan di sini.
 */
function settle(verdicts: (Verdict | undefined)[], stage1: (RawProblem | null)[]): RawProblem | null {
  const got = verdicts.filter((v): v is Verdict => !!v);
  if (!got.length) return majority(stage1);
  const flagged1 = stage1.filter((v): v is RawProblem => !!v && v.status !== "kosong");
  const wrong1 = flagged1.filter((v) => v.status === "salah");
  const flagged2 = got.filter((v) => v.status !== "rapi");
  const wrong2 = got.filter((v) => v.status === "salah");
  const half = stage1.length / 2;
  const isFlagged = (flagged1.length > half && flagged2.length >= 1) || (got.length >= 2 && flagged2.length === got.length);
  if (!isFlagged) return null;
  const isWrong = (wrong1.length > half && wrong2.length >= 1) || (got.length >= 2 && wrong2.length === got.length);
  if (isWrong) {
    // Huruf yang terbaca: utamakan yang berupa huruf Jepang
    const read = [...wrong2, ...wrong1].map((v) => cleanRead(v.read)).find(Boolean) ?? "";
    return { ...(wrong2[0] ?? wrong1[0]), status: "salah", read };
  }
  const untidy = [...flagged2, ...flagged1].find((v) => v.status === "kurang" && v.issues?.length) ?? flagged2[0] ?? flagged1[0];
  return { ...untidy, status: "kurang", read: "" };
}

/** Tunggu SEMUA penilai (hasil tidak bergantung pada siapa yang lebih cepat); yang gagal dilewati. */
async function allVotes<T>(promises: Promise<T>[]): Promise<T[]> {
  const settled = await Promise.allSettled(promises);
  const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!ok.length) {
    const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw failed?.reason instanceof Error ? failed.reason : new Error("Penilaian tulisan gagal");
  }
  return ok;
}

/** Kotak A1–A3 berisi huruf abu-abu cetak untuk ditebalkan. */
const TRACED_COLS = 3;

/** Resolusi kotak yang diluruskan (piksel per mm): kotak 15mm ≈ 130 piksel termasuk tepi. */
const CELL_SCALE = 8;
const CELL_PAD = 0.6;

async function checkMarked(
  apiKey: string,
  img: RawImage,
  h: Matrix,
  g: Geometry,
  script: Script,
  chars: SheetChar[],
  deadline: number,
  judgeModels: ModelChoice[],
  history: Record<string, number>,
  debug?: Debug,
): Promise<CheckResult> {
  const cols = PRINT_LAYOUT.cols;
  const side = g.box + 2 * CELL_PAD;
  const grab = (x: number, y: number) => rectify(img, h, { x: x - CELL_PAD, y: y - CELL_PAD, w: side, h: side }, CELL_SCALE);
  const sheets = chars.map((_, ci) => {
    const cells = [0, 1].map((l) => Array.from({ length: cols }, (_, k) => grab(...cellOrigin(g, ci, l, k))));
    const [mx, my] = cellOrigin(g, ci, 0, -1);
    const modelImg = grab(mx, my);
    return { cells, modelImg, labeled: composeLabeled(modelImg, cells) };
  });
  // Tinta per kotak (tanpa tepi kotak)
  const pad = Math.round(CELL_PAD * CELL_SCALE);
  const ink = sheets.map((s) => s.cells.map((row) => row.map((c) => inkRatio(c, pad, pad, c.width - 2 * pad))));
  // Ukuran deterministik (grid juuji): huruf contoh cetak dan tulisan di tiap kotak
  const models = sheets.map((s) => measureModel(s.modelImg, pad));
  const shapes = sheets.map((s) => s.cells.map((row) => row.map((c) => measureWriting(c, pad))));
  type Variant = 0 | 1 | 2;
  const encode = (image: RawImage, variant: Variant) => {
    const base = sharp(image.data, { raw: { width: image.width, height: image.height, channels: 3 } });
    // Tiga sudut pandang gambar: asli, kontras tinggi, hitam-putih. Kesalahan nyata terlihat di semuanya.
    const view = variant === 1 ? base.linear(1.25, -30).sharpen() : variant === 2 ? base.greyscale().normalise() : base;
    return view.jpeg({ quality: 88 }).toBuffer();
  };
  const jpegs = await Promise.all(([0, 1, 2] as const).map((variant) => Promise.all(sheets.map(({ labeled: { image } }) => encode(image, variant)))));
  if (debug) debug.images = jpegs[0];

  const partsFor = (variant: Variant): Part[] => [
    {
      text: `Kamu guru menulis ${SCRIPT_NAME[script]} yang teliti dan adil untuk pelajar Indonesia pemula.
Berikut ${chars.length} gambar hasil pindaian lembar latihan, satu gambar per huruf. Di setiap gambar:
- kotak paling kiri (berbingkai merah) = contoh cetak, BUKAN tulisan siswa; pakai sebagai pembanding bentuk.
- di kanannya 2 baris kotak tulisan, baris A (atas) dan B (bawah), kolom bernomor 1–9 di atasnya. Sebut kotak dengan
  label seperti "A3" atau "B7" (huruf baris B tergambar seperti "b"). Kotak A1–A3 berisi huruf abu-abu cetak untuk ditebalkan; kotak lain ditulis sendiri.
Untuk setiap gambar, cantumkan HANYA kotak yang bermasalah di problems (field cell = labelnya), dan best = label kotak
tulisan terbaik. Variasi kecil gaya tulisan tangan tetap dianggap rapi; tandai "kurang" hanya bila guru memang akan
mencoretnya.
${RULES}`,
    },
    ...chars.flatMap((c, i): Part[] => [
      { text: `Gambar ${i + 1}: huruf ${charInfo(c)}` },
      { inline_data: { mime_type: "image/jpeg", data: jpegs[variant][i].toString("base64") } },
    ]),
  ];

  // ── Tahap 1: menjaring (tiga penilai paralel) ──
  const stage1Deadline = Math.min(deadline, Date.now() + STAGE1_BUDGET_MS);
  const votes = await allVotes(([0, 1, 2] as const).map((variant) => gemini<LabelJudged>(apiKey, partsFor(variant), LABEL_SCHEMA, judgeModels, stage1Deadline, 7 + variant)));
  const size = { width: img.width, height: img.height };
  const stage1 = chars.map((_, ci) =>
    votes.map((judged) => {
      const sheet = judged.sheets.find((s) => s.image === ci + 1) ?? judged.sheets[ci];
      const grid: (RawProblem | null)[][] = [Array(cols).fill(null), Array(cols).fill(null)];
      for (const p of sheet?.problems ?? []) {
        const at = parseCell(p.cell);
        if (at && !grid[at.l][at.k]) grid[at.l][at.k] = p;
      }
      return { grid, best: sheet?.best };
    }),
  );

  // ── Tahap 2: memastikan setiap kotak yang dicurigai, satu per satu dalam resolusi tinggi ──
  const candidates: { ci: number; l: number; k: number; id: string }[] = [];
  stage1.forEach((grids, ci) => {
    for (let l = 0; l < 2; l++)
      for (let k = 0; k < cols; k++) {
        const suspected = grids.some(({ grid }) => grid[l][k] && grid[l][k]!.status !== "kosong");
        if (suspected && ink[ci][l][k] >= INK_EMPTY && candidates.length < MAX_CANDIDATES) candidates.push({ ci, l, k, id: `V${candidates.length + 1}` });
      }
  });
  const verdicts = new Map<string, (Verdict | undefined)[]>();
  if (candidates.length) {
    const grabHi = (x: number, y: number) => rectify(img, h, { x: x - CELL_PAD, y: y - CELL_PAD, w: side, h: side }, VERIFY_SCALE);
    const modelHi = chars.map((_, ci) => grabHi(...cellOrigin(g, ci, 0, -1)));
    const pairs = candidates.map(({ ci, l, k }) => composePair(modelHi[ci], grabHi(...cellOrigin(g, ci, l, k))));
    const pairJpegs = await Promise.all(([0, 1] as const).map((variant) => Promise.all(pairs.map((image) => encode(image, variant)))));
    const used = [...new Set(candidates.map((x) => x.ci))];
    const verifyParts = (variant: 0 | 1): Part[] => [
      {
        text: `Kamu guru menulis ${SCRIPT_NAME[script]} yang teliti dan adil untuk pelajar Indonesia pemula. Ini PEMERIKSAAN ULANG
kotak-kotak yang dicurigai bermasalah. Setiap gambar: KIRI = huruf contoh cetak (bentuk yang benar), KANAN = tulisan siswa
di satu kotak. Banyak kecurigaan ternyata keliru, jadi periksa dengan teliti dan adil.
Huruf yang dilatih:
${used.map((ci) => `- ${charInfo(chars[ci])}`).join("\n")}
Untuk setiap [id], status:
- "rapi": hurufnya benar dan bentuknya wajar dibanding contoh (variasi tulisan tangan dan sedikit tidak sempurna tetap rapi).
- "kurang": hurufnya benar tetapi ada masalah bentuk yang JELAS dan akan dicoret guru.
- "salah": yang tertulis huruf lain / tidak bisa dikenali sebagai huruf yang diminta (isi read dengan huruf Jepang yang
  terbaca, mis. り atau ツ, BUKAN romaji).
Untuk "kurang"/"salah" isi juga issues, stroke, quadrant, dan detail seperti aturan berikut.
${RULES}`,
      },
      ...candidates.flatMap(({ ci, l, k, id }, i): Part[] => [
        { text: `[${id}] seharusnya ${chars[ci].char} (${chars[ci].reading}), kotak ${l ? "B" : "A"}${k + 1}${l === 0 && k < TRACED_COLS ? " (kotak tebalkan)" : ""}` },
        { inline_data: { mime_type: "image/jpeg", data: pairJpegs[variant][i].toString("base64") } },
      ]),
    ];
    const checks = await allVotes(([0, 1] as const).map((variant) => gemini<VerifyJudged>(apiKey, verifyParts(variant), VERIFY_SCHEMA, judgeModels, deadline, 21 + variant))).catch(
      () => [] as VerifyJudged[],
    );
    for (const { id } of candidates) {
      verdicts.set(
        id,
        checks.map((r) => r.checks.find((x) => x.id.replace(/[[\]\s]/g, "") === id)),
      );
    }
    if (debug) debug.ms = { ...debug.ms, candidates: candidates.length, verifyVotes: checks.length };
    if (debug) debug.verify = candidates.map((c) => ({ ...c, label: `${chars[c.ci].char}${c.l ? "B" : "A"}${c.k + 1}`, stage1: stage1[c.ci].map(({ grid }) => grid[c.l][c.k]?.status ?? "-"), verdicts: (verdicts.get(c.id) ?? []).map((v) => (v ? `${v.status}${v.read ? ":" + v.read : ""}` : "?")) }));
  }

  const results = chars.map((c, ci) => {
    const grids = stage1[ci];
    const grid: (RawProblem | null)[][] = [Array(cols).fill(null), Array(cols).fill(null)];
    for (const cand of candidates.filter((x) => x.ci === ci)) {
      grid[cand.l][cand.k] = settle(verdicts.get(cand.id) ?? [], grids.map(({ grid: gr }) => gr[cand.l][cand.k]));
    }
    // Kotak yang dinilai kosong oleh mayoritas tetap mengikuti hitungan tinta di bawah
    for (let l = 0; l < 2; l++)
      for (let k = 0; k < cols; k++) {
        if (grid[l][k]) continue;
        const empty = grids.filter(({ grid: gr }) => gr[l][k]?.status === "kosong");
        if (empty.length * 2 > grids.length) grid[l][k] = empty[0].grid[l][k];
      }
    const cells: Cell[] = [];
    for (let l = 0; l < 2; l++) {
      for (let k = 0; k < cols; k++) {
        const [x, y] = cellOrigin(g, ci, l, k);
        const box = photoBox(h, size, x, y, g.box, g.box);
        const p = grid[l][k];
        const v = ink[ci][l][k];
        const label = `${l ? "B" : "A"}${k + 1}`;
        let cell: Cell = p
          ? toCell(p, c, { label, box })
          : { label, status: "rapi", box, read: "", issues: [], stroke: 0, detail: "", quadrant: null, dims: null, score: 0 };
        // Kosong dipastikan dengan tinta; tulisan yang dinilai salah/kurang tetap dipertahankan
        if (cell.status === "rapi" && v < INK_EMPTY) cell = { ...cell, status: "kosong" };
        else if (cell.status === "kosong" && v >= INK_WRITTEN) cell = { ...cell, status: "rapi" };
        cells.push(scoreCell(cell, shapes[ci][l][k], models[ci]));
      }
    }
    // Tulisan terbaik dipilih dari kotak yang ditulis sendiri (bukan kotak abu-abu yang ditebalkan)
    const own = (l: number, k: number) => !(l === 0 && k < TRACED_COLS);
    const bestAt = grids.map((x) => parseCell(x.best)).find((b) => b && own(b.l, b.k) && cells[b.l * cols + b.k].status === "rapi") ?? null;
    const fallback = cells.findIndex((x, i) => x.status === "rapi" && own(Math.floor(i / cols), i % cols));
    const best = bestAt ? cells[bestAt.l * cols + bestAt.k].box : fallback >= 0 ? cells[fallback].box : null;
    const [x0, y0] = cellOrigin(g, ci, 0, 0);
    const row = photoBox(h, size, x0, y0, cols * g.box + (cols - 1) * PRINT_LAYOUT.colGap, 2 * g.box + PRINT_LAYOUT.lineGap);
    if (debug) (debug.cells ??= [])[ci] = cells;
    const focusOf = (cell: Cell) => {
      if (!cell.quadrant) return null;
      const [l, k] = [cell.label[0] === "B" ? 1 : 0, Number(cell.label.slice(1)) - 1];
      const [x, y] = cellOrigin(g, ci, l, k);
      const [qx, qy, qw, qh] = quadrantArea(cell.quadrant, g.box);
      return photoBox(h, size, x + qx, y + qy, qw, qh);
    };
    // Riwayat dibaca untuk masalah utama huruf ini (lihat nekoFeedback)
    const issue = mainIssueOf(cells);
    return buildChar(c, cells, row, best, issue ? (history[`${c.char}|${issue.key}`] ?? 0) : 0, focusOf);
  });
  return finish(results, true);
}

// ───────────────────────── Utama ─────────────────────────

export interface Debug {
  verify?: unknown[];
  marked?: boolean;
  images?: Buffer[];
  cells?: Cell[][];
  ms?: Record<string, number>;
}

/** Batas bawah "tinta berada di dalam kotak"; kisi yang pas ≈ 0,95, meleset 1/3 kotak ≈ 0,55 (lihat inkFit). */
const INK_FIT_MIN = 0.75;

/**
 * Periksa foto. `corners` = 4 sudut kisi kotak di foto (skala 0–1: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah),
 * hasil pemindai kamera di web yang sudah dicocokkan dengan garis kotak dan dilihat pengguna.
 */
export async function checkHandwriting(
  apiKey: string,
  image: { data: string; mimeType: string },
  script: Script,
  chars: SheetChar[],
  corners: Point[],
  options: { judge?: ModelChoice[]; debug?: Debug; history?: Record<string, number> } = {},
): Promise<CheckResult> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const t0 = Date.now();
  const { data, info } = await sharp(Buffer.from(image.data, "base64")).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const img: RawImage = { data, width: info.width, height: info.height, channels: info.channels };
  const g = geometry(chars.length);
  const px = corners.map(([x, y]) => [x * img.width, y * img.height] as Point);
  const notAligned = (): CheckResult => ({
    photoOk: false,
    photoProblem: "Kotak-kotak di foto belum terbaca dengan tepat. Foto ulang dari atas dengan seluruh kotak terlihat dan cahaya terang.",
    precise: true,
    score: 0,
    grade: "D",
    isPass: false,
    summary: "",
    chars: [],
  });
  let h: Matrix;
  try {
    h = homography(g.corners, px);
  } catch {
    return notAligned();
  }
  const { fit, density } = inkFit(img, g, h);
  if (options.debug) options.debug.ms = { prepare: Date.now() - t0, fit: Math.round(fit * 1000) };
  if (density < 0.004) {
    return { ...notAligned(), photoProblem: "Miu-chan belum menemukan tulisan di dalam kotak. Tulis dulu di kotak-kotaknya, lalu foto lagi." };
  }
  if (fit < INK_FIT_MIN) return notAligned();
  return checkMarked(apiKey, img, h, g, script, chars, deadline, options.judge ?? JUDGE_MODELS, options.history ?? {}, options.debug);
}
