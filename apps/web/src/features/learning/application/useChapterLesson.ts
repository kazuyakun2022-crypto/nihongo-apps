"use client";

import { useEffect, useState } from "react";
import { learningApi } from "../data/learningApi";
import type { ChapterDetail, ChapterKanji, ChapterVocab, ChapterGrammar, ChapterQuizQuestion, QuizAnswer, QuizResult } from "../domain/types";

export type LessonPhase = "loading" | "error" | "study" | "quiz-intro" | "quiz" | "submitting" | "result";

type StudyCard =
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
    if (studyIndex < studyCards.length - 1) {
      setStudyIndex((i) => i + 1);
    } else {
      setPhase("quiz-intro");
    }
  }

  function prevStudy() {
    setStudyIndex((i) => Math.max(0, i - 1));
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
    setQuizIndex((i) => Math.min(i + 1, quizQuestions.length - 1));
  }

  function prevQuiz() {
    setQuizIndex((i) => Math.max(i - 1, 0));
  }

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
    nextStudy,
    prevStudy,
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
