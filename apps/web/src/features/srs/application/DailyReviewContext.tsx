"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { srsApi } from "../data/srsApi";

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DailyReviewContextValue {
  dueCount: number | null;
  isObligationMet: boolean;
  isChecking: boolean;
  checkDue: () => Promise<number>;
  completeObligation: () => void;
}

const DailyReviewContext = createContext<DailyReviewContextValue | null>(null);

export function DailyReviewProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [isObligationMet, setIsObligationMet] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  const getStorageKey = useCallback(() => {
    if (!user) return null;
    return `nihongo_daily_review_completed_${user.id}_${getLocalDateString()}`;
  }, [user]);

  const completeObligation = useCallback(() => {
    const key = getStorageKey();
    if (key && typeof window !== "undefined") {
      try {
        localStorage.setItem(key, "true");
      } catch {}
    }
    setDueCount(0);
    setIsObligationMet(true);
    setIsChecking(false);
  }, [getStorageKey]);

  const checkDue = useCallback(async () => {
    if (!user || isAdmin) {
      setDueCount(0);
      setIsObligationMet(true);
      setIsChecking(false);
      return 0;
    }

    const key = getStorageKey();
    if (key && typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved === "true") {
        setDueCount(0);
        setIsObligationMet(true);
        setIsChecking(false);
        return 0;
      }
    }

    setIsChecking(true);
    try {
      const res = await srsApi.due();
      const count = res.total ?? 0;
      setDueCount(count);
      if (count === 0) {
        completeObligation();
        return 0;
      } else {
        setIsObligationMet(false);
        setIsChecking(false);
        return count;
      }
    } catch {
      // Jika terjadi gangguan jaringan, jangan kunci pengguna permanen
      setIsObligationMet(true);
      setIsChecking(false);
      return 0;
    }
  }, [user, isAdmin, getStorageKey, completeObligation]);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated" || !user || isAdmin) {
      setDueCount(0);
      setIsObligationMet(true);
      setIsChecking(false);
      return;
    }

    checkDue();
  }, [status, user, isAdmin, checkDue]);

  return (
    <DailyReviewContext.Provider
      value={{
        dueCount,
        isObligationMet,
        isChecking,
        checkDue,
        completeObligation,
      }}
    >
      {children}
    </DailyReviewContext.Provider>
  );
}

export function useDailyReview() {
  const ctx = useContext(DailyReviewContext);
  if (!ctx) {
    throw new Error("useDailyReview must be used within DailyReviewProvider");
  }
  return ctx;
}

