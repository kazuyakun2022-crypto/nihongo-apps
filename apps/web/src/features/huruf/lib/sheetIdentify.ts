/**
 * Kenali lembar mana yang difoto dari huruf cetak di kotak contoh (kolom merah). Huruf di foto dibandingkan dengan
 * huruf yang digambar ulang memakai font lembar cetak (Noto Sans JP); kecocokan dihitung dengan korelasi bentuk.
 * Dipakai untuk menolak foto lembar lain (mis. memilih Baris a tetapi memotret Baris ka) dan menyarankan lembar yang
 * benar. Berjalan di HP, tanpa AI.
 */
import { apply, cellOrigin, gridCorners, homography, LAYOUT, type Img, type Quad } from "./sheetGeometry";

const N = 32;

export interface SheetLike {
  id: string;
  chars: { char: string }[];
}

/** Rapikan peta "kegelapan" huruf: potong ke batas tinta, jadikan persegi, kecilkan ke N×N, haluskan, normalkan. */
function normalizeGlyph(dark: Float32Array, w: number, h: number): Float32Array | null {
  let max = 0;
  for (const v of dark) if (v > max) max = v;
  if (max < 0.15) return null;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (dark[y * w + x] > max * 0.35) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return null;
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  const ox = x0 - (side - (x1 - x0 + 1)) / 2;
  const oy = y0 - (side - (y1 - y0 + 1)) / 2;
  const raw = new Float32Array(N * N);
  for (let gy = 0; gy < N; gy++)
    for (let gx = 0; gx < N; gx++) {
      // Rata-rata area supaya tidak ada detail yang terlewat saat dikecilkan
      let acc = 0;
      let n = 0;
      for (let sy = 0; sy < 3; sy++)
        for (let sx = 0; sx < 3; sx++) {
          const x = Math.round(ox + ((gx + (sx + 0.5) / 3) / N) * side - 0.5);
          const y = Math.round(oy + ((gy + (sy + 0.5) / 3) / N) * side - 0.5);
          acc += x >= 0 && y >= 0 && x < w && y < h ? dark[y * w + x] : 0;
          n++;
        }
      raw[gy * N + gx] = acc / n;
    }
  // Haluskan 3×3: toleransi untuk tebal-tipis goresan dan sedikit geser
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let acc = 0;
      let n = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const xx = x + i;
          const yy = y + j;
          if (xx >= 0 && yy >= 0 && xx < N && yy < N) {
            acc += raw[yy * N + xx];
            n++;
          }
        }
      out[y * N + x] = acc / n;
    }
  let mean = 0;
  for (const v of out) mean += v;
  mean /= out.length;
  let norm = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] -= mean;
    norm += out[i] * out[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

const correlation = (a: Float32Array, b: Float32Array) => a.reduce((s, v, i) => s + v * b[i], 0);

/** Huruf cetak di kotak contoh huruf ke-c (baris atas), dari foto. */
function photoGlyph(img: Img, corners: Quad, charCount: number, c: number): Float32Array | null {
  const h = homography(gridCorners(charCount), corners);
  const [bx, by] = cellOrigin(charCount, c, 0, 0);
  const B = LAYOUT.box;
  // Bagian atas kotak contoh (huruf); bawahnya berisi tulisan latin kecil dan tepinya bingkai merah
  const x0 = bx + 0.12 * B;
  const x1 = bx + 0.88 * B;
  const y0 = by + 0.06 * B;
  const y1 = by + 0.74 * B;
  const S = 48;
  const w = S;
  const hh = Math.round((S * (y1 - y0)) / (x1 - x0));
  const lum = new Float32Array(w * hh);
  const red = new Uint8Array(w * hh);
  for (let y = 0; y < hh; y++)
    for (let x = 0; x < w; x++) {
      const [px, py] = apply(h, [x0 + ((x + 0.5) / w) * (x1 - x0), y0 + ((y + 0.5) / hh) * (y1 - y0)]);
      const xi = Math.round(px);
      const yi = Math.round(py);
      if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) continue;
      const p = (yi * img.width + xi) * img.channels;
      const [r, g, b] = [img.data[p], img.data[p + 1], img.data[p + 2]];
      lum[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b;
      red[y * w + x] = r - (g + b) / 2 > 45 ? 1 : 0;
    }
  const sorted = Float32Array.from(lum).sort();
  const paper = sorted[Math.floor(sorted.length * 0.9)] || 1;
  const dark = new Float32Array(w * hh);
  for (let i = 0; i < dark.length; i++) dark[i] = red[i] ? 0 : Math.max(0, (paper - lum[i]) / paper - 0.15);
  return normalizeGlyph(dark, w, hh);
}

const templates = new Map<string, Float32Array | null>();

/** Huruf yang digambar dengan font lembar cetak. */
function fontGlyph(char: string): Float32Array | null {
  if (templates.has(char)) return templates.get(char)!;
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = "#000";
  ctx.font = `400 ${Math.round(S * 0.8)}px "Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, S / 2, S / 2);
  const d = ctx.getImageData(0, 0, S, S).data;
  const dark = new Float32Array(S * S);
  for (let i = 0; i < dark.length; i++) dark[i] = (255 - d[i * 4]) / 255;
  const glyph = normalizeGlyph(dark, S, S);
  templates.set(char, glyph);
  return glyph;
}

/** Pastikan font lembar cetak sudah dimuat untuk semua huruf sebelum dibandingkan. */
export async function loadSheetFont(sheets: SheetLike[]) {
  if (typeof document === "undefined" || !document.fonts) return;
  const text = [...new Set(sheets.flatMap((s) => s.chars.map((c) => c.char)))].join("");
  await document.fonts.load(`400 48px "Noto Sans JP"`, text).catch(() => undefined);
}

export interface SheetMatch {
  /** Lembar paling cocok dengan huruf contoh di foto. */
  bestId: string;
  best: number;
  /** Kecocokan lembar yang dipilih pengguna (rata-rata korelasi, -1..1). */
  selected: number;
}

/**
 * Bandingkan huruf contoh di foto dengan setiap lembar. `corners` = kisi untuk jumlah huruf lembar yang dipilih;
 * baris-baris atas posisinya sama untuk semua lembar, jadi lembar dengan jumlah huruf berbeda tetap bisa dibandingkan.
 */
export function matchSheet(img: Img, corners: Quad, charCount: number, sheets: SheetLike[], selectedId: string): SheetMatch {
  const seen = Array.from({ length: charCount }, (_, c) => photoGlyph(img, corners, charCount, c));
  const score = (sheet: SheetLike) => {
    const rows = Math.max(sheet.chars.length, charCount);
    let total = 0;
    for (let c = 0; c < rows; c++) {
      const tpl = c < sheet.chars.length ? fontGlyph(sheet.chars[c].char) : null;
      const got = c < charCount ? seen[c] : null;
      // Baris tanpa huruf di salah satu sisi: cocok bila keduanya kosong
      if (!tpl || !got) total += !tpl && !got ? 1 : c < charCount ? 0 : 0.5;
      else total += correlation(tpl, got);
    }
    return total / rows;
  };
  let bestId = selectedId;
  let best = -Infinity;
  let selected = 0;
  for (const s of sheets) {
    const v = score(s);
    if (s.id === selectedId) selected = v;
    if (v > best) {
      best = v;
      bestId = s.id;
    }
  }
  return { bestId, best, selected };
}
