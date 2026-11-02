import { api, apiRequest } from "@/core/http/apiClient";
import type { CheckResult } from "@/features/huruf/data/tulisApi";

/** Gerbang Tulis (Workbook Gate): syarat menulis tangan sebelum ujian naik level. */

export type GateMode = "kertas" | "kanvas";
/** Jalur kertas: lembar cetak, atau kisi yang digambar sendiri (tanpa printer). */
export type SheetType = "cetak" | "gambar";
export type GateScript = "hiragana" | "katakana" | "kanji";
/** rapi = hijau, kurang = kuning, salah = merah, kosong = belum ditulis. */
export type GateStatus = "rapi" | "kurang" | "salah" | "kosong";

export interface WorkbookStatus {
  levelCode: string;
  levelName: string;
  passed: boolean;
  bestScore: number | null;
  chaptersCompleted: number;
  chaptersTotal: number;
  chapterPct: number;
  cooldownUntil: string | null;
  activeAttemptId: string | null;
  canTake: boolean;
  config: { questionCount: number; passScore: number; cooldownHours: number; minChapterCompletion: number };
}

export interface GateChar {
  char: string;
  reading: string;
  meaning: string;
  script: GateScript;
}

export interface GateSheet {
  index: number;
  script: GateScript;
  chars: GateChar[];
  done: boolean;
  tries: number;
}

export interface WorkbookAttempt {
  attemptId: string;
  mode: GateMode;
  sheetType: SheetType | null;
  /** Kisi gambar sendiri: ukuran yang harus digambar. */
  grid: { cols: number; rows: number } | null;
  passScore: number;
  requiredWrites: number;
  sheets: GateSheet[];
  maxSheetTries: number;
}

export interface GateCharResult {
  char: string;
  score: number;
  status: GateStatus;
  notes: string[];
  /** Jalur kanvas: nilai per dimensi rubrik. */
  dims?: { strokeOrder: number; proportion: number; balance: number; curvature: number; placement: number };
  strokes?: { written: number; expected: number };
}

export interface WorkbookResult {
  score: number;
  passed: boolean;
  passScore: number;
  results: GateCharResult[];
  cooldownUntil: string | null;
}

/** Goresan kanvas, koordinat 0–1 terhadap kotak tulis. */
export type CanvasStroke = [number, number][];

export const workbookGateApi = {
  status: (levelId: number) => api.get<WorkbookStatus>(`/exam/workbook/status?levelId=${levelId}`),
  start: (levelId: number, mode: GateMode, sheetType?: SheetType) =>
    apiRequest<WorkbookAttempt>("/exam/workbook/start", { method: "POST", body: { levelId, mode, ...(sheetType ? { sheetType } : {}) } }),
  // Membaca foto butuh beberapa detik; server mencoba model cadangan bila yang pertama gagal
  sheet: (attemptId: string, body: { index: number; image: string; corners: [number, number][]; grid?: { xs: number[]; ys: number[] } }) =>
    apiRequest<{ check: CheckResult; sheet: GateSheet }>(`/exam/workbook/${attemptId}/sheet`, { method: "POST", body, timeoutMs: 70000 }),
  finish: (attemptId: string) => apiRequest<WorkbookResult>(`/exam/workbook/${attemptId}/finish`, { method: "POST" }),
  canvas: (attemptId: string, chars: { char: string; strokes: CanvasStroke[] }[]) =>
    apiRequest<WorkbookResult>(`/exam/workbook/${attemptId}/canvas`, { method: "POST", body: { chars }, timeoutMs: 30000 }),
};
