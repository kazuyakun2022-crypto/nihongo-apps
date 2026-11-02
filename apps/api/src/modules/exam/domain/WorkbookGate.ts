/**
 * Gerbang Tulis (Workbook Gate): syarat menulis tangan sebelum ujian naik level (dan sebelum Mastery Gate Pre-N5).
 *
 * Setiap percobaan memilih huruf/kanji acak dari level itu, karena memeriksa seluruh buku kerja dengan foto akan
 * menghabiskan kuota Gemini gratis. Siswa memilih salah satu jalur:
 * - kertas: lembar ujian dicetak (bacaan + arti, tanpa contoh huruf), tiap huruf ditulis 3×, lalu difoto per lembar;
 * - kanvas: ditulis langsung di layar; urutan & arah goresan ikut dinilai (lihat strokeScore.ts), tanpa AI.
 *
 * Konfigurasi per level disimpan di LevelExam (type "workbook"): questionCount = jumlah huruf, passScore, cooldownHours,
 * minChapterCompletion. Percobaan disimpan di ExamAttempt (type "workbook").
 */
import type { Dimension } from "../../tulis/writingGuide";
import { HIRAGANA_BASIC, shuffle } from "./MasteryGate";

export type GateScript = "hiragana" | "katakana" | "kanji";
export type GateMode = "kertas" | "kanvas";
/** Jalur kertas: lembar cetak resmi, atau kisi yang digambar sendiri (tanpa printer). */
export type SheetType = "cetak" | "gambar";

export interface GateChar {
  char: string;
  /** Petunjuk bacaan yang dicetak/ditampilkan, mis. "ka" atau "ひ・にち". */
  reading: string;
  /** Arti (kanji) atau kosong (kana). */
  meaning: string;
  script: GateScript;
}

export interface GateSheet {
  index: number;
  script: GateScript;
  chars: GateChar[];
}

export type GateStatus = "rapi" | "kurang" | "salah" | "kosong";

export interface GateCharResult {
  char: string;
  score: number;
  status: GateStatus;
  notes: string[];
}

export interface WorkbookDetails {
  mode: GateMode;
  /** Hanya jalur kertas; percobaan lama tanpa nilai ini = "cetak". */
  sheetType?: SheetType;
  sheets: GateSheet[];
  /** Hasil per lembar (jalur kertas) — indeks lembar → hasil huruf; tiap lembar boleh difoto ulang sampai batas. */
  sheetResults: Record<string, { results: GateCharResult[]; tries: number }>;
  /** Hasil jalur kanvas. */
  canvasResults?: GateCharResult[];
}

export const WORKBOOK_DEFAULTS = {
  questionCount: 20,
  passScore: 75,
  cooldownHours: 12,
  minChapterCompletion: 80,
} as const;

/**
 * Huruf per lembar cetak. Lembar dengan lebih dari 5 huruf dicetak "padat" (kotak 13 mm, celah tetap) sehingga
 * geometrinya tidak lagi cocok dengan PRINT_LAYOUT (kotak 15 mm) di pemindai & server — jadi maksimal 5.
 */
export const PER_SHEET = 5;
/** Berapa kali setiap huruf ditulis di lembar ujian (kotak A1–A3). */
export const REQUIRED_WRITES = 3;
/** Batas kirim ulang foto per lembar, supaya lembar tidak ditulis ulang berkali-kali sampai lolos. */
export const MAX_SHEET_TRIES = 3;

/**
 * Bobot rubrik jalur kertas. Urutan goresan tidak bisa dilihat dari foto, jadi bobot 30%-nya dibagi ke dimensi
 * yang terukur: proporsi 35%, keseimbangan kuadran 30% (kelengkapan goresan + keterbacaan), ujung/kelengkungan
 * goresan 20%, letak di kotak 15%.
 */
export const PAPER_WEIGHTS: Record<Dimension, number> = {
  proportion: 0.35,
  strokeCount: 0.15,
  legibility: 0.15,
  strokeEnding: 0.2,
  centerAlignment: 0.15,
};

/** ひらがな → カタカナ: blok katakana tepat 0x60 sesudah hiragana. */
export const toKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

/** Pre-N5: separuh hiragana, separuh katakana, acak dari 46 huruf dasar. */
export function pickKana(count: number): GateChar[] {
  const half = Math.ceil(count / 2);
  const hira = shuffle(HIRAGANA_BASIC).slice(0, half);
  const kata = shuffle(HIRAGANA_BASIC).slice(0, count - half);
  return [
    ...hira.map(([char, r]): GateChar => ({ char, reading: r, meaning: "", script: "hiragana" })),
    ...kata.map(([char, r]): GateChar => ({ char: toKatakana(char), reading: r, meaning: "", script: "katakana" })),
  ];
}

export interface KanjiRow {
  character: string;
  onyomi: string | null;
  kunyomi: string | null;
  meaningId: string;
}

/** Bacaan singkat untuk kotak contoh: kun dulu (lebih akrab), lalu on; dipotong supaya muat. */
export function kanjiReading(k: KanjiRow): string {
  const first = (s: string | null) => (s ?? "").split(/[、,;／/\s]+/).filter(Boolean)[0] ?? "";
  return [first(k.kunyomi), first(k.onyomi)].filter(Boolean).join("・").slice(0, 40);
}

/** Kanji unik dari level, diacak. Pemilihan akhir menyaring kanji yang punya data goresan (lihat rute). */
export function kanjiPool(rows: KanjiRow[]): GateChar[] {
  const seen = new Set<string>();
  const unique = rows.filter((k) => k.character && !seen.has(k.character) && seen.add(k.character));
  return shuffle(unique).map((k) => ({ char: k.character, reading: kanjiReading(k), meaning: k.meaningId.slice(0, 60), script: "kanji" }));
}

/** Bagi item ke lembar cetak: satu aksara per lembar, isi lembar dibuat rata (mis. 17 → 5 + 4 + 4 + 4, bukan 5 + 5 + 5 + 2). */
export function splitSheets(items: GateChar[], perSheet = PER_SHEET): GateSheet[] {
  const sheets: GateSheet[] = [];
  for (const script of ["hiragana", "katakana", "kanji"] as const) {
    const group = items.filter((i) => i.script === script);
    if (!group.length) continue;
    const parts = Math.ceil(group.length / perSheet);
    let at = 0;
    for (let p = 0; p < parts; p++) {
      const size = Math.floor(group.length / parts) + (p < group.length % parts ? 1 : 0);
      sheets.push({ index: sheets.length, script, chars: group.slice(at, at + size) });
      at += size;
    }
  }
  return sheets;
}

/**
 * Kisi gambar sendiri: satu bingkai 4 kolom × ⌈n/4⌉ baris, satu huruf per kotak, urut baris demi baris.
 * Harus sama dengan DRAWN_COLS di apps/web/src/features/huruf/lib/drawnGrid.ts.
 */
export const DRAWN_COLS = 4;
export const drawnRows = (n: number) => Math.ceil(n / DRAWN_COLS);

/** Kisi gambar sendiri memuat semua huruf dalam satu lembar (satu foto, 3 permintaan Gemini). */
export function drawnSheet(items: GateChar[]): GateSheet[] {
  return [{ index: 0, script: items[0]?.script ?? "kanji", chars: items }];
}

/** Garis kisi dari pemindai: panjang sesuai, naik, di dalam 0–1, dan kotak tidak terlalu sempit. */
export function validDrawnLines(lines: number[], cells: number): boolean {
  if (lines.length !== cells + 1) return false;
  if (Math.abs(lines[0]) > 0.05 || Math.abs(lines[cells] - 1) > 0.05) return false;
  const min = 0.3 / cells;
  return lines.every((v, i) => v >= -0.05 && v <= 1.05 && (i === 0 || v - lines[i - 1] >= min));
}

/** Nilai akhir: rata-rata semua huruf; huruf yang belum dinilai dihitung 0. */
export function gradeGate(results: GateCharResult[], total: number, passScore: number) {
  const score = total ? Math.round(results.reduce((n, r) => n + r.score, 0) / total) : 0;
  return { score, passed: score >= passScore };
}

/** Warna hasil jalur kertas dari hasil pemeriksa foto. */
export function paperStatus(c: { score: number; written: number; counts: Record<GateStatus, number> }): GateStatus {
  if (!c.written) return "kosong";
  if (c.counts.salah) return "salah";
  return c.score >= 85 ? "rapi" : "kurang";
}
