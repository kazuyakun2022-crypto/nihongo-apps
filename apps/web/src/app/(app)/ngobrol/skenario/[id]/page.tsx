"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { scenarioApi } from "@/features/conversation/data/conversationApi";
import type { ScenarioItem } from "@/features/conversation/domain/types";
import { ChatScreen } from "@/features/conversation/ui/ChatScreen";
import { Alert } from "@/shared/ui/Alert";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function SkenarioPage() {
  const { id } = useParams<{ id: string }>();
  const [scenario, setScenario] = useState<ScenarioItem | null | undefined>(undefined);

  useEffect(() => {
    scenarioApi
      .list()
      .then((list) => setScenario(list.find((s) => s.id === id) ?? null))
      .catch(() => setScenario(null));
  }, [id]);

  if (scenario === undefined) return <Skeleton height="20rem" radius="var(--radius-lg)" />;
  if (scenario === null) {
    return (
      <div style={{ display: "grid", gap: "var(--space-3)", padding: "var(--space-4)" }}>
        <Alert>Skenario tidak ditemukan atau belum terbuka untuk levelmu.</Alert>
        <Link href="/ngobrol?tab=skenario">← Kembali ke daftar skenario</Link>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", width: "100%", padding: "var(--space-3) var(--space-3) 0", boxSizing: "border-box" }}>
      <ChatScreen scenario={scenario} />
    </div>
  );
}
