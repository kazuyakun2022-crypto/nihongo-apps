/** Pembuat soal ringkas untuk data kurikulum. */
import type { KQuiz } from "./kurikulumData";

export const img = (slug: string) => `/images/kamus/${slug}.webp`;

export const pg = (question: string, options: string[], answer: string, extra: { hint?: string; explanation?: string; image?: string } = {}): KQuiz => ({
  type: "pilihan_ganda",
  question,
  options,
  answer,
  ...extra,
});
export const dengar = (audio: string, question: string, options: string[], answer: string): KQuiz => ({ type: "mendengar", audio, question, options, answer });
export const tulis = (romaji: string, answer: string, hint: string, image?: string): KQuiz => ({ type: "menulis", question: romaji, answer, hint, image });
export const susun = (question: string, pieces: string[], extras: string[] = []): KQuiz => ({ type: "susun_kalimat", question, pieces, extras });
export const huruf = (question: string, pieces: string[], extras: string[], hint?: string, image?: string): KQuiz => ({ type: "susun_huruf", question, pieces, extras, hint, image });
export const ucap = (answer: string, accept: string[] = [], question?: string): KQuiz => ({ type: "berbicara", answer, accept, question });
