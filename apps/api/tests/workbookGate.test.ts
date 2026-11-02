import { describe, expect, it } from "vitest";
import { drawnRows, drawnSheet, gradeGate, kanjiReading, validDrawnLines, paperStatus, pickKana, splitSheets, toKatakana, PAPER_WEIGHTS, type GateChar } from "../src/modules/exam/domain/WorkbookGate";
import { CANVAS_WEIGHTS, scoreCanvasChar, type Pt } from "../src/modules/exam/domain/strokeScore";
import { kanjiVgCode, parseKanjiVg, renderReference, samplePath } from "../src/modules/tulis/kanjiVg";
import { measureWriting } from "../src/modules/tulis/cellMetrics";

/** 日 dari KanjiVG r20250816 (065e5.svg), 4 goresan berurutan. */
const HI = [
  "M31.5,24.5c1.12,1.12,1.74,2.75,1.74,4.75c0,1.6-0.16,38.11-0.09,53.5c0.02,3.82,0.05,6.35,0.09,6.75",
  "M33.48,26c0.8-0.05,37.67-3.01,40.77-3.25c3.19-0.25,5,1.75,5,4.25c0,4-0.22,40.84-0.23,56c0,3.48,0,5.72,0,6",
  "M34.22,55.25c7.78-0.5,35.9-2.5,44.06-2.75",
  "M34.23,86.5c10.52-0.75,34.15-2.12,43.81-2.25",
];

/** Tulisan "siswa" dari path contoh: diperkecil ke 80% kotak, tetap di tengah. */
const asWritten = (paths: string[]): Pt[][] => paths.map((d) => samplePath(d).map(([x, y]) => [0.1 + (x / 109) * 0.8, 0.1 + (y / 109) * 0.8] as Pt));

const sum = (o: Record<string, number>) => Object.values(o).reduce((n, v) => n + v, 0);

describe("Gerbang Tulis: susunan soal", () => {
  it("bobot rubrik kertas dan kanvas masing-masing berjumlah 100%", () => {
    expect(sum(PAPER_WEIGHTS)).toBeCloseTo(1);
    expect(sum({ ...CANVAS_WEIGHTS })).toBeCloseTo(1);
  });

  it("Pre-N5 memilih separuh hiragana, separuh katakana tanpa duplikat", () => {
    const items = pickKana(24);
    expect(items.filter((i) => i.script === "hiragana")).toHaveLength(12);
    expect(items.filter((i) => i.script === "katakana")).toHaveLength(12);
    expect(new Set(items.map((i) => i.char)).size).toBe(24);
    expect(toKatakana("あをん")).toBe("アヲン");
  });

  it("lembar berisi satu aksara dan dibagi rata, maksimal 5 huruf (lembar padat tidak cocok dengan kisi)", () => {
    const sheets = splitSheets(pickKana(20));
    expect(sheets.map((s) => s.chars.length)).toEqual([5, 5, 5, 5]);
    expect(sheets.every((s) => s.chars.every((c) => c.script === s.script))).toBe(true);
    const kanji: GateChar[] = Array.from({ length: 17 }, (_, i) => ({ char: String.fromCharCode(0x4e00 + i), reading: "", meaning: "", script: "kanji" }));
    expect(splitSheets(kanji).map((s) => s.chars.length)).toEqual([5, 4, 4, 4]);
    expect(splitSheets(kanji).map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it("kisi gambar sendiri: semua huruf dalam satu lembar 4 kolom", () => {
    const items = pickKana(20);
    expect(drawnSheet(items)).toHaveLength(1);
    expect(drawnSheet(items)[0].chars).toHaveLength(20);
    expect(drawnRows(20)).toBe(5);
    expect(drawnRows(18)).toBe(5);
  });

  it("garis kisi dari pemindai divalidasi", () => {
    expect(validDrawnLines([0, 0.24, 0.52, 0.76, 1], 4)).toBe(true);
    expect(validDrawnLines([0, 0.33, 0.66, 1], 4)).toBe(false); // jumlah kolom salah
    expect(validDrawnLines([0, 0.5, 0.45, 0.8, 1], 4)).toBe(false); // tidak naik
    expect(validDrawnLines([0.2, 0.4, 0.6, 0.8, 1], 4)).toBe(false); // tidak mulai di tepi
    expect(validDrawnLines([0, 0.02, 0.5, 0.75, 1], 4)).toBe(false); // kotak terlalu sempit
  });

  it("bacaan kanji ringkas: kun lalu on", () => {
    expect(kanjiReading({ character: "日", kunyomi: "ひ、か", onyomi: "ニチ、ジツ", meaningId: "matahari" })).toBe("ひ・ニチ");
    expect(kanjiReading({ character: "円", kunyomi: null, onyomi: "エン", meaningId: "yen" })).toBe("エン");
  });

  it("nilai akhir menghitung huruf yang belum dinilai sebagai 0", () => {
    const r = (score: number) => ({ char: "x", score, status: "rapi" as const, notes: [] });
    expect(gradeGate([r(90), r(90), r(90)], 3, 75)).toEqual({ score: 90, passed: true });
    expect(gradeGate([r(90), r(90), r(90)], 4, 75)).toEqual({ score: 68, passed: false });
  });

  it("warna jalur kertas: huruf tertukar merah, rapi hijau, sisanya kuning", () => {
    const counts = { rapi: 3, kurang: 0, salah: 0, kosong: 0 };
    expect(paperStatus({ score: 92, written: 3, counts })).toBe("rapi");
    expect(paperStatus({ score: 70, written: 3, counts })).toBe("kurang");
    expect(paperStatus({ score: 92, written: 3, counts: { ...counts, salah: 1 } })).toBe("salah");
    expect(paperStatus({ score: 0, written: 0, counts })).toBe("kosong");
  });
});

describe("KanjiVG", () => {
  it("nama berkas & urutan goresan dari id -sN", () => {
    expect(kanjiVgCode("日")).toBe("065e5");
    expect(kanjiVgCode("あ")).toBe("03042");
    const svg = `<g><path id="kvg:065e5-s2" d="M1,1L2,2"/><path id="kvg:065e5-s1" kvg:type="㇑" d="M0,0c1,1,2,2,3,3"/></g>`;
    expect(parseKanjiVg(svg)).toEqual(["M0,0c1,1,2,2,3,3", "M1,1L2,2"]);
  });

  it("path relatif & S halus diurai ke titik akhir yang benar", () => {
    const pts = samplePath(HI[1]);
    const end = pts[pts.length - 1];
    // 33.48+0.8+(37.67-…) : titik akhir path 2 = (79.02, 89)
    expect(end[0]).toBeCloseTo(79.02, 1);
    expect(end[1]).toBeCloseTo(89, 1);
  });

  it("gambar contoh berada di tengah kotak dengan ukuran wajar", async () => {
    const img = await renderReference(HI, 130, 5);
    const shape = measureWriting(img, 5)!;
    const [x0, y0, x1, y1] = shape.bbox;
    expect((x0 + x1) / 2).toBeGreaterThan(0.4);
    expect((x0 + x1) / 2).toBeLessThan(0.6);
    expect(y1 - y0).toBeGreaterThan(0.55);
  });
});

describe("Penilaian kanvas", () => {
  it("urutan & arah benar → hijau, nilai penuh", () => {
    const r = scoreCanvasChar(asWritten(HI), HI);
    expect(r.status).toBe("rapi");
    expect(r.score).toBeGreaterThanOrEqual(95);
    expect(r.dims.strokeOrder).toBe(100);
  });

  it("dua goresan tertukar → merah dengan catatan urutan", () => {
    const w = asWritten(HI);
    const r = scoreCanvasChar([w[1], w[0], w[2], w[3]], HI);
    expect(r.status).toBe("salah");
    expect(r.dims.strokeOrder).toBe(50);
    expect(r.notes.join(" ")).toContain("goresan ke-2");
  });

  it("arah goresan terbalik terdeteksi", () => {
    const w = asWritten(HI);
    const r = scoreCanvasChar([[...w[0]].reverse(), w[1], w[2], w[3]], HI);
    expect(r.dims.strokeOrder).toBe(75);
    expect(r.notes.join(" ")).toContain("terbalik");
  });

  it("goresan kurang → jumlah goresan disebut", () => {
    const r = scoreCanvasChar(asWritten(HI).slice(0, 3), HI);
    expect(r.notes[0]).toContain("seharusnya 4");
    expect(r.status).toBe("salah");
  });

  it("huruf lain → tidak dikenali, nilai 0", () => {
    // Dua garis miring (bukan 日)
    const other: Pt[][] = [
      [[0.2, 0.2], [0.8, 0.8]],
      [[0.8, 0.2], [0.2, 0.8]],
    ];
    const r = scoreCanvasChar(other, HI);
    expect(r.status).toBe("salah");
    expect(r.score).toBe(0);
  });

  it("kanvas kosong → kosong", () => {
    expect(scoreCanvasChar([], HI).status).toBe("kosong");
  });
});
