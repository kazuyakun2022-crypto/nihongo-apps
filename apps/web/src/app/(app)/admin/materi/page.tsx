"use client";

import { Suspense } from "react";
import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { ChapterManager } from "@/features/admin/ui/content/ChapterManager";

export default function AdminMateriLessonsPage() {
  return (
    <MateriShell
      title="Materi Pelajaran & Kurikulum"
      subtitle="Atur bab, kosakata, kanji, tata bahasa, dan latihan (menyusun, menulis, berbicara) per level JLPT N5–N1."
    >
      <Suspense fallback={<p style={{ padding: 24, textAlign: "center" }}>Memuat bab pelajaran…</p>}>
        <ChapterManager />
      </Suspense>
    </MateriShell>
  );
}

