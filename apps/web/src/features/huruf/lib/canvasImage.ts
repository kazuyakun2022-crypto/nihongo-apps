/** Pembantu kanvas bersama untuk pemindai lembar (SheetScanner & DrawnGridScanner). */
import type { Img, Quad } from "./sheetGeometry";

export function scaleQuad(q: Quad, sx: number, sy = sx): Quad {
  return q.map(([x, y]) => [x * sx, y * sy]) as Quad;
}

/** Gambar sumber ke kanvas baru, diperkecil ke sisi terpanjang `max`. */
export async function loadCanvas(src: string | CanvasImageSource, width: number, height: number, max: number): Promise<HTMLCanvasElement> {
  const scale = Math.min(1, max / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  if (typeof src === "string") {
    const img = new Image();
    img.src = src;
    await img.decode();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/** Kanvas diperkecil ke lebar tertentu (ukuran analisis tetap supaya ambang kualitas berlaku sama). */
export async function canvasAtWidth(src: CanvasImageSource, width: number, height: number, targetWidth: number): Promise<HTMLCanvasElement> {
  return loadCanvas(src, width, height, width >= height ? targetWidth : Math.round((targetWidth * height) / width));
}

export function imageOf(canvas: HTMLCanvasElement): Img {
  const d = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
  return { data: d.data, width: d.width, height: d.height, channels: 4 };
}

export const nextFrame = () => new Promise((r) => setTimeout(r, 30));

/** Kotak batas sebuah segi empat (untuk mengukur kualitas hanya di area kisi). */
export function quadBounds(q: Quad) {
  const xs = q.map((p) => p[0]);
  const ys = q.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
