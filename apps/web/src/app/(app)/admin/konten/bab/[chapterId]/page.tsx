"use client";

import { Suspense } from "react";
import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { ChapterEditor } from "@/features/admin/ui/content/ChapterEditor";

export default function AdminChapterEditorPage({ params }: { params: { chapterId: string } }) {
  return (
    <ContentShell title="Edit Bab" subtitle="Ubah isi bab. Perubahan langsung berlaku untuk siswa jika bab berstatus terbit.">
      <Suspense>
        <ChapterEditor chapterId={params.chapterId} />
      </Suspense>
    </ContentShell>
  );
}
