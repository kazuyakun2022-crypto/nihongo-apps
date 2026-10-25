"use client";

import { useEffect, useState } from "react";
import { srsApi } from "../data/srsApi";
import type { DueCard, ReviewGrade } from "../domain/types";

/** Dokumen 8.3: tampilkan kartu jatuh tempo, nilai diri, lalu jadwalkan ulang. */
export function useReview() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    srsApi.due().then((r) => setCards(r.cards)).catch(() => setCards([]));
  }, []);

  const current = cards?.[index] ?? null;

  async function grade(g: ReviewGrade) {
    if (!current) return;
    await srsApi.review(current.id, g).catch(() => undefined);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return { loading: cards === null, current, remaining: cards ? cards.length - index : 0, revealed, reveal: () => setRevealed(true), grade };
}
