/**
 * Data goresan KanjiVG (kanji & kana): urutan, arah, dan bentuk setiap goresan sebagai path SVG di kotak 109×109.
 * Dipakai Gerbang Tulis untuk menilai urutan goresan di kanvas dan sebagai contoh huruf pada lembar ujian kertas
 * (lembar ujian tidak mencetak hurufnya).
 *
 * KanjiVG © Ulrich Apel, CC BY-SA 3.0 (http://kanjivg.tagaini.net). Versi dikunci supaya nilai tidak berubah diam-diam.
 */
import sharp from "sharp";
import type { RawImage } from "./sheetLayout";

export const KANJIVG_VERSION = "r20250816";
export const KANJIVG_SIZE = 109;

type Pt = [number, number];

/** Nama berkas KanjiVG: kode Unicode heksadesimal 5 digit, mis. 日 → 065e5. */
export function kanjiVgCode(char: string): string {
  return char.codePointAt(0)!.toString(16).padStart(5, "0");
}

export function kanjiVgUrl(char: string): string {
  return `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${KANJIVG_VERSION}/kanji/${kanjiVgCode(char)}.svg`;
}

/** Path goresan berurutan dari isi berkas SVG KanjiVG (id "kvg:065e5-s1", "-s2", …). */
export function parseKanjiVg(svg: string): string[] {
  const strokes: { n: number; d: string }[] = [];
  for (const [tag] of svg.matchAll(/<path\b[^>]*>/g)) {
    const n = /id="kvg:[0-9a-f]+-s(\d+)"/.exec(tag)?.[1];
    const d = /\sd="([^"]+)"/.exec(tag)?.[1];
    if (n && d) strokes.push({ n: Number(n), d });
  }
  return strokes.sort((a, b) => a.n - b.n).map((s) => s.d);
}

const cache = new Map<string, Promise<string[] | null>>();

/** Goresan satu huruf; null bila KanjiVG tidak punya hurufnya atau tidak bisa dihubungi (dicoba lagi lain kali). */
export function kanjiVgStrokes(char: string): Promise<string[] | null> {
  const hit = cache.get(char);
  if (hit) return hit;
  const job = fetch(kanjiVgUrl(char), { signal: AbortSignal.timeout(8000) })
    .then(async (res) => (res.ok ? parseKanjiVg(await res.text()) : null))
    .then((strokes) => (strokes?.length ? strokes : null))
    .catch(() => null)
    .then((strokes) => {
      if (!strokes) cache.delete(char);
      return strokes;
    });
  cache.set(char, job);
  return job;
}

// ───────────────────────── Path SVG → titik ─────────────────────────

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** Titik-titik di sepanjang path (perintah M L H V C S Z, besar/kecil), dalam satuan path. */
export function samplePath(d: string, perSegment = 12): Pt[] {
  const tokens = d.match(/[MmLlHhVvCcSsZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const out: Pt[] = [];
  let i = 0;
  let cmd = "";
  let cur: Pt = [0, 0];
  let start: Pt = [0, 0];
  let lastCtrl: Pt | null = null;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const at = (x: number, y: number): Pt => (rel ? [cur[0] + x, cur[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case "M": {
        cur = at(num(), num());
        start = cur;
        out.push(cur);
        lastCtrl = null;
        // Pasangan angka berikutnya setelah M adalah garis lurus
        cmd = rel ? "l" : "L";
        break;
      }
      case "L": {
        cur = at(num(), num());
        out.push(cur);
        lastCtrl = null;
        break;
      }
      case "H": {
        const x = num();
        cur = [rel ? cur[0] + x : x, cur[1]];
        out.push(cur);
        lastCtrl = null;
        break;
      }
      case "V": {
        const y = num();
        cur = [cur[0], rel ? cur[1] + y : y];
        out.push(cur);
        lastCtrl = null;
        break;
      }
      case "C":
      case "S": {
        const smooth = cmd.toUpperCase() === "S";
        const c1: Pt = smooth ? (lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur) : at(num(), num());
        const c2 = at(num(), num());
        const end = at(num(), num());
        for (let k = 1; k <= perSegment; k++) out.push(cubic(cur, c1, c2, end, k / perSegment));
        lastCtrl = c2;
        cur = end;
        break;
      }
      case "Z": {
        cur = start;
        out.push(cur);
        lastCtrl = null;
        // Z tidak punya angka; angka sesudahnya tanpa perintah baru = path rusak
        cmd = "";
        break;
      }
      default:
        // Token tak dikenal: hentikan supaya tidak berputar selamanya
        return out;
    }
  }
  return out;
}

// ───────────────────────── Gambar contoh huruf ─────────────────────────

/**
 * Huruf contoh (hitam di atas putih) seukuran potongan kotak tulisan: gambar `size`×`size` piksel dengan kotak tulis
 * di dalam tepi `pad` piksel, sama seperti potongan kotak dari foto (rectify), sehingga ukurannya bisa dibandingkan.
 */
export async function renderReference(strokes: string[], size: number, pad: number): Promise<RawImage> {
  const inner = size - 2 * pad;
  const scale = inner / KANJIVG_SIZE;
  const paths = strokes.map((d) => `<path d="${d.replace(/"/g, "")}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="100%" height="100%" fill="#fff"/>
<g transform="translate(${pad} ${pad}) scale(${scale})" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}
