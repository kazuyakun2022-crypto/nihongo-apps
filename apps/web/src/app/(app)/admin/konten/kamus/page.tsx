"use client";

import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { KamusManager } from "@/features/admin/ui/content/KamusManager";

export default function AdminKamusPage() {
  return (
    <ContentShell title="Kamus" subtitle="Kelola isi kamus siswa: kosakata bergambar, kosakata, kanji, tata bahasa, serta ungkapan & sebutan.">
      <KamusManager />
    </ContentShell>
  );
}
