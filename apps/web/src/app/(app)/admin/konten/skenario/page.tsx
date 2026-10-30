"use client";

import { Suspense } from "react";
import { ContentShell } from "@/features/admin/ui/content/ContentShell";
import { ScenarioManager } from "@/features/admin/ui/content/ScenarioManager";

export default function AdminSkenarioPage() {
  return (
    <ContentShell title="Skenario AI" subtitle="Atur skenario role-play Miu-chan per level: peran, tujuan, kalimat pembuka, pola target, dan bab terkait.">
      <Suspense>
        <ScenarioManager />
      </Suspense>
    </ContentShell>
  );
}
