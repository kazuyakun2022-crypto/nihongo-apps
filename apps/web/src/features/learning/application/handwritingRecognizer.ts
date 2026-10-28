/**
 * Pengenal tulisan tangan kana (dan kanji bab) yang berjalan sepenuhnya di browser.
 *
 * Cara kerja: coretan siswa dan setiap huruf kandidat (digambar dari font) sama-sama dinormalisasi ke
 * kotak G×G, ditipiskan menjadi kerangka garis satu piksel, lalu dibandingkan dengan jarak chamfer dua arah
 * (seberapa jauh tiap titik coretan dari huruf, dan sebaliknya). Jumlah goresan dipakai sebagai pertimbangan
 * tambahan. Cukup akurat untuk kana karena kandidatnya sedikit; bukan pengganti OCR umum.
 */

export interface Point {
  x: number;
  y: number;
}
export type Stroke = Point[];
export type Script = "hiragana" | "katakana" | "campuran";

export interface Candidate {
  char: string;
  score: number;
}

const G = 48;
const MARGIN = 4;
const FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';

// Jumlah goresan baku; versi dakuten (+2) dan handakuten (+1) diturunkan otomatis.
const HIRAGANA = "あ3い2う2え2お3か3き4く1け3こ2さ3し1す2せ3そ1た4ち2つ1て1と2な4に3ぬ2ね2の1は3ひ1ふ4へ1ほ4ま3み2む3め2も3や3ゆ2よ2ら2り2る1れ2ろ1わ2を3ん1";
const KATAKANA = "ア2イ2ウ3エ3オ3カ2キ3ク2ケ3コ2サ3シ3ス2セ2ソ2タ3チ3ツ3テ3ト2ナ2ニ2ヌ2ネ4ノ1ハ2ヒ2フ1ヘ1ホ4マ2ミ3ム2メ2モ3ヤ2ユ2ヨ3ラ2リ2ル2レ1ロ3ワ2ヲ3ン2";
const DAKUTEN_BASE = "かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホ";
const HANDAKUTEN_BASE = "はひふへほハヒフヘホ";
const SMALL_OF = "あいうえおつやゆよアイウエオツヤユヨ";

interface CharInfo {
  char: string;
  strokes: number | null;
  script: "hiragana" | "katakana" | "kanji";
  small: boolean;
}

function kanaInventory(): CharInfo[] {
  const list: CharInfo[] = [];
  const add = (table: string, script: "hiragana" | "katakana") => {
    for (const [, char, n] of table.matchAll(/(.)(\d)/gu)) {
      const strokes = Number(n);
      list.push({ char, strokes, script, small: false });
      if (DAKUTEN_BASE.includes(char)) list.push({ char: String.fromCharCode(char.charCodeAt(0) + 1), strokes: strokes + 2, script, small: false });
      if (HANDAKUTEN_BASE.includes(char)) list.push({ char: String.fromCharCode(char.charCodeAt(0) + 2), strokes: strokes + 1, script, small: false });
      if (SMALL_OF.includes(char)) list.push({ char: String.fromCharCode(char.charCodeAt(0) - 1), strokes, script, small: true });
    }
  };
  add(HIRAGANA, "hiragana");
  add(KATAKANA, "katakana");
  list.push({ char: "ー", strokes: 1, script: "katakana", small: false });
  return list;
}
const KANA = kanaInventory();

// ── Pengolahan citra pada kotak G×G (1 = tinta) ──

function inkBounds(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

/** Skala seragam agar sisi terpanjang mengisi kotak; garis lurus tetap lurus, tidak melar. */
function fitTransform(b: { minX: number; minY: number; w: number; h: number }) {
  const scale = (G - 2 * MARGIN) / Math.max(b.w, b.h, 1);
  const offX = (G - b.w * scale) / 2;
  const offY = (G - b.h * scale) / 2;
  return (p: Point): Point => ({ x: (p.x - b.minX) * scale + offX, y: (p.y - b.minY) * scale + offY });
}

function binarize(ctx: CanvasRenderingContext2D): Uint8Array {
  const data = ctx.getImageData(0, 0, G, G).data;
  const out = new Uint8Array(G * G);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 96 ? 1 : 0;
  return out;
}

/** Penipisan Zhang–Suen: tinta tebal maupun tipis menjadi kerangka satu piksel sehingga bisa dibandingkan. */
function thin(img: Uint8Array): Uint8Array {
  const a = img.slice();
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= G || y >= G ? 0 : a[y * G + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      const remove: number[] = [];
      for (let y = 0; y < G; y++) {
        for (let x = 0; x < G; x++) {
          if (!a[y * G + x]) continue;
          const n = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
          const b = n.reduce((s, v) => s + v, 0);
          if (b < 2 || b > 6) continue;
          let transitions = 0;
          for (let i = 0; i < 8; i++) if (!n[i] && n[(i + 1) % 8]) transitions++;
          if (transitions !== 1) continue;
          if (pass === 0 ? n[0] * n[2] * n[4] || n[2] * n[4] * n[6] : n[0] * n[2] * n[6] || n[0] * n[4] * n[6]) continue;
          remove.push(y * G + x);
        }
      }
      for (const i of remove) a[i] = 0;
      if (remove.length) changed = true;
    }
  }
  return a;
}

/** Jarak tiap piksel ke tinta terdekat (chamfer 3-4, dibagi 3 ≈ piksel). */
function distanceMap(img: Uint8Array): Float32Array {
  const INF = 1e6;
  const d = new Float32Array(G * G);
  for (let i = 0; i < d.length; i++) d[i] = img[i] ? 0 : INF;
  const relax = (i: number, j: number, cost: number) => {
    if (d[j] + cost < d[i]) d[i] = d[j] + cost;
  };
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const i = y * G + x;
      if (x > 0) relax(i, i - 1, 3);
      if (y > 0) {
        relax(i, i - G, 3);
        if (x > 0) relax(i, i - G - 1, 4);
        if (x < G - 1) relax(i, i - G + 1, 4);
      }
    }
  for (let y = G - 1; y >= 0; y--)
    for (let x = G - 1; x >= 0; x--) {
      const i = y * G + x;
      if (x < G - 1) relax(i, i + 1, 3);
      if (y < G - 1) {
        relax(i, i + G, 3);
        if (x < G - 1) relax(i, i + G + 1, 4);
        if (x > 0) relax(i, i + G - 1, 4);
      }
    }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

const BINS = 4; // arah garis: 0°, 45°, 90°, 135°
const TURN_COST = 1.5; // "jarak" tambahan (piksel) per 45° perbedaan arah

interface Shape {
  ink: number[];
  /** Arah garis di tiap titik tinta (indeks bin). */
  dir: Uint8Array;
  /** Peta jarak per arah: tinta yang searah dekat dianggap lebih cocok daripada tinta yang memotong. */
  dist: Float32Array[];
}

/** Arah lokal tiap titik kerangka dari sebaran titik tetangga (radius 2). */
function directions(skeleton: Uint8Array, ink: number[]): Uint8Array {
  const dir = new Uint8Array(G * G);
  for (const i of ink) {
    const x0 = i % G;
    const y0 = (i - x0) / G;
    let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= G || y >= G || !skeleton[y * G + x]) continue;
        n++; sx += dx; sy += dy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
    const cxx = sxx / n - (sx / n) ** 2, cyy = syy / n - (sy / n) ** 2, cxy = sxy / n - (sx / n) * (sy / n);
    const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy); // -90°..90°
    dir[i] = Math.round(((angle + Math.PI) % Math.PI) / (Math.PI / BINS)) % BINS;
  }
  return dir;
}

function toShape(img: Uint8Array): Shape | null {
  const skeleton = thin(img);
  const ink: number[] = [];
  for (let i = 0; i < skeleton.length; i++) if (skeleton[i]) ink.push(i);
  if (!ink.length) return null;
  const dir = directions(skeleton, ink);
  const dist = Array.from({ length: BINS }, (_, b) => {
    const layer = new Uint8Array(G * G);
    for (const i of ink) if (dir[i] === b) layer[i] = 1;
    return distanceMap(layer);
  });
  return { ink, dir, dist };
}

function pointCost(i: number, bin: number, other: Shape): number {
  let best = Infinity;
  for (let b = 0; b < BINS; b++) {
    const turn = Math.min(Math.abs(b - bin), BINS - Math.abs(b - bin));
    best = Math.min(best, other.dist[b][i] + turn * TURN_COST);
  }
  return best;
}

/** 0–1: makin besar makin mirip. Jarak yang lebih buruk dari dua arah diberi bobot lebih agar bagian yang hilang ikut terhitung. */
function similarity(a: Shape, b: Shape): number {
  let ab = 0;
  for (const i of a.ink) ab += pointCost(i, a.dir[i], b);
  let ba = 0;
  for (const i of b.ink) ba += pointCost(i, b.dir[i], a);
  const d1 = ab / a.ink.length;
  const d2 = ba / b.ink.length;
  const d = (d1 + d2) / 4 + Math.max(d1, d2) / 2;
  return Math.max(0, 1 - d / 6);
}

// ── Template huruf ──

function canvas2d(): CanvasRenderingContext2D {
  const c = document.createElement("canvas");
  c.width = G;
  c.height = G;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas tidak tersedia");
  return ctx;
}

const templateCache = new Map<string, Shape | null>();

/** Huruf digambar besar dulu untuk mencari batas tinta, lalu digambar ulang pas di kotak G×G. */
function glyphBitmap(char: string, font: string): Uint8Array {
  const S = 160;
  const big = document.createElement("canvas");
  big.width = S;
  big.height = S;
  const bctx = big.getContext("2d", { willReadFrequently: true });
  if (!bctx) return new Uint8Array(G * G);
  bctx.font = `400 ${S * 0.75}px ${font}`;
  bctx.textAlign = "center";
  bctx.textBaseline = "middle";
  bctx.fillText(char, S / 2, S / 2);
  const data = bctx.getImageData(0, 0, S, S).data;
  const pts: Point[] = [];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (data[(y * S + x) * 4 + 3] > 96) pts.push({ x, y });
  if (!pts.length) return new Uint8Array(G * G);
  const b = inkBounds(pts);
  const scale = (G - 2 * MARGIN) / Math.max(b.w, b.h, 1);
  const ctx = canvas2d();
  ctx.drawImage(big, b.minX, b.minY, b.w + 1, b.h + 1, (G - b.w * scale) / 2, (G - b.h * scale) / 2, (b.w + 1) * scale, (b.h + 1) * scale);
  return binarize(ctx);
}

function glyphShape(char: string): Shape | null {
  if (!templateCache.has(char)) templateCache.set(char, toShape(glyphBitmap(char, FONT)));
  return templateCache.get(char) ?? null;
}

/** Tunggu font Jepang termuat agar template tidak digambar dengan font cadangan. */
export async function prepareRecognizer(extraChars: string[] = []): Promise<void> {
  const sample = KANA.map((k) => k.char).join("") + extraChars.join("");
  try {
    await document.fonts.load(`400 48px "Noto Sans JP"`, sample);
  } catch {
    // font cadangan sistem tetap bisa dipakai
  }
}

export interface RecognizeOptions {
  script: Script;
  /** Kanji yang boleh muncul (kanji bab ini). */
  kanji?: string[];
  /** Ukuran area tulis, untuk membedakan kana kecil (ゃ っ) dari kana biasa. */
  padSize: number;
  /** Aksara huruf sebelumnya — dipakai untuk memilih antara bentuk yang sama persis (へ/ヘ). */
  preferScript?: "hiragana" | "katakana";
}

export function recognize(strokes: Stroke[], opts: RecognizeOptions): Candidate[] {
  const points = strokes.flat();
  if (points.length < 2) return [];
  const bounds = inkBounds(points);
  const map = fitTransform(bounds);
  const ctx = canvas2d();
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.beginPath();
    const [first, ...rest] = s.map(map);
    ctx.moveTo(first.x, first.y);
    if (rest.length === 0) ctx.lineTo(first.x + 0.5, first.y + 0.5);
    for (const p of rest) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  const small = Math.max(bounds.w, bounds.h) < opts.padSize * 0.45;
  return rankDrawing(binarize(ctx), strokes.length, small, opts);
}

/** Urutkan kandidat untuk gambar G×G yang sudah dinormalisasi. */
function rankDrawing(img: Uint8Array, strokeCount: number, small: boolean, opts: Omit<RecognizeOptions, "padSize">): Candidate[] {
  const drawn = toShape(img);
  if (!drawn) return [];
  const pool: CharInfo[] = [
    ...KANA.filter((k) => opts.script === "campuran" || k.script === opts.script || k.char === "ー"),
    ...(opts.kanji ?? []).map((char) => ({ char, strokes: null, script: "kanji" as const, small: false })),
  ];
  const preferred = opts.preferScript ?? "hiragana";
  const results: Candidate[] = [];
  for (const info of pool) {
    const shape = glyphShape(info.char);
    if (!shape) continue;
    let score = similarity(drawn, shape);
    if (info.strokes !== null) score -= 0.04 * Math.min(Math.abs(strokeCount - info.strokes), 3);
    if (info.small !== small) score -= 0.06;
    if (info.script !== "kanji" && info.script !== preferred) score -= 0.005;
    results.push({ char: info.char, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

/**
 * Skor minimal agar huruf langsung dimasukkan ke kotak jawaban tanpa dipilih manual.
 * Diuji dengan font tulisan tangan (Klee One, Zen Kurenaido, Yomogi): huruf benar umumnya ≥ 0,53,
 * coretan acak ≤ 0,40. Huruf yang keliru dikenali bisa diganti lewat daftar kandidat.
 */
export const AUTO_ACCEPT_SCORE = 0.5;
