/**
 * Ukuran deterministik tulisan di satu kotak yang sudah diluruskan (grid juuji 2×2). Tidak memakai AI, sehingga
 * kotak yang sama selalu mendapat nilai yang sama:
 *  - posisi tengah & ukuran: titik tengah tulisan dibanding persilangan garis bantu;
 *  - keluar kotak: tinta yang menempel/melewati tepi kotak;
 *  - proporsi: sebaran tinta di 4 kuadran tulisan dibanding huruf contoh cetak di foto yang sama.
 */
import type { Quadrant } from "./writingGuide";
import type { RawImage } from "./sheetLayout";

export interface GlyphShape {
  /** Batas tulisan dalam pecahan kotak 0–1: [kiri, atas, kanan, bawah]. */
  bbox: [number, number, number, number];
  /** Sebaran tinta di 4 kuadran tulisan: kiri-atas, kanan-atas, kiri-bawah, kanan-bawah (jumlah 1). */
  quad: [number, number, number, number];
  /** Tinta di dekat atau melewati tepi kotak, dibanding seluruh tinta. */
  edge: number;
}

const QUAD_KEYS: Quadrant[] = ["kiri_atas", "kanan_atas", "kiri_bawah", "kanan_bawah"];

/** Peta tinta di area kotak (pecahan 0–1 dari gambar). Garis abu-abu tipis, kertas, dan warna merah tidak terhitung. */
function inkPoints(img: RawImage, area: { x0: number; y0: number; x1: number; y1: number }) {
  const { width: W, height: H, channels: C, data } = img;
  const lum: number[] = [];
  const pts: { x: number; y: number; l: number; red: boolean }[] = [];
  for (let y = Math.floor(area.y0 * H); y < Math.ceil(area.y1 * H); y++)
    for (let x = Math.floor(area.x0 * W); x < Math.ceil(area.x1 * W); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = (y * W + x) * C;
      const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      lum.push(l);
      pts.push({ x: x / W, y: y / H, l, red: data[p] - (data[p + 1] + data[p + 2]) / 2 > 45 });
    }
  const sorted = [...lum].sort((a, b) => a - b);
  const paper = sorted[Math.floor(sorted.length * 0.9)] || 1;
  return pts.filter((p) => !p.red && p.l < paper * 0.6);
}

/**
 * Bentuk tulisan dari titik-titik tinta di dalam `box` (koordinat bebas, mis. titik goresan kanvas). Titik sebaiknya
 * rapat dan merata, seperti piksel tinta.
 */
export function shapeOf(points: { x: number; y: number }[], box: { x0: number; y0: number; x1: number; y1: number }): GlyphShape | null {
  return shape(points, box);
}

function shape(points: { x: number; y: number }[], box: { x0: number; y0: number; x1: number; y1: number }): GlyphShape | null {
  if (points.length < 12) return null;
  const xs = points.map((p) => p.x).sort((a, b) => a - b);
  const ys = points.map((p) => p.y).sort((a, b) => a - b);
  // Batas dengan persentil supaya serpihan kecil tidak menggeser hasil
  const q = (arr: number[], f: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * f)))];
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  const bbox: GlyphShape["bbox"] = [(q(xs, 0.02) - box.x0) / w, (q(ys, 0.02) - box.y0) / h, (q(xs, 0.98) - box.x0) / w, (q(ys, 0.98) - box.y0) / h];
  const cx = box.x0 + ((bbox[0] + bbox[2]) / 2) * w;
  const cy = box.y0 + ((bbox[1] + bbox[3]) / 2) * h;
  const quad: GlyphShape["quad"] = [0, 0, 0, 0];
  let edge = 0;
  for (const p of points) {
    quad[(p.y < cy ? 0 : 2) + (p.x < cx ? 0 : 1)]++;
    const fx = (p.x - box.x0) / w;
    const fy = (p.y - box.y0) / h;
    if (fx < 0.05 || fx > 0.95 || fy < 0.05 || fy > 0.95) edge++;
  }
  const n = points.length;
  return { bbox, quad: quad.map((v) => v / n) as GlyphShape["quad"], edge: edge / n };
}

/**
 * Tulisan siswa di satu kotak. `pad` = lebar tepi di luar kotak pada gambar (piksel), supaya tinta yang melewati tepi
 * kotak ikut terukur.
 */
export function measureWriting(img: RawImage, pad: number): GlyphShape | null {
  const px = pad / img.width;
  const py = pad / img.height;
  const box = { x0: px, y0: py, x1: 1 - px, y1: 1 - py };
  // Garis tepi kotak sendiri (±3% di sekeliling tepi) tidak dihitung sebagai tinta
  const inner = inkPoints(img, { x0: 0, y0: 0, x1: 1, y1: 1 }).filter((p) => {
    const fx = (p.x - box.x0) / (box.x1 - box.x0);
    const fy = (p.y - box.y0) / (box.y1 - box.y0);
    const nearLine = (v: number) => Math.abs(v) < 0.03 || Math.abs(v - 1) < 0.03;
    return !nearLine(fx) && !nearLine(fy);
  });
  return shape(inner, box);
}

/** Huruf contoh cetak (bagian atas kotak contoh; bawahnya tulisan latin merah). */
export function measureModel(img: RawImage, pad: number): GlyphShape | null {
  const px = pad / img.width;
  const py = pad / img.height;
  const w = 1 - 2 * px;
  const h = 1 - 2 * py;
  const region = { x0: px + 0.12 * w, y0: py + 0.06 * h, x1: px + 0.88 * w, y1: py + 0.74 * h };
  return shape(inkPoints(img, region), { x0: px, y0: py, x1: 1 - px, y1: 1 - py });
}

export interface Placement {
  score: number;
  issue: "tidak_tengah" | "terlalu_kecil" | "keluar_kotak" | null;
  quadrant: Quadrant;
}

/** Nilai posisi tengah & ukuran (0–100) dan masalah utamanya. */
export function placementScore(s: GlyphShape): Placement {
  const [x0, y0, x1, y1] = s.bbox;
  const dx = (x0 + x1) / 2 - 0.5;
  const dy = (y0 + y1) / 2 - 0.5;
  const off = Math.max(Math.abs(dx), Math.abs(dy));
  const size = Math.max(x1 - x0, y1 - y0);
  const offPenalty = Math.min(1, Math.max(0, (off - 0.08) / 0.17)) * 60;
  const smallPenalty = Math.min(1, Math.max(0, (0.42 - size) / 0.2)) * 50;
  const edgePenalty = Math.min(1, Math.max(0, (s.edge - 0.12) / 0.25)) * 55;
  const score = Math.round(Math.max(0, 100 - offPenalty - smallPenalty - edgePenalty));
  const worst = Math.max(offPenalty, smallPenalty, edgePenalty);
  const issue = worst < 15 ? null : worst === edgePenalty ? "keluar_kotak" : worst === smallPenalty ? "terlalu_kecil" : "tidak_tengah";
  const quadrant: Quadrant = off < 0.06 ? "tengah" : ((dy < 0 ? "kiri_atas" : "kiri_bawah").replace("kiri", dx < 0 ? "kiri" : "kanan") as Quadrant);
  return { score, issue, quadrant };
}

export interface ProportionResult {
  score: number;
  /** Kuadran yang paling berbeda dari contoh. */
  quadrant: Quadrant;
}

/** Nilai proporsi (0–100): sebaran tinta per kuadran dan perbandingan lebar/tinggi dibanding huruf contoh. */
export function proportionScore(s: GlyphShape, model: GlyphShape | null): ProportionResult | null {
  if (!model) return null;
  const diff = s.quad.map((v, i) => v - model.quad[i]);
  const d = diff.reduce((n, v) => n + Math.abs(v), 0);
  const aspect = (b: GlyphShape["bbox"]) => Math.max(0.05, b[2] - b[0]) / Math.max(0.05, b[3] - b[1]);
  const ratio = Math.abs(Math.log(aspect(s.bbox) / aspect(model.bbox)));
  const penalty = Math.min(1, Math.max(0, (d + 0.5 * ratio - 0.3) / 0.5)) * 70;
  const worst = diff.reduce((best, v, i) => (Math.abs(v) > Math.abs(diff[best]) ? i : best), 0);
  return { score: Math.round(100 - penalty), quadrant: QUAD_KEYS[worst] };
}
