"use client";

import { Suspense } from "react";
import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { ExamManager } from "@/features/admin/ui/content/ExamManager";

export default function AdminMateriUjianPage() {
  return (
    <MateriShell
      title="Ujian & Tes Penempatan"
      subtitle="Atur syarat kelulusan dan bank soal tes naik tahap, tes penempatan saat daftar, Gerbang Tulis, dan Simulasi JLPT untuk setiap level."
    >
      <Suspense fallback={<p style={{ padding: 24, textAlign: "center" }}>Memuat modul ujian…</p>}>
        <ExamManager />
      </Suspense>
    </MateriShell>
  );
}

