/**
 * Kurikulum utama NihonGo sesuai docs/kurikulum.md (Pemula/Pre-N5 s.d. N1): Level → Modul → Bab → materi.
 * Diimpor oleh importKurikulum.ts. Soal divalidasi dengan aturan yang sama seperti editor admin.
 */

import { dengar, pg, susun, tulis, ucap } from "./kurikulumHelpers";
import { KURIKULUM_N1 } from "./kurikulumN1";
import { KURIKULUM_N2 } from "./kurikulumN2";
import { KURIKULUM_N3 } from "./kurikulumN3";
import { KURIKULUM_N4 } from "./kurikulumN4";
import { KURIKULUM_N5 } from "./kurikulumN5";
import { KURIKULUM_PRE_N5 } from "./kurikulumPreN5";

export type LevelCode = "PEMULA" | "N5" | "N4" | "N3" | "N2" | "N1";

export interface KBlock {
  type: "teks" | "gambar" | "dialog" | "tips" | "huruf";
  title?: string;
  body?: string;
  image?: string;
  caption?: string;
}

/** [kata, cara baca, arti, contoh kalimat?, terjemahan contoh?] */
export type KVocab = [string, string, string, string?, string?];
/** [kanji, onyomi, kunyomi, arti] */
export type KKanji = [string, string, string, string];

export interface KGrammar {
  pattern: string;
  explanation: string;
  ex: string;
  tr: string;
}

export type KQuiz =
  | { type: "pilihan_ganda"; question: string; options: string[]; answer: string; hint?: string; explanation?: string; image?: string }
  | { type: "mendengar"; audio: string; question: string; options: string[]; answer: string; explanation?: string }
  | { type: "susun_kalimat"; question: string; pieces: string[]; extras?: string[]; explanation?: string }
  | { type: "susun_huruf"; question: string; pieces: string[]; extras?: string[]; hint?: string; image?: string }
  | { type: "menulis"; question: string; answer: string; hint?: string; image?: string }
  | { type: "berbicara"; answer: string; accept?: string[]; question?: string; hint?: string };

export interface KChapter {
  /** sourceKey tetap; tanpa ini dipakai "kurikulum:<level>:<urutan>". */
  key?: string;
  level: LevelCode;
  /** Nilai lulus kuis bab (bawaan 70). */
  passScore?: number;
  module: string;
  title: string;
  explanation: string;
  blocks: KBlock[];
  vocab: KVocab[];
  kanji: KKanji[];
  grammar: KGrammar[];
  quiz: KQuiz[];
}


export const KURIKULUM: KChapter[] = [
  // Pre-N5 (Pemula): 10 sesi hiragana, fonetik, dan 100 kosakata kana — lihat kurikulumPreN5.ts
  ...KURIKULUM_PRE_N5,

  // N5: 10 bab — lihat kurikulumN5.ts
  ...KURIKULUM_N5,

  // N4: 10 bab — lihat kurikulumN4.ts
  ...KURIKULUM_N4,

  // N3: 10 bab — lihat kurikulumN3.ts
  ...KURIKULUM_N3,

  // N2: 10 bab — lihat kurikulumN2.ts
  ...KURIKULUM_N2,

  // N1: 5 bab — lihat kurikulumN1.ts
  ...KURIKULUM_N1,
];

/** Skenario latihan ngobrol AI; `chapterKey` mengaitkannya ke bab (tombol latihan di akhir bab). */
export interface KScenario {
  key: string;
  level: LevelCode;
  chapterKey?: string;
  title: string;
  goal: string;
  mascotRole: string;
  initialMessage: string;
  targetGrammar: string[];
  maxTurns?: number;
}
