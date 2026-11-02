/**
 * Kalibrasi pemeriksaan kualitas foto di HP (kode web: apps/web/src/features/huruf/lib/photoQuality.ts) pada foto
 * sintetis kisi bertulisan: asli, diburamkan, digelapkan, dan diberi bayangan.
 */
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { ANALYSIS_WIDTH, photoQuality, type PhotoQuality } from "../../web/src/features/huruf/lib/photoQuality";
import { drawnGridPhoto } from "./fixtures/drawnGridFixture";

const HI = [
  "M31.5,24.5c1.12,1.12,1.74,2.75,1.74,4.75c0,1.6-0.16,38.11-0.09,53.5c0.02,3.82,0.05,6.35,0.09,6.75",
  "M33.48,26c0.8-0.05,37.67-3.01,40.77-3.25c3.19-0.25,5,1.75,5,4.25c0,4-0.22,40.84-0.23,56c0,3.48,0,5.72,0,6",
  "M34.22,55.25c7.78-0.5,35.9-2.5,44.06-2.75",
  "M34.23,86.5c10.52-0.75,34.15-2.12,43.81-2.25",
];

const SHADOW = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><defs><linearGradient id="g"><stop offset="0.4" stop-color="#000" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0.6"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);

async function measure(s: sharp.Sharp): Promise<PhotoQuality> {
  const { data, info } = await s.resize({ width: ANALYSIS_WIDTH }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const q = photoQuality({ data, width: info.width, height: info.height, channels: info.channels });
  if (process.env.CALIB) console.log(JSON.stringify(q));
  return q;
}

describe("Kualitas foto sebelum dikirim", () => {
  let photo: Buffer;
  beforeAll(async () => {
    photo = (await drawnGridPhoto({ cols: 4, rows: 5, width: 1200, height: 1600, corners: [[200, 250], [1000, 250], [1000, 1250], [200, 1250]], glyphs: Array(20).fill(HI) })).jpeg;
  });

  it("foto yang baik lolos semua pemeriksaan", async () => {
    const q = await measure(sharp(photo));
    expect(q).toMatchObject({ blurry: false, dark: false, shadow: false });
  });

  it("sedikit buram masih lolos, sangat buram ditolak", async () => {
    expect((await measure(sharp(photo).blur(1.2))).blurry).toBe(false);
    expect((await measure(sharp(photo).blur(4))).blurry).toBe(true);
  });

  it("terlalu gelap ditolak, redup sedikit masih lolos", async () => {
    expect((await measure(sharp(photo).linear(0.35, 0))).dark).toBe(true);
    expect((await measure(sharp(photo).linear(0.75, 0))).dark).toBe(false);
  });

  it("bayangan di separuh kertas terdeteksi", async () => {
    // sharp mengubah ukuran sebelum menempel, jadi bayangan ditempel lebih dulu
    const q = await measure(sharp(await sharp(photo).composite([{ input: SHADOW }]).toBuffer()));
    expect(q.shadow).toBe(true);
  });
});
