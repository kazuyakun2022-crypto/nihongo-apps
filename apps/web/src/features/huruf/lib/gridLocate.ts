/**
 * Cari kisi kotak lembar latihan secara otomatis, juga tanpa penanda sudut.
 *
 * Garis kotak abu-abu sering hampir tak terlihat di foto HP, tetapi tulisan tangan selalu jelas dan tersusun rapi
 * mengikuti kisi. Jadi: cari "tinta" → ukur jarak berulang antar-tulisan (autokorelasi) → kelompokkan tulisan per
 * kotak sambil memperbaiki perspektif dari tengah ke luar → tentukan kolom/baris pertama dari kotak contoh yang
 * kemerahan. Diuji pada foto asli lembar lama (tanpa penanda) dan foto uji miring: kecocokan kotak 88–95%.
 */
import {
  apply,
  cellOrigin,
  findGrid,
  gridCorners,
  gridScore,
  homography,
  isSaneQuad,
  LAYOUT,
  luminance,
  snapToGrid,
  type Img,
  type Matrix,
  type Point,
  type Quad,
} from "./sheetGeometry";

/** Tinta = jauh lebih gelap dari rata-rata sekitarnya (tulisan pensil/spidol; garis abu-abu tipis tidak terhitung). */
export function inkMask(lum: Float32Array, W: number, H: number): Uint8Array {
  const integral = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) {
      row += lum[y * W + x];
      integral[(y + 1) * (W + 1) + x + 1] = integral[y * (W + 1) + x + 1] + row;
    }
  }
  const r = Math.max(4, Math.round(W / 25));
  const ink = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(H, y + r + 1);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(W, x + r + 1);
      const mean = (integral[y1 * (W + 1) + x1] - integral[y0 * (W + 1) + x1] - integral[y1 * (W + 1) + x0] + integral[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0));
      const v = lum[y * W + x];
      ink[y * W + x] = v < mean * 0.72 && v < 150 ? 1 : 0;
    }
  }
  return ink;
}

/** Dua langkah kisi (ke kanan, ke bawah) dari autokorelasi tinta yang diperkecil. */
function latticeSteps(ink: Uint8Array, W: number, H: number): [Point, Point] | null {
  const f = Math.max(1, Math.round(W / 120));
  const w = Math.floor(W / f);
  const h = Math.floor(H / f);
  const s = new Float32Array(w * h);
  let mean = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) acc += ink[(y * f + yy) * W + x * f + xx];
      s[y * w + x] = acc / (f * f);
      mean += s[y * w + x];
    }
  mean /= w * h;
  for (let i = 0; i < s.length; i++) s[i] -= mean;
  const rmax = Math.round(w * 0.2);
  const rmin = Math.max(2, Math.round(w * 0.03));
  const span = 2 * rmax + 1;
  // Hanya dy ≥ 0; nilai dy < 0 didapat dari simetri ac(dx,dy) = ac(-dx,-dy)
  const ac = new Float32Array(span * (rmax + 1));
  for (let dy = 0; dy <= rmax; dy++)
    for (let dx = -rmax; dx <= rmax; dx++) {
      let acc = 0;
      for (let y = 0; y + dy < h; y++) {
        const row = y * w;
        const row2 = (y + dy) * w;
        for (let x = Math.max(0, -dx); x < Math.min(w, w - dx); x++) acc += s[row + x] * s[row2 + x + dx];
      }
      ac[dy * span + dx + rmax] = acc;
    }
  const at = (dx: number, dy: number) => (dy >= 0 ? ac[dy * span + dx + rmax] : ac[-dy * span - dx + rmax]);
  const zero = at(0, 0) || 1;
  const peaks: { dx: number; dy: number; v: number }[] = [];
  for (let dy = -rmax + 2; dy <= rmax - 2; dy++)
    for (let dx = -rmax + 2; dx <= rmax - 2; dx++) {
      const r = Math.hypot(dx, dy);
      if (r < rmin || r > rmax - 2) continue;
      const v = at(dx, dy);
      let isMax = true;
      for (let j = -2; j <= 2 && isMax; j++) for (let i = -2; i <= 2; i++) if ((i || j) && at(dx + i, dy + j) > v) isMax = false;
      if (isMax) peaks.push({ dx, dy, v: v / zero });
    }
  const pick = (ok: (p: { dx: number; dy: number }) => boolean): Point | null => {
    const c = peaks.filter(ok);
    if (!c.length) return null;
    const top = Math.max(...c.map((p) => p.v));
    const strong = c.filter((p) => p.v >= top * 0.6).sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy))[0];
    return [strong.dx * f, strong.dy * f];
  };
  const u = pick((p) => p.dx > 0 && Math.abs(p.dy) < p.dx * 0.6);
  const v = pick((p) => p.dy > 0 && Math.abs(p.dx) < p.dy * 0.6);
  return u && v ? [u, v] : null;
}

/** Homografi kuadrat-terkecil dari banyak pasangan titik (dinormalkan supaya stabil). */
export function fitHomography(src: Point[], dst: Point[]): Matrix {
  const norm = (pts: Point[]) => {
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const d = pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / pts.length || 1;
    const k = Math.SQRT2 / d;
    return { k, cx, cy, pts: pts.map(([x, y]) => [(x - cx) * k, (y - cy) * k] as Point) };
  };
  const a = norm(src);
  const b = norm(dst);
  const N = Array.from({ length: 8 }, () => new Float64Array(9));
  for (let i = 0; i < src.length; i++) {
    const [x, y] = a.pts[i];
    const [u, v] = b.pts[i];
    for (const row of [
      [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
      [0, 0, 0, x, y, 1, -v * x, -v * y, v],
    ]) {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) N[r][c] += row[r] * row[c];
    }
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(N[r][col]) > Math.abs(N[pivot][col])) pivot = r;
    [N[col], N[pivot]] = [N[pivot], N[col]];
    if (Math.abs(N[col][col]) < 1e-12) throw new Error("Titik tidak cukup untuk homografi");
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = N[r][col] / N[col][col];
      for (let k = col; k < 9; k++) N[r][k] -= f * N[col][k];
    }
  }
  const hn = [...Array.from({ length: 8 }, (_, i) => N[i][8] / N[i][i]), 1];
  // H = T_dst⁻¹ · Hn · T_src
  const Ts = [a.k, 0, -a.k * a.cx, 0, a.k, -a.k * a.cy, 0, 0, 1];
  const Td = [1 / b.k, 0, b.cx, 0, 1 / b.k, b.cy, 0, 0, 1];
  const h = mul(mul(Td, hn), Ts);
  return h.map((x) => x / h[8]);
}

function mul(p: number[], q: number[]): number[] {
  const out: number[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(p[r * 3] * q[c] + p[r * 3 + 1] * q[3 + c] + p[r * 3 + 2] * q[6 + c]);
  return out;
}

function invert(m: Matrix): Matrix {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** Pusat kotak (mm) kolom k (0 = kotak contoh) baris r (0 .. 2n-1). */
function cellCenterMm(charCount: number, k: number, r: number): Point {
  const [x, y] = cellOrigin(charCount, Math.floor(r / 2), r % 2, k);
  return [x + LAYOUT.box / 2, y + LAYOUT.box / 2];
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : Infinity;
}

export interface GridFound {
  corners: Quad;
  via: "penanda" | "tulisan";
}

interface Blob {
  x: number;
  y: number;
  a: number;
}

/** Gumpalan tulisan: tinta sedikit ditebalkan (tanpa menutup celah antar-kotak) lalu dikelompokkan. */
function writingBlobs(ink: Uint8Array, W: number, H: number, pitch: number): Blob[] {
  const grow = Math.max(1, Math.round(pitch * 0.03));
  const tmp = new Uint8Array(W * H);
  const dil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let on = 0;
      for (let d = -grow; d <= grow && !on; d++) on = ink[y * W + Math.min(W - 1, Math.max(0, x + d))];
      tmp[y * W + x] = on;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let on = 0;
      for (let d = -grow; d <= grow && !on; d++) on = tmp[Math.min(H - 1, Math.max(0, y + d)) * W + x];
      dil[y * W + x] = on;
    }
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const blobs: Blob[] = [];
  for (let start = 0; start < W * H; start++) {
    if (!dil[start] || seen[start]) continue;
    let minX = W;
    let maxX = 0;
    let minY = H;
    let maxY = 0;
    let sx = 0;
    let sy = 0;
    let a = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % W;
      const y = (p - x) / W;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (ink[p]) {
        sx += x;
        sy += y;
        a++;
      }
      if (x > 0 && dil[p - 1] && !seen[p - 1]) (seen[p - 1] = 1), stack.push(p - 1);
      if (x < W - 1 && dil[p + 1] && !seen[p + 1]) (seen[p + 1] = 1), stack.push(p + 1);
      if (y > 0 && dil[p - W] && !seen[p - W]) (seen[p - W] = 1), stack.push(p - W);
      if (y < H - 1 && dil[p + W] && !seen[p + W]) (seen[p + W] = 1), stack.push(p + W);
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const big = Math.max(bw, bh);
    // Buang serpihan, gumpalan raksasa, dan garis panjang tipis (garis kotak/tepi kertas)
    if (!a || big < pitch * 0.2 || big > pitch * 1.2 || (big > 0.75 * pitch && big > 5 * Math.min(bw, bh))) continue;
    blobs.push({ x: sx / a, y: sy / a, a });
  }
  return blobs;
}

/** Perhalus langkah kisi dari pasangan tulisan yang bertetangga. */
function refineSteps(blobs: Blob[], u: Point, v: Point): [Point, Point] {
  const pairs: Point[] = [];
  const reach = 1.6 * Math.max(Math.hypot(...u), Math.hypot(...v));
  for (let i = 0; i < blobs.length; i++)
    for (let j = 0; j < blobs.length; j++) {
      if (i === j) continue;
      const dx = blobs[j].x - blobs[i].x;
      const dy = blobs[j].y - blobs[i].y;
      if (Math.hypot(dx, dy) < reach) pairs.push([dx, dy]);
    }
  let steps: [Point, Point] = [u, v];
  for (let it = 0; it < 3; it++) {
    steps = steps.map((base) => {
      const L = Math.hypot(...base);
      const xs: number[] = [];
      const ys: number[] = [];
      for (const [dx, dy] of pairs) {
        let proj = (dx * base[0] + dy * base[1]) / L;
        let px = dx;
        let py = dy;
        if (proj < 0) {
          proj = -proj;
          px = -dx;
          py = -dy;
        }
        const perp = Math.abs(-px * base[1] + py * base[0]) / L;
        if (proj > 0.7 * L && proj < 1.3 * L && perp < 0.25 * L) {
          xs.push(px);
          ys.push(py);
        }
      }
      return xs.length > 5 ? ([median(xs), median(ys)] as Point) : base;
    }) as [Point, Point];
  }
  return steps;
}

interface LatticeCell {
  i: number;
  j: number;
  x: number;
  y: number;
  a: number;
}

/** Kelompokkan tulisan ke sel kisi seragam, tumbuh dari tulisan paling tengah sambil memperbaiki perspektif. */
function growLattice(blobs: Blob[], u: Point, v: Point): LatticeCell[] {
  const total = blobs.reduce((s, b) => s + b.a, 0);
  const cx = blobs.reduce((s, b) => s + b.x * b.a, 0) / total;
  const cy = blobs.reduce((s, b) => s + b.y * b.a, 0) / total;
  const o = blobs.reduce((best, b) => (Math.hypot(b.x - cx, b.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? b : best));
  let lattice: Matrix = [u[0], v[0], o.x, u[1], v[1], o.y, 0, 0, 1];
  let cells: LatticeCell[] = [];
  for (const R of [2.5, 4, 6, 9, 14]) {
    const inv = invert(lattice);
    let q = blobs.map((b) => apply(inv, [b.x, b.y]));
    if (R === 2.5) {
      // Geser fase supaya tulisan jatuh di tengah sel kisi
      const phase = (axis: 0 | 1) => {
        let re = 0;
        let im = 0;
        q.forEach((p, k) => {
          if (Math.hypot(p[0], p[1]) >= R) return;
          const frac = p[axis] - Math.round(p[axis]);
          re += blobs[k].a * Math.cos(2 * Math.PI * frac);
          im += blobs[k].a * Math.sin(2 * Math.PI * frac);
        });
        return Math.atan2(im, re) / (2 * Math.PI);
      };
      const pi = phase(0);
      const pj = phase(1);
      q = q.map(([qi, qj]) => [qi - pi, qj - pj]);
      lattice = mul(lattice, [1, 0, pi, 0, 1, pj, 0, 0, 1]);
    }
    const next = new Map<string, LatticeCell>();
    q.forEach(([qi, qj], k) => {
      const ri = Math.round(qi);
      const rj = Math.round(qj);
      if (Math.max(Math.abs(qi - ri), Math.abs(qj - rj)) >= 0.32 || Math.max(Math.abs(qi), Math.abs(qj)) >= R) return;
      const key = `${ri},${rj}`;
      const c = next.get(key) ?? { i: ri, j: rj, x: 0, y: 0, a: 0 };
      c.x += blobs[k].x * blobs[k].a;
      c.y += blobs[k].y * blobs[k].a;
      c.a += blobs[k].a;
      next.set(key, c);
    });
    if (next.size < 6) break;
    cells = [...next.values()].map((c) => ({ ...c, x: c.x / c.a, y: c.y / c.a }));
    try {
      lattice = fitHomography(
        cells.map((c) => [c.i, c.j] as Point),
        cells.map((c) => [c.x, c.y] as Point),
      );
    } catch {
      break;
    }
  }
  return cells;
}

/** Cari kisi kotak dari susunan tulisan tangan. */
export function findGridFromWriting(img: Img, charCount: number, lum = luminance(img), ink = inkMask(lum, img.width, img.height)): GridFound | null {
  const { width: W, height: H } = img;
  const steps = latticeSteps(ink, W, H);
  if (!steps) return null;
  let pitch = (Math.hypot(...steps[0]) + Math.hypot(...steps[1])) / 2;
  const blobs = writingBlobs(ink, W, H, pitch);
  if (blobs.length < 12) return null;
  const [u, v] = refineSteps(blobs, steps[0], steps[1]);
  pitch = (Math.hypot(...u) + Math.hypot(...v)) / 2;
  const list = growLattice(blobs, u, v);
  if (list.length < 15) return null;

  // Kolom/baris pertama: kotak contoh (kolom kiri, baris atas tiap huruf) kemerahan di atas kertas putih
  const sortedLum = Float32Array.from(lum).sort();
  const paper = sortedLum[Math.floor(sortedLum.length * 0.9)];
  const red = new Float32Array(W * H);
  for (let i = 0, p = 0; i < red.length; i++, p += img.channels) red[i] = lum[i] > paper * 0.75 ? img.data[p] - (img.data[p + 1] + img.data[p + 2]) / 2 : 0;
  const redTop = Float32Array.from(red).sort()[Math.floor(red.length * 0.99)] || 1;
  const sampleCell = (h: Matrix, k: number, r: number) => {
    const [mx, my] = cellCenterMm(charCount, k, r);
    let acc = 0;
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++) {
        const [x, y] = apply(h, [mx + (a * LAYOUT.box * 0.7) / 4, my + (b * LAYOUT.box * 0.7) / 4]);
        const xi = Math.round(x);
        const yi = Math.round(y);
        acc += xi >= 0 && yi >= 0 && xi < W && yi < H ? red[yi * W + xi] : 0;
      }
    return acc / 25;
  };
  const rows = 2 * charCount;
  const is = [...new Set(list.map((c) => c.i))];
  const js = [...new Set(list.map((c) => c.j))];
  const hyps = is.flatMap((k0) => js.map((r0) => ({ k0, r0, sel: list.filter((c) => c.i - k0 >= 0 && c.i - k0 < LAYOUT.cols && c.j - r0 >= 0 && c.j - r0 < rows) })));
  const most = Math.max(...hyps.map((h) => h.sel.length));
  let best: { score: number; h: Matrix; src: Point[]; dst: Point[] } | null = null;
  for (const hyp of hyps) {
    // Hanya posisi yang mencakup sebagian besar tulisan (judul, nama, bintang di luar kisi tidak boleh menang)
    if (hyp.sel.length < Math.max(15, 0.75 * most)) continue;
    const src = hyp.sel.map((c) => cellCenterMm(charCount, c.i - hyp.k0, c.j - hyp.r0));
    const dst = hyp.sel.map((c) => [c.x, c.y] as Point);
    let h: Matrix;
    try {
      h = fitHomography(src, dst);
    } catch {
      continue;
    }
    const res = median(src.map((s, i) => Math.hypot(apply(h, s)[0] - dst[i][0], apply(h, s)[1] - dst[i][1]))) / pitch;
    let model = 0;
    for (let r = 0; r < rows; r += 2) model += sampleCell(h, 0, r);
    model /= charCount;
    let other = 0;
    for (let r = 0; r < rows; r++) for (let k = 1; k < LAYOUT.cols; k++) other += sampleCell(h, k, r);
    other /= rows * (LAYOUT.cols - 1);
    // Kemerahan kolom contoh + cakupan tulisan + kerapian (tulisan nama/judul tidak jatuh rapi di kotak)
    const score = ((model - other) / Math.max(1, redTop)) * 10 + (10 * hyp.sel.length) / most - 40 * res;
    if (!best || score > best.score) best = { score, h, src, dst };
  }
  if (!best) return null;

  // Hitung ulang tanpa titik yang menyimpang
  let { h, src, dst } = best;
  for (let it = 0; it < 3; it++) {
    const keep = src.map((s, i) => Math.hypot(apply(h, s)[0] - dst[i][0], apply(h, s)[1] - dst[i][1]) < pitch * 0.3);
    if (keep.filter(Boolean).length < 8) break;
    src = src.filter((_, i) => keep[i]);
    dst = dst.filter((_, i) => keep[i]);
    h = fitHomography(src, dst);
  }
  const corners = gridCorners(charCount).map((p) => apply(h, p)) as Quad;
  return isSaneQuad(corners, W, H) ? { corners, via: "tulisan" } : null;
}

/**
 * Seberapa tepat kisi: tinta harus berada di dalam kotak, bukan di celah antar-kotak.
 * Pas ≈ 0,95–1; meleset 1/3 kotak ≈ 0,55; setengah kotak < 0. `density` = banyaknya tinta di dalam kotak.
 */
export function inkFit(ink: Uint8Array, W: number, H: number, charCount: number, corners: Quad): { fit: number; density: number } {
  const h = homography(gridCorners(charCount), corners);
  const B = LAYOUT.box;
  const at = (x: number, y: number) => {
    const [px, py] = apply(h, [x, y]);
    const xi = Math.round(px);
    const yi = Math.round(py);
    return xi >= 0 && yi >= 0 && xi < W && yi < H ? ink[yi * W + xi] : 0;
  };
  let inside = 0;
  let ni = 0;
  let gap = 0;
  let ng = 0;
  for (let r = 0; r < 2 * charCount; r++)
    for (let k = 1; k < LAYOUT.cols; k++) {
      const [mx, my] = cellCenterMm(charCount, k, r);
      for (let a = -3; a <= 3; a++)
        for (let b = -3; b <= 3; b++) {
          inside += at(mx + (a * 0.35 * B) / 3, my + (b * 0.35 * B) / 3);
          ni++;
        }
      for (let t = -4; t <= 4; t++) {
        gap += at(mx + B / 2 + LAYOUT.colGap / 2, my + (t * 0.45 * B) / 4) + at(mx + (t * 0.45 * B) / 4, my + B / 2 + LAYOUT.lineGap / 2);
        ng += 2;
      }
    }
  const density = inside / ni;
  return { fit: density > 0 ? 1 - gap / ng / density : 0, density };
}

/** Ambang "kisi pas" menurut tinta (lihat inkFit). */
export const INK_FIT_MIN = 0.8;

/**
 * Cari kisi otomatis: penanda hitam bila ada (lalu dirapatkan ke garis kotak), dan dari susunan tulisan.
 * Dipilih yang tintanya paling banyak berada di dalam kotak; null bila tidak ada yang meyakinkan.
 */
/** `snap: false` untuk kamera langsung (lebih ringan); hasil foto selalu dirapatkan. */
export function locateGrid(img: Img, charCount: number, options: { snap?: boolean } = {}): (GridFound & { fit: number }) | null {
  const lum = luminance(img);
  const ink = inkMask(lum, img.width, img.height);
  const candidates: GridFound[] = [];
  const marked = findGrid(img, charCount);
  if (marked && options.snap === false) candidates.push({ corners: marked, via: "penanda" });
  else if (marked) {
    const snapped = snapToGrid(lum, img.width, img.height, charCount, marked);
    candidates.push({ corners: snapped.score > gridScore(lum, img.width, img.height, charCount, marked) ? snapped.corners : marked, via: "penanda" });
  }
  const written = findGridFromWriting(img, charCount, lum, ink);
  if (written) candidates.push(written);
  let best: (GridFound & { fit: number }) | null = null;
  for (const c of candidates) {
    const { fit, density } = inkFit(ink, img.width, img.height, charCount, c.corners);
    // Lembar tanpa tulisan: hanya penanda yang bisa dipercaya
    const usable = density < 0.01 ? c.via === "penanda" : fit >= INK_FIT_MIN;
    if (usable && (!best || fit > best.fit)) best = { ...c, fit };
  }
  return best;
}
