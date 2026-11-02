/**
 * Penilaian tulisan di kanvas (Gerbang Tulis jalur kanvas) terhadap goresan KanjiVG, tanpa AI.
 * Kanvas merekam setiap goresan beserta urutannya, jadi di jalur ini urutan dan arah goresan bisa dinilai,
 * sesuatu yang tidak mungkin dari foto kertas.
 *
 * Bobot (spesifikasi Workbook Gate): urutan goresan 30%, proporsi 25%, keseimbangan kuadran 20%,
 * bentuk/kelengkungan goresan 15%, letak di kotak 10%.
 */
import { placementScore, shapeOf, type GlyphShape } from "../../tulis/cellMetrics";
import { KANJIVG_SIZE, samplePath } from "../../tulis/kanjiVg";

export type Pt = [number, number];

export interface CanvasDims {
  strokeOrder: number;
  proportion: number;
  balance: number;
  curvature: number;
  placement: number;
}

export const CANVAS_WEIGHTS: CanvasDims = { strokeOrder: 0.3, proportion: 0.25, balance: 0.2, curvature: 0.15, placement: 0.1 };

export interface CanvasResult {
  score: number;
  /** rapi = hijau, kurang = kuning, salah = merah, kosong = belum ditulis. */
  status: "rapi" | "kurang" | "salah" | "kosong";
  dims: CanvasDims;
  strokes: { written: number; expected: number };
  /** Catatan yang bisa langsung dibaca siswa, paling penting dulu. */
  notes: string[];
}

const RESAMPLE = 16;

function length(stroke: Pt[]): number {
  let n = 0;
  for (let i = 1; i < stroke.length; i++) n += Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]);
  return n;
}

/** `count` titik berjarak sama di sepanjang goresan. */
export function resample(stroke: Pt[], count: number): Pt[] {
  if (stroke.length === 0) return [];
  const total = length(stroke);
  if (stroke.length === 1 || total === 0) return Array.from({ length: count }, () => stroke[0]);
  const step = total / (count - 1);
  const out: Pt[] = [stroke[0]];
  let need = step;
  for (let i = 1; i < stroke.length && out.length < count; i++) {
    let [ax, ay] = stroke[i - 1];
    const [bx, by] = stroke[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg >= need && out.length < count) {
      const t = need / seg;
      ax += (bx - ax) * t;
      ay += (by - ay) * t;
      out.push([ax, ay]);
      seg -= need;
      need = step;
    }
    need -= seg;
  }
  while (out.length < count) out.push(stroke[stroke.length - 1]);
  return out;
}

/** Skala seragam ke batas huruf sendiri, supaya urutan dibandingkan tanpa terganggu letak/ukuran tulisan. */
function normalizeGlyph(strokes: Pt[][]): Pt[][] {
  const all = strokes.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const side = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0, 1e-6);
  const ox = (side - (Math.max(...xs) - x0)) / 2;
  const oy = (side - (Math.max(...ys) - y0)) / 2;
  return strokes.map((s) => s.map(([x, y]) => [(x - x0 + ox) / side, (y - y0 + oy) / side] as Pt));
}

function meanDistance(a: Pt[], b: Pt[]): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) n += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
  return n / a.length;
}

/** Titik rapat di sepanjang goresan (mirip piksel tinta) untuk mengukur bentuk huruf. */
function inkOf(strokes: Pt[][]): { x: number; y: number }[] {
  return strokes.flatMap((s) => resample(s, Math.max(2, Math.ceil(length(s) / 0.004))).map(([x, y]) => ({ x, y })));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function balanceScore(user: GlyphShape, ref: GlyphShape): number {
  const d = user.quad.reduce((n, v, i) => n + Math.abs(v - ref.quad[i]), 0);
  return Math.round(100 - clamp01((d - 0.12) / 0.5) * 85);
}

function proportionOf(user: GlyphShape, ref: GlyphShape): number {
  const aspect = (b: GlyphShape["bbox"]) => Math.max(0.05, b[2] - b[0]) / Math.max(0.05, b[3] - b[1]);
  const ratio = Math.abs(Math.log(aspect(user.bbox) / aspect(ref.bbox)));
  return Math.round(100 - clamp01((ratio - 0.12) / 0.5) * 85);
}

/** Pasangkan goresan siswa dengan goresan contoh: biaya terkecil dulu, masing-masing sekali. */
function matchStrokes(user: Pt[][], ref: Pt[][]) {
  const pairs: { i: number; j: number; cost: number; reversed: boolean }[] = [];
  for (let i = 0; i < user.length; i++)
    for (let j = 0; j < ref.length; j++) {
      const fwd = meanDistance(user[i], ref[j]);
      const rev = meanDistance([...user[i]].reverse(), ref[j]);
      pairs.push({ i, j, cost: Math.min(fwd, rev), reversed: rev < fwd });
    }
  pairs.sort((a, b) => a.cost - b.cost);
  const byUser = new Map<number, (typeof pairs)[number]>();
  const usedRef = new Set<number>();
  for (const p of pairs) {
    if (byUser.has(p.i) || usedRef.has(p.j)) continue;
    byUser.set(p.i, p);
    usedRef.add(p.j);
  }
  return byUser;
}

/**
 * Nilai satu huruf. `written` = goresan siswa dalam koordinat kanvas 0–1 (kanvas persegi = kotak tulis);
 * `refPaths` = path KanjiVG berurutan.
 */
export function scoreCanvasChar(written: Pt[][], refPaths: string[]): CanvasResult {
  const strokes = written.filter((s) => s.length > 0);
  const expected = refPaths.length;
  const empty: CanvasDims = { strokeOrder: 0, proportion: 0, balance: 0, curvature: 0, placement: 0 };
  if (!strokes.length) return { score: 0, status: "kosong", dims: empty, strokes: { written: 0, expected }, notes: ["Huruf ini belum ditulis."] };

  const refRaw = refPaths.map((d) => samplePath(d).map(([x, y]) => [x / KANJIVG_SIZE, y / KANJIVG_SIZE] as Pt));
  const userN = normalizeGlyph(strokes).map((s) => resample(s, RESAMPLE));
  const refN = normalizeGlyph(refRaw).map((s) => resample(s, RESAMPLE));
  const matched = matchStrokes(userN, refN);
  const slots = Math.max(strokes.length, expected);

  const notes: string[] = [];
  let inOrder = 0;
  let curveSum = 0;
  for (let i = 0; i < strokes.length; i++) {
    const m = matched.get(i);
    if (!m) continue;
    curveSum += 100 - clamp01((m.cost - 0.05) / 0.17) * 100;
    // Goresan yang bentuknya jauh berbeda tidak dihitung "urut" walaupun nomornya cocok
    const recognizable = m.cost < 0.2;
    if (m.j === i && !m.reversed && recognizable) inOrder++;
    else if (recognizable && m.j !== i) notes.push(`Goresan ke-${i + 1}-mu seharusnya ditulis sebagai goresan ke-${m.j + 1}.`);
    else if (recognizable && m.reversed) notes.push(`Goresan ke-${i + 1} arahnya terbalik.`);
  }
  if (strokes.length !== expected) notes.unshift(`Kamu menulis ${strokes.length} goresan, seharusnya ${expected}.`);

  const userShape = shapeOf(inkOf(strokes), { x0: 0, y0: 0, x1: 1, y1: 1 });
  const refShape = shapeOf(inkOf(refRaw), { x0: 0, y0: 0, x1: 1, y1: 1 });
  const placement = userShape ? placementScore(userShape) : null;
  if (placement?.issue === "terlalu_kecil") notes.push("Tulisannya terlalu kecil; isi kotak lebih penuh.");
  else if (placement?.issue === "tidak_tengah") notes.push("Letakkan huruf di tengah kotak, pakai garis bantu silang.");
  else if (placement?.issue === "keluar_kotak") notes.push("Ada goresan yang keluar dari kotak.");

  const dims: CanvasDims = {
    strokeOrder: Math.round((100 * inOrder) / slots),
    proportion: userShape && refShape ? proportionOf(userShape, refShape) : 0,
    balance: userShape && refShape ? balanceScore(userShape, refShape) : 0,
    curvature: Math.round(curveSum / slots),
    placement: placement?.score ?? 0,
  };
  const score = Math.round((Object.keys(CANVAS_WEIGHTS) as (keyof CanvasDims)[]).reduce((n, k) => n + CANVAS_WEIGHTS[k] * dims[k], 0));
  const wrongShape = dims.curvature < 35 || Math.abs(strokes.length - expected) >= 3;
  // Warna mengikuti spesifikasi: merah = urutan/arah/jumlah goresan salah atau tak terbaca;
  // kuning = urutan benar tetapi bentuk/letaknya kurang; hijau = sempurna.
  const strokeError = strokes.length !== expected || inOrder < strokes.length;
  const status = wrongShape || strokeError ? "salah" : score >= 85 ? "rapi" : "kurang";
  if (wrongShape) notes.unshift("Bentuknya belum dikenali sebagai huruf yang diminta.");
  // Huruf yang tidak dikenali bernilai 0, sama seperti huruf tertukar di jalur kertas
  return { score: wrongShape ? 0 : score, status, dims, strokes: { written: strokes.length, expected }, notes: notes.slice(0, 4) };
}
