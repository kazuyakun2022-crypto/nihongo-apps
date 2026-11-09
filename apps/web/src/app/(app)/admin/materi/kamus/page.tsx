"use client";

import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { KamusManager } from "@/features/admin/ui/content/KamusManager";

export default function AdminMateriKamusPage() {
  return (
    <MateriShell
      title="Kamus & Kosakata"
      subtitle="Kelola isi kamus siswa: kosakata bergambar, kosakata, kanji, tata bahasa, serta ungkapan & sebutan."
    >
      <KamusManager />
    </MateriShell>
  );
}

