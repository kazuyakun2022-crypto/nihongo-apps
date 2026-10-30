"use client";

import { useEffect, useState } from "react";
import { learningApi } from "../data/learningApi";
import type { ChapterDetail, ChapterKanji, ChapterVocab, ChapterGrammar, ChapterQuizQuestion, LessonBlock, QuizAnswer, QuizResult } from "../domain/types";

export type LessonPhase = "loading" | "error" | "study" | "quiz-intro" | "quiz" | "submitting" | "result";

export type StudyCard =
  | { kind: "block"; data: LessonBlock }
  | { kind: "vocab"; data: ChapterVocab }
  | { kind: "kanji"; data: ChapterKanji }
  | { kind: "grammar"; data: ChapterGrammar };

export function useChapterLesson(chapterId: string) {
  const [phase, setPhase] = useState<LessonPhase>("loading");
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Study state
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  // Arah perpindahan terakhir (1 maju, -1 mundur) untuk animasi kartu
  const [direction, setDirection] = useState<1 | -1>(1);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<ChapterQuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    learningApi
      .getChapter(chapterId)
      .then((c) => {
        setChapter(c);
        const cards: StudyCard[] = [
          ...(c.lessonBlocks ?? []).map((b) => ({ kind: "block" as const, data: b })),
          ...c.vocabularies.map((v) => ({ kind: "vocab" as const, data: v })),
          ...c.kanji.map((k) => ({ kind: "kanji" as const, data: k })),
          ...c.grammarPoints.map((g) => ({ kind: "grammar" as const, data: g })),
        ];
        setStudyCards(cards);
        setQuizQuestions(
          c.quizQuestions.map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? (q.options as string[]) : [],
          })),
        );
        setPhase(cards.length > 0 ? "study" : "quiz-intro");
      })
      .catch(() => {
        setErrorMsg("Bab tidak bisa dimuat. Coba lagi.");
        setPhase("error");
      });
  }, [chapterId]);

  function nextStudy() {
    setDirection(1);
    if (studyIndex < studyCards.length - 1) {
      setStudyIndex((i) => i + 1);
    } else {
      setPhase("quiz-intro");
    }
  }

  function prevStudy() {
    setDirection(-1);
    setStudyIndex((i) => Math.max(0, i - 1));
  }

  /** Lompat langsung ke kartu materi tertentu (daftar langkah di desktop). */
  function goToStudy(index: number) {
    if (index < 0 || index >= studyCards.length) return;
    setDirection(index < studyIndex ? -1 : 1);
    setStudyIndex(index);
    setPhase("study");
  }

  function restartStudy() {
    setStudyIndex(0);
    setPhase("study");
  }

  function backToStudy() {
    setStudyIndex(Math.max(0, studyCards.length - 1));
    setPhase("study");
  }

  function startQuiz() {
    setQuizIndex(0);
    setAnswers(new Map());
    setSkipped(new Set());
    setPhase("quiz");
  }

  /** Jawaban kosong menghapus jawaban (mis. semua kepingan dikembalikan). */
  function selectAnswer(questionId: string, answer: string) {
    setAnswers((prev) => {
      const next = new Map(prev);
      if (answer) next.set(questionId, answer);
      else next.delete(questionId);
      return next;
    });
    setSkipped((prev) => {
      if (!prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }

  /** Hanya untuk soal berbicara saat mikrofon tidak bisa dipakai; soal ini tidak ikut dinilai. */
  function skipQuestion(questionId: string) {
    setSkipped((prev) => new Set(prev).add(questionId));
    setQuizIndex((i) => Math.min(i + 1, quizQuestions.length - 1));
  }

  function nextQuiz() {
    setDirection(1);
    setQuizIndex((i) => Math.min(i + 1, quizQuestions.length - 1));
  }

  function prevQuiz() {
    setDirection(-1);
    setQuizIndex((i) => Math.max(i - 1, 0));
  }

  /** Lompat ke soal tertentu selama kuis berjalan. */
  function goToQuiz(index: number) {
    if (index < 0 || index >= quizQuestions.length) return;
    setDirection(index < quizIndex ? -1 : 1);
    setQuizIndex(index);
  }

  const isDone = (questionId: string) => answers.has(questionId) || skipped.has(questionId);

  async function submitQuiz() {
    const payload: QuizAnswer[] = quizQuestions.map((q) => ({
      questionId: q.id,
      answer: answers.get(q.id) ?? "",
      ...(skipped.has(q.id) ? { skipped: true } : {}),
    }));
    setPhase("submitting");
    try {
      const res = await learningApi.submitQuiz(chapterId, payload);
      setResult(res);
      setPhase("result");
    } catch {
      setErrorMsg("Gagal mengirim jawaban. Coba lagi.");
      setPhase("quiz");
    }
  }

  function retryQuiz() {
    setQuizIndex(0);
    setAnswers(new Map());
    setSkipped(new Set());
    setResult(null);
    setPhase("quiz-intro");
  }

  const currentStudyCard = studyCards[studyIndex] ?? null;
  const currentQuestion = quizQuestions[quizIndex] ?? null;
  const currentAnswer = currentQuestion ? (answers.get(currentQuestion.id) ?? null) : null;
  const currentSkipped = currentQuestion ? skipped.has(currentQuestion.id) : false;
  const allAnswered = quizQuestions.length > 0 && quizQuestions.every((q) => answers.has(q.id) || skipped.has(q.id));
  const isLastStudy = studyIndex === studyCards.length - 1;
  const isLastQuiz = quizIndex === quizQuestions.length - 1;

  return {
    phase,
    chapter,
    errorMsg,
    studyCards,
    studyIndex,
    currentStudyCard,
    isLastStudy,
    quizQuestions,
    quizIndex,
    answers,
    currentQuestion,
    currentAnswer,
    currentSkipped,
    allAnswered,
    isLastQuiz,
    result,
    direction,
    isDone,
    nextStudy,
    prevStudy,
    goToStudy,
    goToQuiz,
    restartStudy,
    backToStudy,
    startQuiz,
    selectAnswer,
    skipQuestion,
    nextQuiz,
    prevQuiz,
    submitQuiz,
    retryQuiz,
  };
}
