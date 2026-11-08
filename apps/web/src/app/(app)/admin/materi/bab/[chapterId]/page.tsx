"use client";

import { Suspense } from "react";
import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { ChapterEditor } from "@/features/admin/ui/content/ChapterEditor";

export default function AdminMateriChapterEditorPage({ params }: { params: { chapterId: string } }) {
  return (
    <MateriShell
      title="Edit Bab Pelajaran"
      subtitle="Ubah isi bab. Perubahan langsung berlaku untuk siswa jika bab berstatus terbit."
    >
      <Suspense fallback={<p style={{ padding: 24, textAlign: "center" }}>Memuat editor bab…</p>}>
        <ChapterEditor chapterId={params.chapterId} />
      </Suspense>
    </MateriShell>
  );
}

