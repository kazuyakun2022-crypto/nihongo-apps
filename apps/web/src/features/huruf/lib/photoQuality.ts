/**
 * Pemeriksaan kualitas foto lembar sebelum dikirim (tanpa AI, di HP): buram, terlalu gelap, atau ada bayangan.
 * Dipakai pemindai lembar cetak (SheetScanner) dan kisi gambar sendiri (DrawnGridScanner).
 *
 * Ambang dikalibrasi pada foto sintetis (apps/api/tests/photoQuality.test.ts) dengan lebar analisis ANALYSIS_WIDTH:
 * ketajaman bergantung pada skala gambar, jadi gambar selalu diukur pada lebar yang sama.
 */
import { luminance, type Img } from "./sheetGeometry";

export const ANALYSIS_WIDTH = 640;

/** Ketajaman: rata-rata |Laplacian| pada 3% piksel bertepi paling kuat (tepi tulisan/garis). */
const SHARP_MIN = 14;
/** Kecerahan kertas (persentil 90) di bawah ini = terlalu gelap. */
const BRIGHT_MIN = 95;
/** Blok kertas paling gelap dibanding paling terang: di bawah ini = ada bayangan. */
const EVEN_MIN = 0.55;

export interface PhotoQuality {
  blurry: boolean;
  dark: boolean;
  shadow: boolean;
  sharpness: number;
  brightness: number;
  evenness: number;
}

/** Area yang diukur (piksel); bawaan seluruh gambar. Biasanya area kisi supaya meja di sekitarnya tidak ikut. */
export interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

export function photoQuality(img: Img, area?: Area): PhotoQuality {
  const { width: W, height: H } = img;
  const lum = luminance(img);
  const x0 = Math.max(1, Math.floor(area?.x0 ?? 0));
  const y0 = Math.max(1, Math.floor(area?.y0 ?? 0));
  const x1 = Math.min(W - 1, Math.ceil(area?.x1 ?? W));
  const y1 = Math.min(H - 1, Math.ceil(area?.y1 ?? H));
  const step = Math.max(1, Math.round((x1 - x0) / 400));

  const lap: number[] = [];
  const paper: number[] = [];
  for (let y = y0; y < y1; y += step)
    for (let x = x0; x < x1; x += step) {
      const i = y * W + x;
      lap.push(Math.abs(4 * lum[i] - lum[i - 1] - lum[i + 1] - lum[i - W] - lum[i + W]));
      paper.push(lum[i]);
    }
  // Hanya tepi terkuat: kertas kosong yang luas tidak boleh membuat foto tajam terlihat buram
  const strong = [...lap].sort((a, b) => b - a).slice(0, Math.max(10, Math.floor(lap.length * 0.03)));
  const sharpness = strong.reduce((n, v) => n + v, 0) / strong.length;
  const brightness = percentile(paper, 0.9);

  // Bayangan: kecerahan kertas (persentil 85) per blok 4×4
  const blocks: number[] = [];
  const bw = (x1 - x0) / 4;
  const bh = (y1 - y0) / 4;
  for (let by = 0; by < 4; by++)
    for (let bx = 0; bx < 4; bx++) {
      const vals: number[] = [];
      for (let y = Math.floor(y0 + by * bh); y < y0 + (by + 1) * bh; y += step)
        for (let x = Math.floor(x0 + bx * bw); x < x0 + (bx + 1) * bw; x += step) vals.push(lum[y * W + x]);
      blocks.push(percentile(vals, 0.85));
    }
  const evenness = Math.min(...blocks) / Math.max(1, ...blocks);

  return {
    blurry: sharpness < SHARP_MIN,
    dark: brightness < BRIGHT_MIN,
    shadow: evenness < EVEN_MIN,
    sharpness: Math.round(sharpness * 10) / 10,
    brightness: Math.round(brightness),
    evenness: Math.round(evenness * 100) / 100,
  };
}

/** Pesan untuk siswa, paling penting dulu; kosong bila foto baik. */
export function qualityProblems(q: PhotoQuality): string[] {
  const out: string[] = [];
  if (q.blurry) out.push("Foto buram: tahan HP diam sebentar dan ketuk layar untuk fokus.");
  if (q.dark) out.push("Terlalu gelap: pindah ke tempat yang lebih terang atau nyalakan lampu.");
  if (q.shadow) out.push("Ada bayangan di kertas: geser posisi supaya bayangan HP/tangan tidak menutupi kertas.");
  return out;
}
