"use client";

import { Suspense } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { LevelUpTest } from "@/features/exam/ui/LevelUpTest";
import { AdminLearnerNotice } from "@/shared/ui/AdminLearnerNotice";

export default function TesNaikTahapPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  if (isAdmin) {
    return <AdminLearnerNotice featureName="Ujian Kenaikan Tingkat Siswa" />;
  }

  return (
    <Suspense>
      <LevelUpTest />
    </Suspense>
  );
}
