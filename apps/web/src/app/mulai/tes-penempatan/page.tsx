"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RequireAuth } from "@/shared/ui/RequireAuth";
import { learningApi } from "@/features/learning/data/learningApi";
import { PlacementTest } from "@/features/exam/ui/PlacementTest";
import type { LearningGoal } from "@/features/learning/domain/types";

const LEVEL_INFO: Record<number, { code: string; sourceCode: string; sourceLevelId: number }> = {
  3: { code: "N4", sourceCode: "N5", sourceLevelId: 2 },
  4: { code: "N3", sourceCode: "N4", sourceLevelId: 3 },
  5: { code: "N2", sourceCode: "N3", sourceLevelId: 4 },
  6: { code: "N1", sourceCode: "N2", sourceLevelId: 5 },
};

function PlacementPage() {
  const router = useRouter();
  const params = useSearchParams();

  const targetLevelId = Number(params.get("target") ?? "3");
  const goal = (params.get("goal") ?? "jlpt") as LearningGoal;
  const min = Number(params.get("min") ?? "10") as 5 | 10 | 20;

  const info = LEVEL_INFO[targetLevelId];

  if (!info) {
    router.replace("/mulai");
    return null;
  }

  async function completeAndGo(levelId: number) {
    try {
      await learningApi.completeOnboarding({ currentLevelId: levelId, learningGoal: goal, dailyTargetMin: min });
      window.location.assign("/beranda");
    } catch {
      window.location.assign("/beranda");
    }
  }

  return (
    <PlacementTest
      targetLevelId={targetLevelId}
      targetLevelCode={info.code}
      sourceLevelCode={info.sourceCode}
      onPass={() => completeAndGo(targetLevelId)}
      onStartLower={() => completeAndGo(info.sourceLevelId)}
    />
  );
}

export default function Page() {
  return (
    <RequireAuth allowIncompleteProfile>
      <PlacementPage />
    </RequireAuth>
  );
}
