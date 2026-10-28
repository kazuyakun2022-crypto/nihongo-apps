"use client";

import { Suspense } from "react";
import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { ExamManager } from "@/features/admin/ui/content/ExamManager";

export default function AdminUjianPage() {
  return (
    <ContentShell title="Ujian Naik Level" subtitle="Atur syarat kelulusan dan kelola bank soal ujian untuk setiap level.">
      <Suspense>
        <ExamManager />
      </Suspense>
    </ContentShell>
  );
}
