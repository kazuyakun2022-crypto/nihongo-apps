export interface ScanToken {
  id: string;
  surfaceForm: string;        // Teks asli (misal: "食べます")
  dictionaryForm: string;     // Bentuk dasar (misal: "食べる")
  readingKana: string;        // Cara baca (misal: "たべます")
  romaji: string;             // Romaji (misal: "tabemasu")
  partOfSpeech: string;       // Verb, Noun, Particle, Adjective, Adverb, dll.
  indonesianMean: string;     // Arti kata dalam Bahasa Indonesia
  jlptLevel: string;          // N5, N4, N3, N2, N1
  pitchAccent?: string;       // Pola nada (misal: "2 [Nakadaka]" atau "0 [Heiban]")
  conjugation?: string;       // Konjugasi kata (misal: "Bentuk Masu (Sopan)")
  exampleSentence?: {
    ja: string;
    id: string;
  };
}

export interface ScanResult {
  id: string;
  originalImgUrl: string;
  rawJapaneseText: string;
  furiganaHtml: string;
  romajiText: string;
  indonesianTrans: string;
  detectedLevel: string;      // N5 - N1
  detected?: boolean;         // Apakah teks Jepang terdeteksi
  tokens: ScanToken[];
  createdAt: string;
}

export interface VoiceCheckResult {
  score: number;              // 0 - 100%
  feedback: string;           // Komentar evaluasi dari Miu-chan
  spokenText: string;         // Teks yang didengar oleh AI
  targetText: string;         // Teks target yang dipindai
  matchedKanaRatio: number;   // Rasio kecocokan karakter
}

