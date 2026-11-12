"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "nihongo.daily-streak.last-shown";

interface CelebrationState {
  open: boolean;
  streak: number;
  previousStreak: number;
}

const CLOSED: CelebrationState = { open: false, streak: 0, previousStreak: 0 };

function jakartaDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function useDailyStreakCelebration(userId?: string) {
  const [state, setState] = useState<CelebrationState>(CLOSED);
  const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;

  const celebrate = useCallback(
    (streak: number) => {
      if (!Number.isFinite(streak) || streak <= 0) return;

      const today = jakartaDay();
      try {
        if (window.localStorage.getItem(key) === today) return;
        window.localStorage.setItem(key, today);
      } catch {}

      setState({
        open: true,
        streak: Math.round(streak),
        previousStreak: Math.max(0, Math.round(streak) - 1),
      });
    },
    [key],
  );

  const close = useCallback(() => setState(CLOSED), []);

  return { ...state, celebrate, close };
}
