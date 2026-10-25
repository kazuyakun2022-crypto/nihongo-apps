"use client";

import { useEffect, useState } from "react";
import { examApi } from "../data/examApi";
import type { PlacementAnswer, PlacementQuestion, PlacementResult } from "../domain/types";

type Phase = "loading" | "error" | "quiz" | "submitting" | "result";

export function usePlacementExam(targetLevelId: number) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [passingScore, setPassingScore] = useState(70);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function load() {
    setPhase("loading");
    setCurrentIndex(0);
    setAnswers(new Map());
    setResult(null);
    examApi
      .getPlacementQuestions(targetLevelId)
      .then((r) => {
        setQuestions(r.questions);
        setPassingScore(r.passingScore);
        setPhase("quiz");
      })
      .catch(() => {
        setErrorMsg("Soal belum bisa dimuat. Coba lagi.");
        setPhase("error");
      });
  }

  useEffect(() => { load(); }, [targetLevelId]);

  function selectAnswer(questionId: string, answer: string) {
    setAnswers((prev) => new Map(prev).set(questionId, answer));
  }

  function next() {
    setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  }

  function prev() {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    const payload: PlacementAnswer[] = questions.map((q) => ({
      questionId: q.id,
      answer: answers.get(q.id) ?? "",
    }));
    setPhase("submitting");
    try {
      const res = await examApi.submitPlacement(targetLevelId, payload);
      setResult(res);
      setPhase("result");
    } catch {
      setErrorMsg("Gagal mengirim jawaban. Coba lagi.");
      setPhase("quiz");
    }
  }

  const currentQuestion = questions[currentIndex] ?? null;
  const currentAnswer = currentQuestion ? (answers.get(currentQuestion.id) ?? null) : null;
  const allAnswered = questions.length > 0 && questions.every((q) => answers.has(q.id));

  return {
    phase,
    questions,
    passingScore,
    currentIndex,
    currentQuestion,
    currentAnswer,
    allAnswered,
    result,
    errorMsg,
    selectAnswer,
    next,
    prev,
    submit,
    retry: load,
  };
}
