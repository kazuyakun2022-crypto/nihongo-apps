export interface ScanToken {
  id: string;
  surfaceForm: string;        // Teks asli (misal: "食べます")
  dictionaryForm: string;     // Bentuk dasar (misal: "食べる")
  readingKana: string;        // Cara baca (misal: "たべます")
  romaji: string;             // Romaji (misal: "tabemasu")
  partOfSpeech: string;       // Verb, Noun, Particle, Adjective, Adverb, dll.
  indonesianMean: string;     // Arti kata
  jlptLevel: string;          // N5-N1
  pitchAccent?: string;       // Pola nada (misal: "1 [Atamadaka]")
  conjugation?: string;       // Konjugasi (misal: "Bentuk Masu")
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
  detectedLevel: string;      // N5-N1
  detected?: boolean;
  tokens: ScanToken[];
  createdAt: string;
}

export interface VoiceCheckResult {
  score: number;              // 0-100%
  feedback: string;           // Komentar evaluasi Miu-chan
  spokenText: string;
  targetText: string;
  matchedKanaRatio: number;
}

