/**
 * Pendeteksi kisi gambar tangan (kode web: apps/web/src/features/huruf/lib/drawnGrid.ts). Web tidak punya test runner,
 * dan modul ini murni (tanpa DOM), jadi diuji di sini bersama pemotong kotak server.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { drawnCellQuads, locateDrawnGrid } from "../../web/src/features/huruf/lib/drawnGrid";
import { cropDrawnCells } from "../src/modules/tulis/handwritingCheck";
import { measureWriting } from "../src/modules/tulis/cellMetrics";
import { inkRatio } from "../src/modules/tulis/sheetLayout";
import { drawnGridPhoto } from "./fixtures/drawnGridFixture";

/** 日 (KanjiVG 065e5). */
const HI = [
  "M31.5,24.5c1.12,1.12,1.74,2.75,1.74,4.75c0,1.6-0.16,38.11-0.09,53.5c0.02,3.82,0.05,6.35,0.09,6.75",
  "M33.48,26c0.8-0.05,37.67-3.01,40.77-3.25c3.19-0.25,5,1.75,5,4.25c0,4-0.22,40.84-0.23,56c0,3.48,0,5.72,0,6",
  "M34.22,55.25c7.78-0.5,35.9-2.5,44.06-2.75",
  "M34.23,86.5c10.52-0.75,34.15-2.12,43.81-2.25",
];

async function decode(jpeg: Buffer, width = 720) {
  const { data, info } = await sharp(jpeg).resize({ width }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { img: { data, width: info.width, height: info.height, channels: info.channels }, scale: info.width };
}

const glyphs = (n: number, empty: number[] = []) => Array.from({ length: n }, (_, i) => (empty.includes(i) ? null : HI));

describe("Kisi gambar tangan: deteksi", () => {
  it("kisi 4×5 lurus ditemukan dengan sekat yang benar", async () => {
    const photo = await drawnGridPhoto({ cols: 4, rows: 5, width: 1200, height: 1600, corners: [[200, 250], [1000, 250], [1000, 1250], [200, 1250]], glyphs: glyphs(20, [3, 17]) });
    const { img, scale } = await decode(photo.jpeg);
    const found = locateDrawnGrid(img, 4, 5)!;
    expect(found).not.toBeNull();
    found.xs.forEach((x, i) => expect(x).toBeCloseTo(photo.xs[i], 1));
    found.ys.forEach((y, i) => expect(y).toBeCloseTo(photo.ys[i], 1));
    const k = scale / 1200;
    expect(found.corners[0][0]).toBeCloseTo(200 * k, -1);
    expect(found.corners[2][1]).toBeCloseTo(1250 * k, -1);
  });

  it("perspektif miring, kolom tidak sama lebar, garis bergelombang & terputus", async () => {
    const photo = await drawnGridPhoto({
      cols: 4,
      rows: 5,
      colW: [1, 1.25, 0.85, 1.05],
      rowH: [1, 0.9, 1.15, 1, 0.95],
      width: 1200,
      height: 1600,
      corners: [[260, 300], [980, 220], [1060, 1330], [170, 1250]],
      glyphs: glyphs(20),
      wobble: 0.006,
      seed: 7,
    });
    const { img } = await decode(photo.jpeg);
    const found = locateDrawnGrid(img, 4, 5)!;
    expect(found).not.toBeNull();
    found.xs.forEach((x, i) => expect(Math.abs(x - photo.xs[i])).toBeLessThan(0.03));
    found.ys.forEach((y, i) => expect(Math.abs(y - photo.ys[i])).toBeLessThan(0.03));
    expect(drawnCellQuads(found)).toHaveLength(20);
  });

  it("jumlah kolom berbeda ditolak (3 atau 5 kolom untuk kisi 4 kolom)", async () => {
    for (const cols of [3, 5]) {
      const photo = await drawnGridPhoto({ cols, rows: 5, width: 1200, height: 1600, corners: [[200, 250], [1000, 250], [1000, 1250], [200, 1250]], glyphs: glyphs(cols * 5) });
      const { img } = await decode(photo.jpeg);
      expect(locateDrawnGrid(img, 4, 5)).toBeNull();
    }
  });

  it("deteksi di HP → potongan kotak di server: huruf di tengah, kotak kosong tetap kosong", async () => {
    const photo = await drawnGridPhoto({
      cols: 4,
      rows: 5,
      colW: [1, 1.2, 0.9, 1],
      width: 1200,
      height: 1600,
      corners: [[240, 280], [990, 240], [1040, 1300], [180, 1260]],
      glyphs: glyphs(20, [5, 18]),
      seed: 3,
    });
    const { img } = await decode(photo.jpeg);
    const found = locateDrawnGrid(img, 4, 5)!;
    expect(found).not.toBeNull();
    // Web mengirim sudut dalam skala 0–1; server memotong dari foto ukuran penuh
    const corners = found.corners.map(([x, y]) => [x / img.width, y / img.height] as [number, number]);
    const full = await sharp(photo.jpeg).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const raw = { data: full.data, width: full.info.width, height: full.info.height, channels: full.info.channels };
    const { cells } = cropDrawnCells(raw, { corners, xs: found.xs, ys: found.ys }, 20);
    expect(cells).toHaveLength(20);
    cells.forEach(({ crop }, i) => {
      const ink = inkRatio(crop, 0, 0, crop.width);
      if (i === 5 || i === 18) {
        expect(ink, `kotak ${i + 1} kosong`).toBeLessThan(0.004);
        return;
      }
      expect(ink, `kotak ${i + 1} berisi tulisan`).toBeGreaterThan(0.012);
      const shape = measureWriting(crop, 0)!;
      const [x0, y0, x1, y1] = shape.bbox;
      expect(Math.abs((x0 + x1) / 2 - 0.5), `kotak ${i + 1} di tengah`).toBeLessThan(0.08);
      expect(Math.abs((y0 + y1) / 2 - 0.5)).toBeLessThan(0.08);
    });
  });

  it("foto tanpa kisi ditolak", async () => {
    const blank = await sharp({ create: { width: 900, height: 1200, channels: 3, background: "#f3efe6" } }).jpeg().toBuffer();
    const { img } = await decode(blank);
    expect(locateDrawnGrid(img, 4, 5)).toBeNull();
  });
});
