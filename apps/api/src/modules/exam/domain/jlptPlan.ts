import type { JlptCode } from "./JlptSim";

/**
 * Distribusi soal per tipe soal resmi (Daimon) untuk paket simulasi yang dibuat AI.
 * Jumlah per bagian harus sama dengan JLPT_SPEC.counts (dicek di tests/jlptSim.test.ts).
 */
export type SectionType = "MOJI_GOI" | "BUNPOU" | "DOKKAI" | "CHOUKAI";
export interface PlanItem {
  sectionType: SectionType;
  questionType: string;
  count: number;
}

/** Distribusi soal per Daimon. Jumlah per bagian sama dengan JLPT_SPEC.counts di JlptSim.ts. */
export const PLAN: Record<JlptCode, PlanItem[]> = {
  N5: [
    { sectionType: "MOJI_GOI", questionType: "KANJI_READING", count: 7 },
    { sectionType: "MOJI_GOI", questionType: "ORTHOGRAPHY", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "CONTEXTUAL_EXPRESSION", count: 6 },
    { sectionType: "MOJI_GOI", questionType: "PARAPHRASE", count: 3 },
    { sectionType: "BUNPOU", questionType: "GRAMMAR_FORM", count: 9 },
    { sectionType: "BUNPOU", questionType: "SENTENCE_COMPOSITION", count: 4 },
    { sectionType: "BUNPOU", questionType: "TEXT_GRAMMAR", count: 3 },
    { sectionType: "DOKKAI", questionType: "SHORT_PASSAGE", count: 2 },
    { sectionType: "DOKKAI", questionType: "MID_PASSAGE", count: 2 },
    { sectionType: "DOKKAI", questionType: "INFORMATION_RETRIEVAL", count: 2 },
    { sectionType: "CHOUKAI", questionType: "TASK_BASED", count: 7 },
    { sectionType: "CHOUKAI", questionType: "POINT_COMPREHENSION", count: 6 },
    { sectionType: "CHOUKAI", questionType: "QUICK_RESPONSE", count: 6 },
  ],
  N4: [
    { sectionType: "MOJI_GOI", questionType: "KANJI_READING", count: 9 },
    { sectionType: "MOJI_GOI", questionType: "ORTHOGRAPHY", count: 6 },
    { sectionType: "MOJI_GOI", questionType: "CONTEXTUAL_EXPRESSION", count: 10 },
    { sectionType: "MOJI_GOI", questionType: "PARAPHRASE", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "USAGE", count: 5 },
    { sectionType: "BUNPOU", questionType: "GRAMMAR_FORM", count: 9 },
    { sectionType: "BUNPOU", questionType: "SENTENCE_COMPOSITION", count: 3 },
    { sectionType: "BUNPOU", questionType: "TEXT_GRAMMAR", count: 3 },
    { sectionType: "DOKKAI", questionType: "SHORT_PASSAGE", count: 3 },
    { sectionType: "DOKKAI", questionType: "MID_PASSAGE", count: 3 },
    { sectionType: "DOKKAI", questionType: "INFORMATION_RETRIEVAL", count: 2 },
    { sectionType: "CHOUKAI", questionType: "TASK_BASED", count: 8 },
    { sectionType: "CHOUKAI", questionType: "POINT_COMPREHENSION", count: 7 },
    { sectionType: "CHOUKAI", questionType: "QUICK_RESPONSE", count: 7 },
  ],
  N3: [
    { sectionType: "MOJI_GOI", questionType: "KANJI_READING", count: 8 },
    { sectionType: "MOJI_GOI", questionType: "ORTHOGRAPHY", count: 6 },
    { sectionType: "MOJI_GOI", questionType: "CONTEXTUAL_EXPRESSION", count: 11 },
    { sectionType: "MOJI_GOI", questionType: "PARAPHRASE", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "USAGE", count: 5 },
    { sectionType: "BUNPOU", questionType: "GRAMMAR_FORM", count: 13 },
    { sectionType: "BUNPOU", questionType: "SENTENCE_COMPOSITION", count: 5 },
    { sectionType: "BUNPOU", questionType: "TEXT_GRAMMAR", count: 5 },
    { sectionType: "DOKKAI", questionType: "SHORT_PASSAGE", count: 4 },
    { sectionType: "DOKKAI", questionType: "MID_PASSAGE", count: 6 },
    { sectionType: "DOKKAI", questionType: "LONG_PASSAGE", count: 4 },
    { sectionType: "DOKKAI", questionType: "INFORMATION_RETRIEVAL", count: 2 },
    { sectionType: "CHOUKAI", questionType: "TASK_BASED", count: 6 },
    { sectionType: "CHOUKAI", questionType: "POINT_COMPREHENSION", count: 6 },
    { sectionType: "CHOUKAI", questionType: "SUMMARY_COMPREHENSION", count: 3 },
    { sectionType: "CHOUKAI", questionType: "QUICK_RESPONSE", count: 9 },
  ],
  N2: [
    { sectionType: "MOJI_GOI", questionType: "KANJI_READING", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "ORTHOGRAPHY", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "WORD_FORMATION", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "CONTEXTUAL_EXPRESSION", count: 7 },
    { sectionType: "MOJI_GOI", questionType: "PARAPHRASE", count: 5 },
    { sectionType: "MOJI_GOI", questionType: "USAGE", count: 5 },
    { sectionType: "BUNPOU", questionType: "GRAMMAR_FORM", count: 12 },
    { sectionType: "BUNPOU", questionType: "SENTENCE_COMPOSITION", count: 5 },
    { sectionType: "BUNPOU", questionType: "TEXT_GRAMMAR", count: 5 },
    { sectionType: "DOKKAI", questionType: "SHORT_PASSAGE", count: 5 },
    { sectionType: "DOKKAI", questionType: "MID_PASSAGE", count: 9 },
    { sectionType: "DOKKAI", questionType: "INTEGRATED_READING", count: 2 },
    { sectionType: "DOKKAI", questionType: "LONG_PASSAGE", count: 3 },
    { sectionType: "DOKKAI", questionType: "INFORMATION_RETRIEVAL", count: 2 },
    { sectionType: "CHOUKAI", questionType: "TASK_BASED", count: 5 },
    { sectionType: "CHOUKAI", questionType: "POINT_COMPREHENSION", count: 6 },
    { sectionType: "CHOUKAI", questionType: "SUMMARY_COMPREHENSION", count: 5 },
    { sectionType: "CHOUKAI", questionType: "QUICK_RESPONSE", count: 11 },
    { sectionType: "CHOUKAI", questionType: "INTEGRATED_LISTENING", count: 3 },
  ],
  N1: [
    { sectionType: "MOJI_GOI", questionType: "KANJI_READING", count: 6 },
    { sectionType: "MOJI_GOI", questionType: "CONTEXTUAL_EXPRESSION", count: 7 },
    { sectionType: "MOJI_GOI", questionType: "PARAPHRASE", count: 6 },
    { sectionType: "MOJI_GOI", questionType: "USAGE", count: 6 },
    { sectionType: "BUNPOU", questionType: "GRAMMAR_FORM", count: 10 },
    { sectionType: "BUNPOU", questionType: "SENTENCE_COMPOSITION", count: 5 },
    { sectionType: "BUNPOU", questionType: "TEXT_GRAMMAR", count: 5 },
    { sectionType: "DOKKAI", questionType: "SHORT_PASSAGE", count: 4 },
    { sectionType: "DOKKAI", questionType: "MID_PASSAGE", count: 9 },
    { sectionType: "DOKKAI", questionType: "LONG_PASSAGE", count: 8 },
    { sectionType: "DOKKAI", questionType: "INTEGRATED_READING", count: 2 },
    { sectionType: "DOKKAI", questionType: "INFORMATION_RETRIEVAL", count: 2 },
    { sectionType: "CHOUKAI", questionType: "TASK_BASED", count: 5 },
    { sectionType: "CHOUKAI", questionType: "POINT_COMPREHENSION", count: 5 },
    { sectionType: "CHOUKAI", questionType: "SUMMARY_COMPREHENSION", count: 4 },
    { sectionType: "CHOUKAI", questionType: "QUICK_RESPONSE", count: 10 },
    { sectionType: "CHOUKAI", questionType: "INTEGRATED_LISTENING", count: 3 },
  ],
};
