/**
 * Foto sintetis kisi gambar tangan untuk menguji pendeteksi kisi (web) dan pemotong kotak (server):
 * bingkai cols × rows dengan lebar kolom tidak rata, perspektif miring, garis bergelombang & sedikit terputus,
 * dan huruf (path KanjiVG) di dalam kotak.
 */
import sharp from "sharp";
import { samplePath } from "../../src/modules/tulis/kanjiVg";

type Pt = [number, number];

export interface FixtureOptions {
  cols: number;
  rows: number;
  /** Lebar relatif tiap kolom / tinggi tiap baris (bawaan rata). */
  colW?: number[];
  rowH?: number[];
  /** Sudut bingkai di gambar (piksel). */
  corners: [Pt, Pt, Pt, Pt];
  width: number;
  height: number;
  /** Path KanjiVG per kotak (urut baris demi baris); null = kotak kosong. */
  glyphs: (string[] | null)[];
  wobble?: number;
  seed?: number;
}

/** Homografi 4 titik (sama dengan sheetLayout.homography). */
function homography(src: Pt[], dst: Pt[]): number[] {
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
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let k = col; k < 9; k++) A[r][k] -= f * A[col][k];
    }
  }
  return [...Array.from({ length: 8 }, (_, i) => A[i][8] / A[i][i]), 1];
}

const apply = (h: number[], [x, y]: Pt): Pt => {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
};

/** Batas kolom/baris (0–1) dari lebar relatif. */
export function boundaries(sizes: number[]): number[] {
  const total = sizes.reduce((n, s) => n + s, 0);
  let at = 0;
  return [0, ...sizes.map((s) => (at += s) / total)];
}

export async function drawnGridPhoto(o: FixtureOptions): Promise<{ jpeg: Buffer; xs: number[]; ys: number[] }> {
  let seed = o.seed ?? 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  const xs = boundaries(o.colW ?? Array(o.cols).fill(1));
  const ys = boundaries(o.rowH ?? Array(o.rows).fill(1));
  const h = homography(
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    o.corners,
  );
  const wob = o.wobble ?? 0.004;
  const poly = (pts: Pt[]) => pts.map((p) => apply(h, p).map((v) => v.toFixed(1)).join(",")).join(" ");
  const lines: string[] = [];
  // Garis tangan: titik-titik bergelombang, sesekali terputus pendek
  const handLine = (a: Pt, b: Pt) => {
    const n = 40;
    let seg: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p: Pt = [a[0] + (b[0] - a[0]) * t + rand() * wob, a[1] + (b[1] - a[1]) * t + rand() * wob];
      if (rand() > 0.47 && i % 13 === 5) {
        if (seg.length > 1) lines.push(`<polyline points="${poly(seg)}"/>`);
        seg = [];
        continue;
      }
      seg.push(p);
    }
    if (seg.length > 1) lines.push(`<polyline points="${poly(seg)}"/>`);
  };
  for (const x of xs) handLine([x, -0.005], [x, 1.005]);
  for (const y of ys) handLine([-0.005, y], [1.005, y]);
  const glyphs: string[] = [];
  o.glyphs.forEach((paths, i) => {
    if (!paths) return;
    const r = Math.floor(i / o.cols);
    const c = i % o.cols;
    const [x0, x1, y0, y1] = [xs[c], xs[c + 1], ys[r], ys[r + 1]];
    for (const d of paths) {
      const pts = samplePath(d).map(([px, py]) => [x0 + (0.12 + (px / 109) * 0.76) * (x1 - x0), y0 + (0.12 + (py / 109) * 0.76) * (y1 - y0)] as Pt);
      glyphs.push(`<polyline points="${poly(pts)}"/>`);
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width}" height="${o.height}">
<rect width="100%" height="100%" fill="#f3efe6"/>
<g fill="none" stroke="#2a2a35" stroke-width="${Math.max(2, o.width / 350)}" stroke-linecap="round">${lines.join("")}</g>
<g fill="none" stroke="#151520" stroke-width="${Math.max(3, o.width / 160)}" stroke-linecap="round" stroke-linejoin="round">${glyphs.join("")}</g>
</svg>`;
  const jpeg = await sharp(Buffer.from(svg)).blur(0.6).jpeg({ quality: 85 }).toBuffer();
  return { jpeg, xs, ys };
}
