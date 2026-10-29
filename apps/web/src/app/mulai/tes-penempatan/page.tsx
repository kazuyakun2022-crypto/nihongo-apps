"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/shared/ui/RequireAuth";
import { Alert } from "@/shared/ui/Alert";
import { PageSkeleton } from "@/shared/ui/Skeleton";
import { learningApi } from "@/features/learning/data/learningApi";
import type { OnboardingOptions } from "@/features/learning/domain/types";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { PlacementTest } from "@/features/exam/ui/PlacementTest";

function PlacementPage() {
  const { updateUser } = useAuth();
  const params = useSearchParams();
  const targetLevelId = Number(params.get("target"));
  const goal = params.get("goal") ?? "";
  const min = Number(params.get("min"));
  const name = params.get("name") ?? undefined;
  const gender = (params.get("gender") as "male" | "female" | "other") || undefined;

  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    learningApi.onboardingOptions().then(setOptions).catch(() => setError("Pengaturan tes belum bisa dimuat. Coba lagi."));
  }, []);

  if (error && !options) return <Notice text={error} />;
  if (!options) return <PageSkeleton label="Menyiapkan tes penempatan…" />;

  const start = options.starts.find((s) => s.levelId === targetLevelId && s.requiresTest);
  if (!start) return <Notice text="Titik mulai ini tidak memerlukan tes atau sudah tidak tersedia." />;
  // Urutan starts mengikuti urutan level, jadi yang terakhir adalah level tanpa tes tertinggi
  const fallback = options.starts.filter((s) => !s.requiresTest).at(-1) ?? null;

  async function begin(levelId: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await learningApi.completeOnboarding({
        currentLevelId: levelId,
        learningGoal: goal,
        dailyTargetMin: min,
        displayName: name,
        gender,
      });
      if (res?.user) {
        updateUser(res.user);
      } else {
        updateUser({
          displayName: name,
          gender: gender ?? null,
          currentLevelId: levelId,
          learningGoal: goal,
          dailyTargetMin: min,
          needsOnboarding: false,
        });
      }
      window.location.assign("/beranda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belum bisa menyimpan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <>
      {error && <Alert>{error}</Alert>}
      <PlacementTest start={start} fallback={fallback} onStart={begin} busy={busy} />
    </>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <main style={{ maxWidth: "34rem", margin: "0 auto", padding: "var(--space-6) var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <Alert>{text}</Alert>
      <Link href="/mulai">← Kembali ke pilihan titik mulai</Link>
    </main>
  );
}

export default function Page() {
  return (
    <RequireAuth allowIncompleteProfile>
      <Suspense>
        <PlacementPage />
      </Suspense>
    </RequireAuth>
  );
}
