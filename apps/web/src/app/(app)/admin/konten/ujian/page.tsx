"use client";

import { Suspense } from "react";
import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { ExamManager } from "@/features/admin/ui/content/ExamManager";

export default function AdminUjianPage() {
  return (
    <ContentShell title="Ujian & Tes Penempatan" subtitle="Atur syarat kelulusan dan bank soal tes naik tahap serta tes penempatan saat daftar, untuk setiap level.">
      <Suspense>
        <ExamManager />
      </Suspense>
    </ContentShell>
  );
}
