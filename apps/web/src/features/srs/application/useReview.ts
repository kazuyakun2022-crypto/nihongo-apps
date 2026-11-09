"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { srsApi } from "../data/srsApi";
import type { DueCard, ReviewGrade } from "../domain/types";

export interface ReviewedRecord {
  card: DueCard;
  grade: ReviewGrade;
  timestamp: number;
}

/** Tampilkan kartu jatuh tempo, nilai diri, lalu jadwalkan ulang dengan pencatatan riwayat sesi. */
export function useReview() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<ReviewedRecord[]>([]);

  /** Ketukan ganda pada tombol nilai tidak boleh mengirim dua kali (dan melompati kartu berikutnya). */
  const pendingRef = useRef(false);

  const load = useCallback(() => {
    setError(null);
    setCards(null);
    setIndex(0);
    setRevealed(false);
    setReviewedItems([]);
    srsApi
      .due()
      .then((r) => setCards(r.cards))
      .catch((e: Error) => {
        setError(e.message || "Kartu belum bisa dimuat.");
        setCards([]);
      });
  }, []);

  useEffect(load, [load]);

  const current = cards?.[index] ?? null;

  async function grade(g: ReviewGrade) {
    if (!current || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    const itemBeingGraded = current;
    try {
      await srsApi.review(itemBeingGraded.id, g).catch(() => undefined);
      setReviewedItems((prev) => [...prev, { card: itemBeingGraded, grade: g, timestamp: Date.now() }]);
      setRevealed(false);
      setIndex((i) => i + 1);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  // Ulangi review untuk kartu tertentu (misal hanya yang sulit/lupa, atau semua)
  const reviewAgain = useCallback((onlyDifficult = false) => {
    if (!reviewedItems.length) return;
    const targetCards = onlyDifficult
      ? reviewedItems.filter((r) => r.grade === "lupa" || r.grade === "sulit").map((r) => r.card)
      : reviewedItems.map((r) => r.card);

    if (targetCards.length > 0) {
      setCards(targetCards);
      setIndex(0);
      setRevealed(false);
    }
  }, [reviewedItems]);

  const summary = {
    total: reviewedItems.length,
    lupa: reviewedItems.filter((r) => r.grade === "lupa").length,
    sulit: reviewedItems.filter((r) => r.grade === "sulit").length,
    bisa: reviewedItems.filter((r) => r.grade === "bisa").length,
    mudah: reviewedItems.filter((r) => r.grade === "mudah").length,
  };

  return {
    loading: cards === null,
    error,
    retry: load,
    pending,
    current,
    cards: cards ?? [],
    totalCount: cards ? cards.length : 0,
    currentIndex: index,
    remaining: cards ? Math.max(0, cards.length - index) : 0,
    revealed,
    reveal: () => setRevealed(true),
    grade,
    reviewedItems,
    summary,
    reviewAgain,
  };
}
