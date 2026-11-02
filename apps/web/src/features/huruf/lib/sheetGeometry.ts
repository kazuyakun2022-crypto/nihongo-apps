/**
 * Geometri kisi lembar cetak Tulis di Buku untuk pemindai kamera.
 * Satuan mm, titik (0,0) = sudut kiri-atas kotak contoh huruf pertama. Harus sama dengan CSS .pGrid/.pMarker
 * (tulisBuku.module.css) dan PRINT_LAYOUT di apps/api/src/modules/tulis/sheetLayout.ts.
 *
 * Alur: cari 4 penanda hitam → hitung 4 sudut kisi kotak → "rapatkan" sudut ke garis tepi kotak yang terlihat di foto
 * (snapToGrid), supaya yang dinilai benar-benar isi kotak, bukan benda di luar kotak.
 */

export const LAYOUT = { box: 15, colGap: 1.4, lineGap: 1.2, charGap: 2.6, cols: 10, marker: 4, markerOffset: 4.5, markerRight: 9 };

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point]; // kiri-atas, kanan-atas, kanan-bawah, kiri-bawah
export type Matrix = number[];

export interface Img {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  channels: number;
}

export function gridSize(charCount: number) {
  const L = LAYOUT;
  const w = L.cols * L.box + (L.cols - 1) * L.colGap;
  const h = charCount * (2 * L.box + L.lineGap) + (charCount - 1) * L.charGap;
  return { w, h, pitch: 2 * L.box + L.lineGap + L.charGap };
}

/** Sudut kisi (mm): kotak contoh kiri-atas sampai kotak terakhir kanan-bawah. */
export function gridCorners(charCount: number): Quad {
  const { w, h } = gridSize(charCount);
  return [[0, 0], [w, 0], [w, h], [0, h]];
}

function markerCorners(charCount: number): Quad {
  const { w, h } = gridSize(charCount);
  const o = LAYOUT.markerOffset;
  const r = w + LAYOUT.markerRight;
  return [[-o, -o], [r, -o], [r, h + o], [-o, h + o]];
}

/** Kotak (kolom k 0–9, 0 = kotak contoh/label もう一回) baris l (0/1) huruf ke-c: sudut kiri-atas dalam mm. */
export function cellOrigin(charCount: number, c: number, l: number, k: number): Point {
  const { pitch } = gridSize(charCount);
  return [k * (LAYOUT.box + LAYOUT.colGap), c * pitch + l * (LAYOUT.box + LAYOUT.lineGap)];
}

// ───────────────────────── Homografi ─────────────────────────

export function homography(src: Point[], dst: Point[]): Matrix {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) throw new Error("Sudut tidak membentuk segi empat");
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let k = col; k < 9; k++) A[r][k] -= f * A[col][k];
    }
  }
  return [...Array.from({ length: 8 }, (_, i) => A[i][8] / A[i][i]), 1];
}

export function apply(h: Matrix, [x, y]: Point): Point {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

/** Segi empat cembung dan cukup besar (bukan sudut yang tertukar/terlipat). */
export function isSaneQuad(q: Quad, width: number, height: number): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [a, b, c] = [q[i], q[(i + 1) % 4], q[(i + 2) % 4]];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross === 0) return false;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  const area = Math.abs(q.reduce((s, p, i) => s + p[0] * q[(i + 1) % 4][1] - q[(i + 1) % 4][0] * p[1], 0)) / 2;
  return area > width * height * 0.08;
}

// ───────────────────────── Citra ─────────────────────────

export function luminance(img: Img): Float32Array {
  const out = new Float32Array(img.width * img.height);
  for (let i = 0, p = 0; i < out.length; i++, p += img.channels) out[i] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
  return out;
}

function sample(lum: Float32Array, W: number, H: number, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(W - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(H - 2, Math.floor(y)));
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const i = y0 * W + x0;
  return lum[i] * (1 - fx) * (1 - fy) + lum[i + 1] * fx * (1 - fy) + lum[i + W] * (1 - fx) * fy + lum[i + W + 1] * fx * fy;
}

// ───────────────────────── Penanda ─────────────────────────

interface Blob {
  cx: number;
  cy: number;
  area: number;
  w: number;
  h: number;
  chroma: number;
}

/** Cari 4 penanda hitam di sudut kisi; hasilnya 4 sudut KISI (bukan penanda) dalam piksel, atau null. */
export function findGrid(img: Img, charCount: number): Quad | null {
  const { width: W, height: H } = img;
  const lum = luminance(img);
  const integral = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += lum[y * W + x];
      integral[(y + 1) * (W + 1) + x + 1] = integral[y * (W + 1) + x + 1] + row;
    }
  }
  const r = Math.max(8, Math.round(Math.max(W, H) / 30));
  const dark = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(H, y + r + 1);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(W, x + r + 1);
      const mean = (integral[y1 * (W + 1) + x1] - integral[y0 * (W + 1) + x1] - integral[y1 * (W + 1) + x0] + integral[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const v = lum[y * W + x];
      dark[y * W + x] = v < 110 && v < mean * 0.62 ? 1 : 0;
    }
  }
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const blobs: Blob[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!dark[start] || seen[start]) continue;
    let area = 0;
    let chroma = 0;
    let sx = 0;
    let sy = 0;
    let minX = W;
    let maxX = 0;
    let minY = H;
    let maxY = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W;
      const y = (p - x) / W;
      area++;
      const q = p * img.channels;
      chroma += Math.max(img.data[q], img.data[q + 1], img.data[q + 2]) - Math.min(img.data[q], img.data[q + 1], img.data[q + 2]);
      sx += x;
      sy += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (n >= 0 && dark[n] && !seen[n]) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    blobs.push({ cx: sx / area, cy: sy / area, area, w: maxX - minX + 1, h: maxY - minY + 1, chroma: chroma / area });
  }

  const marks = markerCorners(charCount);
  const spanX = marks[1][0] - marks[0][0];
  const expectedRatio = spanX / (marks[3][1] - marks[0][1]);
  const minSide = Math.max(4, (0.25 * Math.min(W, H) * LAYOUT.marker) / spanX);
  const candidates = blobs
    .filter((b) => {
      const aspect = b.w / b.h;
      return b.w >= minSide && b.h >= minSide && b.w < W / 10 && aspect > 0.6 && aspect < 1.65 && b.area / (b.w * b.h) > 0.8 && b.chroma < 45;
    })
    .sort((a, b) => b.area - a.area)
    .slice(0, 16);
  if (candidates.length < 4) return null;

  const dist = (a: Blob, b: Blob) => Math.hypot(a.cx - b.cx, a.cy - b.cy);
  let best: { cost: number; quad: Blob[] } | null = null;
  const n = candidates.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++) {
          const set = [candidates[a], candidates[b], candidates[c], candidates[d]];
          const by = (f: (x: Blob) => number) => set.reduce((m, x) => (f(x) > f(m) ? x : m));
          const quad = [by((x) => -(x.cx + x.cy)), by((x) => x.cx - x.cy), by((x) => x.cx + x.cy), by((x) => x.cy - x.cx)];
          if (new Set(quad).size !== 4) continue;
          const [tl, tr, br, bl] = quad;
          const width = (dist(tl, tr) + dist(bl, br)) / 2;
          const height = (dist(tl, bl) + dist(tr, br)) / 2;
          if (width < W * 0.25 || height < H * 0.15) continue;
          const ratio = width / height / expectedRatio;
          const areas = quad.map((x) => x.area);
          const spread = Math.max(...areas) / Math.min(...areas);
          const side = Math.sqrt(areas.reduce((s, x) => s + x, 0) / 4);
          const sideRatio = side / ((width * LAYOUT.marker) / spanX);
          if (ratio < 0.6 || ratio > 1.65 || spread > 3.5 || sideRatio < 0.45 || sideRatio > 2.2) continue;
          // Sisi berhadapan harus hampir sama panjang (perspektif wajar), bukan bentuk layang-layang
          if (dist(tl, tr) / dist(bl, br) > 1.6 || dist(tl, tr) / dist(bl, br) < 0.62) continue;
          if (dist(tl, bl) / dist(tr, br) > 1.6 || dist(tl, bl) / dist(tr, br) < 0.62) continue;
          const cost = 2 * Math.abs(Math.log(ratio)) + Math.log(spread) + 2 * Math.abs(Math.log(sideRatio));
          if (!best || cost < best.cost) best = { cost, quad };
        }
  if (!best) return null;
  const h = homography(marks, best.quad.map((b) => [b.cx, b.cy] as Point));
  const grid = gridCorners(charCount).map((p) => apply(h, p)) as Quad;
  return isSaneQuad(grid, W, H) ? grid : null;
}

// ───────────────────────── Rapatkan ke garis kotak ─────────────────────────

/**
 * Seberapa pas kisi dengan garis tepi kotak di foto: garis tepi (abu-abu tipis) harus lebih gelap daripada titik
 * sedikit di dalam dan di luarnya. Nilai > 0 berarti pas; makin besar makin pas.
 */
export function gridScore(lum: Float32Array, W: number, H: number, charCount: number, corners: Quad): number {
  let h: Matrix;
  try {
    h = homography(gridCorners(charCount), corners);
  } catch {
    return -Infinity;
  }
  const B = LAYOUT.box;
  const d = 0.65;
  let sum = 0;
  let n = 0;
  const at = (x: number, y: number) => {
    const [px, py] = apply(h, [x, y]);
    return sample(lum, W, H, px, py);
  };
  for (let c = 0; c < charCount; c++) {
    for (let l = 0; l < 2; l++) {
      for (let k = 0; k < LAYOUT.cols; k++) {
        const [x, y] = cellOrigin(charCount, c, l, k);
        for (let t = 0.15; t < 0.9; t += 0.14) {
          for (const [ex, ey, nx, ny] of [
            [x + t * B, y, 0, 1],
            [x + t * B, y + B, 0, 1],
            [x, y + t * B, 1, 0],
            [x + B, y + t * B, 1, 0],
          ]) {
            const edge = at(ex, ey);
            const around = (at(ex + nx * d, ey + ny * d) + at(ex - nx * d, ey - ny * d)) / 2;
            sum += (around - edge) / Math.max(40, around);
            n++;
          }
        }
      }
    }
  }
  return n ? sum / n : -Infinity;
}

/** Ambang skor "kisi pas dengan kotak" (foto uji: pas ≈ 0,14; meleset sebagian 0,06–0,1; meleset setengah kotak ≈ 0). */
export const GRID_FIT_MIN = 0.1;

/** Buram kotak terpisah (horizontal lalu vertikal), untuk melebarkan garis tipis saat pencarian kasar. */
function blur(lum: Float32Array, W: number, H: number, r: number): Float32Array {
  if (r < 1) return lum;
  const tmp = new Float32Array(lum.length);
  const out = new Float32Array(lum.length);
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += lum[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / (2 * r + 1);
      acc += lum[y * W + Math.min(W - 1, x + r + 1)] - lum[y * W + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

/**
 * Geser sudut-sudut kisi sampai menempel pada garis tepi kotak di foto ("rapatkan").
 * 1) geser seluruh kisi pada citra yang diburamkan (garis jadi lebar, awal yang meleset sampai ±setengah kotak tetap
 * tertangkap), 2) perhalus tiap sudut, makin lama makin tajam.
 */
export function snapToGrid(lum: Float32Array, W: number, H: number, charCount: number, start: Quad): { corners: Quad; score: number } {
  const { w } = gridSize(charCount);
  const cell = (Math.hypot(start[1][0] - start[0][0], start[1][1] - start[0][1]) / w) * LAYOUT.box;
  const levels = [
    { lum: blur(lum, W, H, Math.round(cell * 0.12)), shift: 0.6, steps: 7, corner: [0.15, 0.08] },
    { lum: blur(lum, W, H, Math.round(cell * 0.04)), shift: 0.09, steps: 3, corner: [0.04] },
    { lum, shift: 0.03, steps: 2, corner: [0.015] },
  ];
  let best = start.map((p) => [...p]) as Quad;
  for (const level of levels) {
    let bestScore = gridScore(level.lum, W, H, charCount, best);
    const origin = best;
    const step = (cell * level.shift) / level.steps;
    for (let i = -level.steps; i <= level.steps; i++) {
      for (let j = -level.steps; j <= level.steps; j++) {
        const q = origin.map(([x, y]) => [x + i * step, y + j * step]) as Quad;
        const sc = gridScore(level.lum, W, H, charCount, q);
        if (sc > bestScore) {
          bestScore = sc;
          best = q;
        }
      }
    }
    for (const frac of level.corner) {
      for (let pass = 0; pass < 4; pass++) {
        let improved = false;
        for (let i = 0; i < 4; i++) {
          for (const axis of [0, 1]) {
            for (const dir of [-1, 1]) {
              const q = best.map((p) => [...p]) as Quad;
              q[i][axis] += dir * frac * cell;
              const sc = gridScore(level.lum, W, H, charCount, q);
              if (sc > bestScore) {
                bestScore = sc;
                best = q;
                improved = true;
              }
            }
          }
        }
        if (!improved) break;
      }
    }
  }
  return { corners: best, score: gridScore(lum, W, H, charCount, best) };
}

/** Kisi awal tanpa penanda: diletakkan di tengah foto dengan perbandingan sisi yang benar. */
export function defaultGrid(W: number, H: number, charCount: number): Quad {
  const { w, h } = gridSize(charCount);
  const scale = Math.min((W * 0.86) / w, (H * 0.8) / h);
  const gw = w * scale;
  const gh = h * scale;
  const x = (W - gw) / 2;
  const y = (H - gh) / 2;
  return [[x, y], [x + gw, y], [x + gw, y + gh], [x, y + gh]];
}

/** Segi empat setiap kotak (untuk digambar di atas foto). */
export function cellQuads(charCount: number, corners: Quad): Quad[] {
  const h = homography(gridCorners(charCount), corners);
  const out: Quad[] = [];
  for (let c = 0; c < charCount; c++)
    for (let l = 0; l < 2; l++)
      for (let k = 0; k < LAYOUT.cols; k++) {
        const [x, y] = cellOrigin(charCount, c, l, k);
        const B = LAYOUT.box;
        out.push([apply(h, [x, y]), apply(h, [x + B, y]), apply(h, [x + B, y + B]), apply(h, [x, y + B])]);
      }
  return out;
}
