/**
 * Geometri lembar cetak Tulis di Buku dan pelurusan foto.
 * Aplikasi web mencari kisi kotak di kamera (penanda hitam + "rapatkan ke garis kotak") dan mengirim 4 sudut kisi;
 * dari situ letak setiap kotak dihitung dari tata letak cetak, sehingga yang dinilai hanya isi kotak.
 *
 * Satuan mm, titik (0,0) = sudut kiri-atas kotak contoh huruf pertama. Harus sama dengan CSS .pGrid
 * (apps/web/src/features/huruf/ui/tulisBuku.module.css) dan LAYOUT di apps/web/src/features/huruf/lib/sheetGeometry.ts.
 */

export const PRINT_LAYOUT = {
  box: 15,
  colGap: 1.4,
  lineGap: 1.2,
  charGap: 2.6,
  /** Kotak tulisan per baris (di luar kotak contoh / label もう一回). */
  cols: 9,
};

export type Point = [number, number];
export type Matrix = number[]; // 3×3 baris demi baris

export interface Geometry {
  box: number;
  gridW: number;
  gridH: number;
  pitch: number;
  /** Sudut kisi (mm): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: [Point, Point, Point, Point];
}

export function geometry(charCount: number): Geometry {
  const L = PRINT_LAYOUT;
  const box = L.box;
  const gridW = (L.cols + 1) * box + L.cols * L.colGap;
  const gridH = charCount * (2 * box + L.lineGap) + (charCount - 1) * L.charGap;
  return { box, gridW, gridH, pitch: 2 * box + L.lineGap + L.charGap, corners: [[0, 0], [gridW, 0], [gridW, gridH], [0, gridH]] };
}

/** Sudut kiri-atas kotak tulisan: huruf ke-c, baris l (0 = atas, 1 = もう一回), kolom k (0..8; -1 = kotak contoh). */
export function cellOrigin(g: Geometry, c: number, l: number, k: number): Point {
  return [(k + 1) * (g.box + PRINT_LAYOUT.colGap), c * g.pitch + l * (g.box + PRINT_LAYOUT.lineGap)];
}

// ───────────────────────── Homografi ─────────────────────────

/** Homografi dari 4 pasangan titik (src → dst). */
export function homography(src: Point[], dst: Point[]): Matrix {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Eliminasi Gauss dengan pivot parsial
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    if (Math.abs(A[col][col]) < 1e-12) throw new Error("Penanda tidak membentuk segi empat");
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

// ───────────────────────── Deteksi penanda ─────────────────────────

export interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

function luminance(img: RawImage): Float32Array {
  const out = new Float32Array(img.width * img.height);
  for (let i = 0, p = 0; i < out.length; i++, p += img.channels) out[i] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
  return out;
}

/** Tinta = jauh lebih gelap dari rata-rata sekitarnya (tulisan pensil/spidol; garis kotak abu-abu tipis tidak). */
function inkMask(img: RawImage): Uint8Array {
  const lum = luminance(img);
  const { width: W, height: H } = img;
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

/**
 * Seberapa tepat kisi (homografi mm → piksel): tinta tulisan harus berada di dalam kotak, bukan di celah antar-kotak.
 * Pas ≈ 0,95–1; meleset 1/3 kotak ≈ 0,55; setengah kotak < 0. Sama dengan inkFit di web (gridLocate.ts).
 * Dipakai sebagai ganti garis kotak, karena garis abu-abu tipis sering hampir tak terlihat di foto HP.
 */
export function inkFit(img: RawImage, g: Geometry, h: Matrix): { fit: number; density: number } {
  const ink = inkMask(img);
  const { width: W, height: H } = img;
  const at = (x: number, y: number) => {
    const [px, py] = apply(h, [x, y]);
    const xi = Math.round(px);
    const yi = Math.round(py);
    return xi >= 0 && yi >= 0 && xi < W && yi < H ? ink[yi * W + xi] : 0;
  };
  const B = g.box;
  const chars = Math.round((g.gridH + PRINT_LAYOUT.charGap) / g.pitch);
  let inside = 0;
  let ni = 0;
  let gap = 0;
  let ng = 0;
  for (let c = 0; c < chars; c++)
    for (let l = 0; l < 2; l++)
      for (let k = 0; k < PRINT_LAYOUT.cols; k++) {
        const [x0, y0] = cellOrigin(g, c, l, k);
        const mx = x0 + B / 2;
        const my = y0 + B / 2;
        for (let a = -3; a <= 3; a++)
          for (let b = -3; b <= 3; b++) {
            inside += at(mx + (a * 0.35 * B) / 3, my + (b * 0.35 * B) / 3);
            ni++;
          }
        for (let t = -4; t <= 4; t++) {
          gap += at(mx + B / 2 + PRINT_LAYOUT.colGap / 2, my + (t * 0.45 * B) / 4) + at(mx + (t * 0.45 * B) / 4, my + B / 2 + PRINT_LAYOUT.lineGap / 2);
          ng += 2;
        }
      }
  const density = inside / ni;
  return { fit: density > 0 ? 1 - gap / ng / density : 0, density };
}

// ───────────────────────── Pelurusan ─────────────────────────

/**
 * Ambil area (dalam mm) dari foto dan luruskan dengan homografi mm → piksel foto (interpolasi bilinear).
 * Hasil RGB mentah, `scale` piksel per mm.
 */
export function rectify(img: RawImage, h: Matrix, area: { x: number; y: number; w: number; h: number }, scale: number): RawImage {
  const outW = Math.round(area.w * scale);
  const outH = Math.round(area.h * scale);
  const out = Buffer.alloc(outW * outH * 3);
  const { data, width: W, height: H, channels: C } = img;
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const [sx, sy] = apply(h, [area.x + (ox + 0.5) / scale, area.y + (oy + 0.5) / scale]);
      const x0 = Math.floor(sx - 0.5);
      const y0 = Math.floor(sy - 0.5);
      const fx = sx - 0.5 - x0;
      const fy = sy - 0.5 - y0;
      const o = (oy * outW + ox) * 3;
      for (let ch = 0; ch < 3; ch++) {
        const at = (x: number, y: number) => data[(Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * C + ch];
        out[o + ch] = Math.round(
          at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy,
        );
      }
    }
  }
  return { data: out, width: outW, height: outH, channels: 3 };
}

/**
 * Seberapa banyak "tinta" (goresan pensil gelap) di bagian dalam sebuah kotak pada gambar yang sudah lurus.
 * Garis bantu dan huruf abu-abu cetak jauh lebih terang sehingga tidak terhitung.
 */
export function inkRatio(img: RawImage, x: number, y: number, size: number): number {
  const inset = Math.round(size * 0.1);
  const lum: number[] = [];
  for (let yy = y + inset; yy < y + size - inset; yy++) {
    for (let xx = x + inset; xx < x + size - inset; xx++) {
      if (xx < 0 || yy < 0 || xx >= img.width || yy >= img.height) continue;
      const p = (yy * img.width + xx) * img.channels;
      lum.push(0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2]);
    }
  }
  if (!lum.length) return 0;
  const sorted = [...lum].sort((a, b) => a - b);
  const paper = sorted[Math.floor(sorted.length * 0.9)];
  return lum.filter((v) => v < paper * 0.55).length / lum.length;
}

// ───────────────────────── Gambar berlabel untuk penilaian ─────────────────────────

/** Segmen angka gaya jam digital: a atas, b kanan-atas, c kanan-bawah, d bawah, e kiri-bawah, f kiri-atas, g tengah. */
const SEGMENTS: Record<string, string> = {
  "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg", A: "abcefg", B: "cdefg",
};

function fillRect(img: RawImage, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  for (let yy = Math.max(0, y); yy < Math.min(img.height, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(img.width, x + w); xx++) {
      const p = (yy * img.width + xx) * 3;
      img.data[p] = rgb[0];
      img.data[p + 1] = rgb[1];
      img.data[p + 2] = rgb[2];
    }
  }
}

/** Gambar satu karakter label (tanpa font, supaya sama di server mana pun). */
function drawGlyph(img: RawImage, ch: string, x: number, y: number, w: number, h: number, rgb: [number, number, number]) {
  const t = Math.max(2, Math.round(w / 5));
  const half = Math.round(h / 2);
  const seg: Record<string, [number, number, number, number]> = {
    a: [x, y, w, t],
    b: [x + w - t, y, t, half],
    c: [x + w - t, y + half, t, h - half],
    d: [x, y + h - t, w, t],
    e: [x, y + half, t, h - half],
    f: [x, y, t, half],
    g: [x, y + half - Math.floor(t / 2), w, t],
  };
  for (const s of SEGMENTS[ch] ?? "") fillRect(img, ...seg[s], rgb);
}

export interface LabeledSheet {
  image: RawImage;
  /** Kotak tulisan baris l (0 = A, 1 = B), kolom k (0..8) di gambar ini, dalam piksel. */
  cell: (l: number, k: number) => { x: number; y: number; size: number };
}

/**
 * Susun ulang satu huruf menjadi gambar rapi: kotak contoh cetak di kiri, lalu 2 baris (A, B) × 9 kotak tulisan
 * berjarak, dengan nomor kolom 1–9 di atas dan huruf baris di kiri. Model cukup menyebut "A3" tanpa menebak koordinat.
 */
export function composeLabeled(model: RawImage, cells: RawImage[][]): LabeledSheet {
  const size = model.width;
  const gap = Math.round(size * 0.16);
  const band = Math.round(size * 0.34);
  const sep = Math.round(size * 0.3);
  const left = band + size + sep;
  const cols = cells[0].length;
  const width = left + cols * size + (cols - 1) * gap + gap;
  const height = band + 2 * size + gap + gap;
  const image: RawImage = { data: Buffer.alloc(width * height * 3, 255), width, height, channels: 3 };
  const blit = (src: RawImage, x: number, y: number) => {
    for (let yy = 0; yy < src.height; yy++) src.data.copy(image.data, ((y + yy) * width + x) * 3, yy * src.width * 3, (yy + 1) * src.width * 3);
  };
  const cell = (l: number, k: number) => ({ x: left + k * (size + gap), y: band + l * (size + gap), size });
  blit(model, band, band);
  const gw = Math.round(band * 0.42);
  const gh = Math.round(band * 0.7);
  const ink: [number, number, number] = [20, 20, 20];
  cells.forEach((row, l) =>
    row.forEach((img, k) => {
      const c = cell(l, k);
      blit(img, c.x, c.y);
      if (l === 0) drawGlyph(image, String(k + 1), c.x + Math.round((size - gw) / 2), Math.round((band - gh) / 2), gw, gh, ink);
    }),
  );
  ["A", "B"].forEach((ch, l) => drawGlyph(image, ch, band + size + Math.round((sep - gw) / 2), cell(l, 0).y + Math.round((size - gh) / 2), gw, gh, [177, 42, 58]));
  return { image, cell };
}

/** Gambar pasangan untuk pemeriksaan ulang: huruf contoh cetak di kiri, tulisan siswa di kanan, dipisah garis abu-abu. */
export function composePair(model: RawImage, cell: RawImage): RawImage {
  const gap = Math.round(cell.width * 0.12);
  const width = model.width + gap + cell.width;
  const height = Math.max(model.height, cell.height);
  const image: RawImage = { data: Buffer.alloc(width * height * 3, 255), width, height, channels: 3 };
  const blit = (src: RawImage, x: number) => {
    for (let yy = 0; yy < src.height; yy++) src.data.copy(image.data, (yy * width + x) * 3, yy * src.width * 3, (yy + 1) * src.width * 3);
  };
  blit(model, 0);
  blit(cell, model.width + gap);
  fillRect(image, model.width + Math.floor(gap / 2) - 1, 0, 2, height, [170, 170, 170]);
  return image;
}
