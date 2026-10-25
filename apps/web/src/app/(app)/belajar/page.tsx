"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { learningApi } from "@/features/learning/data/learningApi";
import type { LevelProgress } from "@/features/learning/domain/types";
import { LevelBrowser } from "@/features/learning/ui/LevelBrowser";
import { LevelProgressBar } from "@/features/learning/ui/LevelProgressBar";
import { ReadinessCard } from "@/features/exam/ui/ReadinessCard";
import { DailyMissionView } from "@/features/learning/ui/DailyMissionView";
import styles from "@/features/learning/ui/dailyMission.module.css";

const LEVEL_CODE: Record<number, string> = { 1: "Pemula", 2: "N5", 3: "N4", 4: "N3", 5: "N2", 6: "N1" };
const N1_LEVEL_ID = 6;

export default function BelajarPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"mission" | "catalog">("mission");
  const [progress, setProgress] = useState<LevelProgress | null>(null);

  const levelId = user?.currentLevelId ?? 2;

  useEffect(() => {
    learningApi.getProgress(levelId).then(setProgress).catch(() => {});
  }, [levelId]);

  const levelCode = LEVEL_CODE[levelId] ?? "N5";
  const showReadiness = !!user && levelId !== N1_LEVEL_ID;

  if (activeTab === "mission") {
    return <DailyMissionView onBackToCatalog={() => setActiveTab("catalog")} />;
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      {/* Switcher Tab */}
      <div className={styles.modeTabs} style={{ maxWidth: "32rem", margin: "0 auto", width: "100%" }}>
        <button className={styles.modeTabBtn} onClick={() => setActiveTab("mission")}>
          🎯 Misi Hari Ini
        </button>
        <button className={`${styles.modeTabBtn} ${styles.modeTabBtnActive}`}>
          📚 Semua Bab (N5-N1)
        </button>
      </div>

      {progress && progress.vocabTarget > 0 && (
        <LevelProgressBar progress={progress} levelCode={levelCode} />
      )}
      {showReadiness && (
        <ReadinessCard levelId={levelId} levelCode={levelCode} />
      )}
      <LevelBrowser />
    </div>
  );
}
