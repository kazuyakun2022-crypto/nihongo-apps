import { prisma } from "../../../shared/infrastructure/prisma";
import { EXERCISE_TYPES, isAnswerCorrect, type ExerciseType } from "../../learning/domain/Exercise";
import { stringList } from "../../learning/infrastructure/PrismaLearningRepository";
import type { SubmittedAnswer } from "../domain/SectionRules";

export const asExerciseType = (type: string): ExerciseType =>
  (EXERCISE_TYPES as readonly string[]).includes(type) ? (type as ExerciseType) : "pilihan_ganda";

export interface AnswerKey {
  type: ExerciseType;
  options: unknown;
  correct: string;
  section: string;
  question: string;
  explanation: string | null;
  category: string | null;
  passage: string | null;
  /** Soal dari bank ujian (bukan cadangan kuis bab): jawabannya disimpan per butir. */
  fromBank: boolean;
}

export interface GradedAnswer {
  questionId: string;
  answer: string;
  skipped: boolean;
  isCorrect: boolean;
  key: AnswerKey | undefined;
}

/**
 * Nilai jawaban terhadap kunci di bank soal (atau kuis bab sebagai cadangan).
 * Bagian soal selalu diambil dari bank, bukan dari klien. Soal berbicara yang dilewati tidak ikut dinilai.
 */
export async function gradeAnswers(answers: SubmittedAnswer[]) {
  const ids = answers.map((a) => a.questionId);
  const keys = new Map<string, AnswerKey>();
  const bank = await prisma.examQuestion.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, options: true, correctAnswer: true, section: true, question: true, explanation: true, category: true, passage: true },
  });
  for (const q of bank) {
    keys.set(q.id, {
      type: asExerciseType(q.type),
      options: q.options,
      correct: q.correctAnswer,
      section: q.section,
      question: q.question,
      explanation: q.explanation,
      category: q.category,
      passage: q.passage,
      fromBank: true,
    });
  }
  const missing = ids.filter((id) => !keys.has(id));
  if (missing.length) {
    const quiz = await prisma.quizQuestion.findMany({
      where: { id: { in: missing } },
      select: { id: true, type: true, options: true, correctAnswer: true, question: true, explanation: true },
    });
    for (const q of quiz) {
      keys.set(q.id, { type: q.type, options: q.options, correct: q.correctAnswer, section: "kosakata", question: q.question, explanation: q.explanation, category: null, passage: null, fromBank: false });
    }
  }

  const perSection: Record<string, { correct: number; total: number }> = {};
  let correct = 0;
  let graded = 0;
  const results: GradedAnswer[] = answers.map((a) => {
    const key = keys.get(a.questionId);
    const skipped = !!a.skipped && key?.type === "berbicara";
    const isCorrect = !!key && !skipped && isAnswerCorrect({ type: key.type, correctAnswer: key.correct, options: stringList(key.options) }, a.answer);
    if (!skipped) {
      graded++;
      const section = key?.section ?? "kosakata";
      perSection[section] ??= { correct: 0, total: 0 };
      perSection[section].total++;
      if (isCorrect) {
        perSection[section].correct++;
        correct++;
      }
    }
    return { questionId: a.questionId, answer: a.answer, skipped, isCorrect, key };
  });
  return { results, perSection, correct, graded };
}

/** Simpan jawaban per butir (hanya soal bank ujian; soal cadangan kuis bab tidak punya relasi). */
export async function saveAnswerRecords(attemptId: string, results: GradedAnswer[]) {
  const data = results
    .filter((r) => r.key?.fromBank)
    .map((r) => ({ attemptId, questionId: r.questionId, answer: r.answer, isCorrect: r.isCorrect }));
  if (data.length) await prisma.examAttemptAnswer.createMany({ data });
}
