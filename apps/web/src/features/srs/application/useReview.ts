"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { srsApi } from "../data/srsApi";
import type { DueCard, ReviewGrade } from "../domain/types";

/** Dokumen 8.3: tampilkan kartu jatuh tempo, nilai diri, lalu jadwalkan ulang. */
export function useReview() {
  const [cards, setCards] = useState<DueCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /** Ketukan ganda pada tombol nilai tidak boleh mengirim dua kali (dan melompati kartu berikutnya). */
  const pendingRef = useRef(false);

  const load = useCallback(() => {
    setError(null);
    setCards(null);
    setIndex(0);
    setRevealed(false);
    srsApi
      .due()
      .then((r) => setCards(r.cards))
      .catch((e: Error) => {
        // Gagal memuat bukan berarti "semua kartu selesai"
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
    try {
      await srsApi.review(current.id, g).catch(() => undefined);
      setRevealed(false);
      setIndex((i) => i + 1);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return {
    loading: cards === null,
    error,
    retry: load,
    pending,
    current,
    remaining: cards ? cards.length - index : 0,
    revealed,
    reveal: () => setRevealed(true),
    grade,
  };
}
