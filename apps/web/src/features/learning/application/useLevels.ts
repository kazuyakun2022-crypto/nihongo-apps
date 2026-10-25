"use client";

import { useEffect, useState } from "react";
import { learningApi } from "../data/learningApi";
import type { ChapterSummary, Level } from "../domain/types";

export function useLevels() {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    learningApi.levels().then(setLevels).catch(() => setError("Daftar level belum bisa dimuat."));
  }, []);
  return { levels, error };
}

export function useChapters(levelId: number | null) {
  const [chapters, setChapters] = useState<ChapterSummary[] | null>(null);
  useEffect(() => {
    if (levelId === null) return;
    setChapters(null);
    learningApi.chapters(levelId).then(setChapters).catch(() => setChapters([]));
  }, [levelId]);
  return chapters;
}
