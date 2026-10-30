"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KamusGambar } from "@/features/kamus/ui/KamusGambar";
import { KamusTeks } from "@/features/kamus/ui/KamusTeks";
import type { KamusTab } from "@/features/kamus/data/kamusApi";
import styles from "@/features/kamus/ui/kamusTeks.module.css";

const TABS: { key: "gambar" | KamusTab; label: string; icon: string }[] = [
  { key: "gambar", label: "Bergambar", icon: "🖼️" },
  { key: "kosakata", label: "Kosakata", icon: "📖" },
  { key: "kanji", label: "Kanji", icon: "漢" },
  { key: "tata_bahasa", label: "Tata Bahasa", icon: "🧩" },
  { key: "ungkapan", label: "Ungkapan & Sebutan", icon: "💬" },
];

function Kamus() {
  const raw = useSearchParams().get("tab");
  const tab = TABS.find((t) => t.key === raw)?.key ?? "gambar";
  const tabs = (
    <nav className={styles.tabs} aria-label="Jenis kamus">
      {TABS.map((t) => (
        <Link key={t.key} href={t.key === "gambar" ? "/kamus" : `/kamus?tab=${t.key}`} className={styles.tab} aria-current={tab === t.key ? "page" : undefined} scroll={false}>
          <span aria-hidden="true">{t.icon}</span> {t.label}
        </Link>
      ))}
    </nav>
  );
  return tab === "gambar" ? <KamusGambar tabs={tabs} /> : <KamusTeks tab={tab} tabs={tabs} />;
}

export default function KamusPage() {
  return (
    <Suspense>
      <Kamus />
    </Suspense>
  );
}
