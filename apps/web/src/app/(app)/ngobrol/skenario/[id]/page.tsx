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

  if (scenario === undefined) {
    return (
      <div style={{ maxWidth: "42rem", margin: "2rem auto", padding: "1rem" }}>
        <Skeleton height="22rem" radius="var(--radius-lg)" />
      </div>
    );
  }

  if (scenario === null) {
    return (
      <div style={{ maxWidth: "36rem", margin: "3rem auto", display: "grid", gap: "var(--space-3)", padding: "var(--space-4)" }}>
        <Alert>Skenario tidak ditemukan atau belum terbuka untuk levelmu.</Alert>
        <Link href="/ngobrol?tab=skenario" style={{ fontWeight: 700, color: "var(--color-primary)" }}>
          ← Kembali ke daftar skenario
        </Link>
      </div>
    );
  }

  return <ChatScreen scenario={scenario} />;
}
