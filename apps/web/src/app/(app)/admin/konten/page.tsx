"use client";

import { Suspense } from "react";
import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { ChapterManager } from "@/features/admin/ui/content/ChapterManager";

export default function AdminKontenPage() {
  return (
    <ContentShell title="Konten Pelajaran" subtitle="Atur bab, kosakata, kanji, tata bahasa, dan latihan (menyusun, menulis, berbicara, dll.) untuk setiap level.">
      <Suspense>
        <ChapterManager />
      </Suspense>
    </ContentShell>
  );
}
