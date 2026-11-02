import { apiRequest } from "@/core/http/apiClient";

/** Koordinat di foto, skala 0–1000: [atas, kiri, bawah, kanan]. */
export type Box = [number, number, number, number];

export type Quadrant = "kiri_atas" | "kanan_atas" | "kiri_bawah" | "kanan_bawah" | "tengah";
export type Dimension = "strokeCount" | "strokeEnding" | "proportion" | "centerAlignment" | "legibility";

export interface CheckMark {
  box: Box;
  /** salah = huruf lain, kurang = benar tapi bentuknya perlu diperbaiki, kosong = kotak belum diisi. */
  kind: "salah" | "kurang" | "kosong";
  read: string;
  /** Label kotak di lembar, mis. "A5". */
  cell: string;
  /** Bagian kotak (grid 2×2) tempat masalahnya, dan areanya di foto untuk disorot. */
  quadrant: Quadrant | null;
  focus: Box | null;
  dimension: Dimension | null;
  severity: "ringan" | "sedang" | "berat";
  /** Apa yang salah pada kotak ini. */
  problem: string;
  /** Cara memperbaikinya (dari panduan menulis). */
  fix: string;
}

/** Rubrik 5 dimensi (0–100). */
export interface DimensionScores {
  strokeCountScore: number;
  strokeEndingScore: number;
  proportionScore: number;
  centerAlignmentScore: number;
  legibilityScore: number;
}

export interface NekoFeedback {
  emotionState: "happy" | "thinking" | "encouraging" | "surprised";
  severity: "sempurna" | "ringan" | "sedang" | "berat";
  headlineText: string;
  detailedExplanation: string;
  actionableTip: string;
  /** Sudut pandang penjelasan: berganti bila kesalahan yang sama terulang. */
  angle: "langsung" | "analogi" | "langkah";
  attempt: number;
}

export interface CharResult {
  char: string;
  reading: string;
  row: Box | null;
  best: Box | null;
  written: number;
  neat: number;
  counts: Record<"rapi" | "kurang" | "salah" | "kosong", number>;
  score: number;
  isPass: boolean;
  dimensionScores: DimensionScores;
  nekoFeedback: NekoFeedback;
  praise: string;
  tip: string;
  marks: CheckMark[];
}

export interface CheckResult {
  photoOk: boolean;
  photoProblem: string;
  /** true bila letak setiap kotak dihitung dari kisi lembar. */
  precise: boolean;
  score: number;
  grade: "S" | "A" | "B" | "C" | "D";
  isPass: boolean;
  summary: string;
  chars: CharResult[];
}

export function periksaTulisan(body: {
  image: string;
  /** 4 sudut kisi kotak di foto (skala 0–1): kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
  corners: [number, number][];
  script: "hiragana" | "katakana" | "kanji";
  chars: { char: string; reading: string; strokes?: number; tips?: string[] }[];
}) {
  // Membaca foto butuh beberapa detik; server mencoba model cadangan bila yang pertama gagal
  return apiRequest<CheckResult>("/tulis/periksa", { method: "POST", body, timeoutMs: 70000 });
}
