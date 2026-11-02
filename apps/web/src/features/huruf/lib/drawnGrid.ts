/**
 * Pendeteksi kisi yang DIGAMBAR SISWA SENDIRI (Gerbang Tulis tanpa printer), tanpa AI, berjalan di HP.
 *
 * Siswa menggambar satu bingkai berisi `cols × rows` kotak dengan pena gelap. Garis bingkai dan sekat saling tersambung,
 * sedangkan tulisan di dalam kotak terpisah, jadi:
 *  1. peta tinta → komponen terhubung terbesar = kisi;
 *  2. 4 sudut bingkai = titik ekstrem komponen itu (min/maks x+y dan x−y);
 *  3. bingkai diluruskan ke ruang `cols × rows`, lalu setiap sekat dalam dicari dari profil garis di sekitar posisi
 *     ratanya, karena kotak gambar tangan tidak pernah persis sama besar.
 * Kisi ditolak bila sekat tidak ditemukan atau ada garis panjang di tengah kotak (jumlah kolom/baris berbeda).
 *
 * Harus sama dengan pemotongan kotak di server: apps/api/src/modules/tulis/handwritingCheck.ts (checkDrawnGrid).
 */
import { inkMask } from "./gridLocate";
import { apply, homography, isSaneQuad, luminance, type Img, type Matrix, type Point, type Quad } from "./sheetGeometry";

export interface DrawnGrid {
  /** Sudut bingkai luar di gambar (piksel): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: Quad;
  /** Letak garis vertikal (cols+1) dan horizontal (rows+1) di bingkai yang diluruskan, 0–1. */
  xs: number[];
  ys: number[];
  /** Rata-rata keutuhan garis (0–1). */
  score: number;
}

/** Piksel per kotak di ruang lurus saat mengukur garis. */
const S = 32;
/** Pencarian sekat di sekitar posisi rata (pecahan kotak). */
const SEARCH = 0.35;
/** Garis dianggap ada bila menutupi ≥ sebagian panjangnya (gambar tangan sering terputus/bergelombang). */
const LINE_MIN = 0.45;
/** Garis panjang di tengah kotak = kolom/baris lebih banyak dari yang diminta. */
const EXTRA_MAX = 0.4;

/** Pertebal tinta beberapa piksel supaya garis yang sedikit terputus di persilangan tetap tersambung. */
function dilate(mask: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W) tmp[y * W + xx] = 1;
      }
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!tmp[y * W + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < H) out[yy * W + x] = 1;
      }
    }
  return out;
}

interface Component {
  label: number;
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Titik ekstrem: min(x+y), max(x−y), max(x+y), min(x−y) → kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  extremes: Quad;
}

/** Komponen terhubung (8 arah) dengan kotak batas terbesar. */
function largestComponent(mask: Uint8Array, W: number, H: number): { labels: Int32Array; best: Component | null } {
  const labels = new Int32Array(W * H);
  const stack = new Int32Array(W * H);
  let best: Component | null = null;
  let next = 0;
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || labels[start]) continue;
    const label = ++next;
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    const c: Component = { label, count: 0, minX: W, maxX: -1, minY: H, maxY: -1, extremes: [[0, 0], [0, 0], [0, 0], [0, 0]] };
    let sMin = Infinity;
    let sMax = -Infinity;
    let dMin = Infinity;
    let dMax = -Infinity;
    while (top) {
      const i = stack[--top];
      const x = i % W;
      const y = (i - x) / W;
      c.count++;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      const s = x + y;
      const d = x - y;
      if (s < sMin) (sMin = s), (c.extremes[0] = [x, y]);
      if (d > dMax) (dMax = d), (c.extremes[1] = [x, y]);
      if (s > sMax) (sMax = s), (c.extremes[2] = [x, y]);
      if (d < dMin) (dMin = d), (c.extremes[3] = [x, y]);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (mask[j] && !labels[j]) {
            labels[j] = label;
            stack[top++] = j;
          }
        }
      }
    }
    const area = (c.maxX - c.minX) * (c.maxY - c.minY);
    if (!best || area > (best.maxX - best.minX) * (best.maxY - best.minY)) best = c;
  }
  return { labels, best };
}

/**
 * Keutuhan garis di setiap posisi ruang lurus. `vertical`: untuk tiap x (0..cols·S), pecahan baris y yang punya piksel
 * kisi dalam ±1 piksel; sebaliknya untuk garis horizontal.
 */
function coverage(isGrid: (u: number, v: number) => boolean, lenU: number, lenV: number, vertical: boolean): Float32Array {
  const out = new Float32Array(lenU + 1);
  for (let u = 0; u <= lenU; u++) {
    let hit = 0;
    for (let v = 0; v <= lenV; v++) {
      const at = (du: number) => (vertical ? isGrid(u + du, v) : isGrid(v, u + du));
      if (at(0) || at(-1) || at(1)) hit++;
    }
    out[u] = hit / (lenV + 1);
  }
  return out;
}

/** Cari `count` sekat (plus 2 tepi) dari profil keutuhan garis; null bila ada yang hilang atau ada garis lebih. */
function findLines(cov: Float32Array, count: number): { lines: number[]; strength: number } | null {
  const len = count * S;
  const lines: number[] = [];
  const strengths: number[] = [];
  for (let k = 0; k <= count; k++) {
    const center = k * S;
    // Tepi bingkai dicari ke arah dalam saja (sudut ekstrem bisa sedikit melewati garis)
    const lo = Math.max(0, Math.round(center - SEARCH * S));
    const hi = Math.min(len, Math.round(center + SEARCH * S));
    let at = center;
    let best = -1;
    for (let u = lo; u <= hi; u++) if (cov[u] > best) (best = cov[u]), (at = u);
    if (best < LINE_MIN) return null;
    lines.push(at);
    strengths.push(best);
  }
  // Tidak boleh ada garis panjang lain di tengah kotak
  for (let k = 0; k < count; k++) {
    const a = lines[k] + 0.25 * (lines[k + 1] - lines[k]);
    const b = lines[k + 1] - 0.25 * (lines[k + 1] - lines[k]);
    for (let u = Math.ceil(a); u <= Math.floor(b); u++) if (cov[u] > EXTRA_MAX && cov[u] > 0.6 * Math.min(strengths[k], strengths[k + 1])) return null;
  }
  for (let k = 1; k <= count; k++) if (lines[k] - lines[k - 1] < 0.4 * S) return null;
  return { lines: lines.map((u) => u / len), strength: strengths.reduce((n, s) => n + s, 0) / strengths.length };
}

/** Homografi dari ruang lurus (piksel S per kotak) ke gambar. */
function unitToImage(corners: Quad, cols: number, rows: number): Matrix {
  const w = cols * S;
  const h = rows * S;
  return homography(
    [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    corners,
  );
}

/** Ukur sekat untuk sudut bingkai yang sudah diketahui (dari deteksi atau digeser pengguna). */
export function measureDrawnGrid(gridMask: (x: number, y: number) => boolean, corners: Quad, cols: number, rows: number): DrawnGrid | null {
  let h: Matrix;
  try {
    h = unitToImage(corners, cols, rows);
  } catch {
    return null;
  }
  const isGrid = (u: number, v: number) => {
    const [x, y] = apply(h, [u, v]);
    return gridMask(Math.round(x), Math.round(y));
  };
  const vx = findLines(coverage(isGrid, cols * S, rows * S, true), cols);
  const hy = findLines(coverage(isGrid, rows * S, cols * S, false), rows);
  if (!vx || !hy) return null;
  return { corners, xs: vx.lines, ys: hy.lines, score: (vx.strength + hy.strength) / 2 };
}

/** Peta garis kisi untuk mengukur ulang setelah pengguna menggeser sudut (tanpa memilih komponen terbesar). */
export function lineMask(img: Img): (x: number, y: number) => boolean {
  const { width: W, height: H } = img;
  const ink = dilate(inkMask(luminance(img), W, H), W, H, Math.max(1, Math.round(W / 400)));
  return (x, y) => x >= 0 && y >= 0 && x < W && y < H && ink[y * W + x] === 1;
}

/** Cari kisi gambar tangan `cols × rows` di gambar. */
export function locateDrawnGrid(img: Img, cols: number, rows: number): DrawnGrid | null {
  const { width: W, height: H } = img;
  const ink = dilate(inkMask(luminance(img), W, H), W, H, Math.max(1, Math.round(W / 400)));
  const { labels, best } = largestComponent(ink, W, H);
  if (!best || best.maxX - best.minX < W * 0.25 || best.maxY - best.minY < H * 0.2) return null;
  const corners = best.extremes;
  if (!isSaneQuad(corners, W, H)) return null;
  const label = best.label;
  return measureDrawnGrid((x, y) => x >= 0 && y >= 0 && x < W && y < H && labels[y * W + x] === label, corners, cols, rows);
}

/** Segi empat setiap kotak di gambar (urut baris demi baris), untuk digambar di atas kamera/foto. */
export function drawnCellQuads(grid: Pick<DrawnGrid, "corners" | "xs" | "ys">): Quad[] {
  const h = homography(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    grid.corners,
  );
  const quads: Quad[] = [];
  for (let r = 0; r + 1 < grid.ys.length; r++)
    for (let c = 0; c + 1 < grid.xs.length; c++) {
      const [x0, x1, y0, y1] = [grid.xs[c], grid.xs[c + 1], grid.ys[r], grid.ys[r + 1]];
      quads.push([apply(h, [x0, y0]), apply(h, [x1, y0]), apply(h, [x1, y1]), apply(h, [x0, y1])] as Quad);
    }
  return quads;
}

/** Ukuran kisi untuk n huruf: 4 kolom (cukup lebar di buku tulis), baris secukupnya. */
export const DRAWN_COLS = 4;
export const drawnRows = (n: number) => Math.ceil(n / DRAWN_COLS);

export type { Point };
