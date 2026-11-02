"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { WorkbookGate } from "@/features/exam/ui/WorkbookGate";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";
import { Alert } from "@/shared/ui/Alert";

function GerbangTulis() {
  const params = useSearchParams();
  const { user } = useAuth();
  // Tanpa ?levelId dipakai level siswa sekarang
  const levelId = Number(params.get("levelId") ?? user?.currentLevelId);
  if (!Number.isInteger(levelId) || levelId < 1) return <Alert>Level belum dipilih.</Alert>;
  return <WorkbookGate levelId={levelId} />;
}

export default function GerbangTulisPage() {
  const { user } = useAuth();
  if (user?.role === "admin" || user?.role === "super_admin") return <AdminLearnerNotice featureName="Gerbang Tulis Siswa" />;
  return (
    <Suspense>
      <GerbangTulis />
    </Suspense>
  );
}
