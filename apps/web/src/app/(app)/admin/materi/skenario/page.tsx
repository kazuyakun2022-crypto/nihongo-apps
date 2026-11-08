"use client";

import { Suspense } from "react";
import { MateriShell } from "@/features/admin/ui/content/MateriShell";
import { ScenarioManager } from "@/features/admin/ui/content/ScenarioManager";

export default function AdminMateriSkenarioPage() {
  return (
    <MateriShell
      title="Skenario AI & Percakapan"
      subtitle="Atur skenario role-play Miu-chan per level: peran, tujuan, kalimat pembuka, pola target, dan bab terkait."
    >
      <Suspense fallback={<p style={{ padding: 24, textAlign: "center" }}>Memuat skenario AI…</p>}>
        <ScenarioManager />
      </Suspense>
    </MateriShell>
  );
}

