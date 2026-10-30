"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { scenarioApi } from "../data/conversationApi";
import type { ScenarioItem } from "../domain/types";
import { FuriganaText } from "./FuriganaText";
import styles from "./scenarioList.module.css";

/** Daftar skenario role-play per level; skenario level berikutnya terbuka setelah naik level. */
export function ScenarioList() {
  const [items, setItems] = useState<ScenarioItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scenarioApi.list().then(setItems).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!items) {
    return (
      <SkeletonRegion label="Memuat skenario…" className={styles.grid}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height="8rem" radius="var(--radius-lg)" />
        ))}
      </SkeletonRegion>
    );
  }
  if (items.length === 0) return <p className={styles.empty}>Belum ada skenario untuk levelmu.</p>;

  const levels = [...new Set(items.map((s) => s.levelCode))].reverse();
  return (
    <div className={styles.wrap}>
      <p className={styles.lead}>Latihan percakapan dengan peran: Miu-chan jadi kasir, pelayan, atau temanmu. Kesalahanmu dikoreksi dengan lembut di setiap balasan.</p>
      {levels.map((level) => (
        <section key={level} className={styles.group}>
          <h2 className={styles.groupTitle}>{level === "PEMULA" ? "Pemula" : `JLPT ${level}`}</h2>
          <ul className={styles.grid}>
            {items
              .filter((s) => s.levelCode === level)
              .map((s) => (
                <li key={s.id}>
                  <Link href={`/ngobrol/skenario/${s.id}`} className={styles.card}>
                    <strong className={styles.title}>{s.title}</strong>
                    {s.chapterTitle && <span className={styles.chapter}>Bab: {s.chapterTitle}</span>}
                    <span className={styles.goal}>{s.goal}</span>
                    {s.targetGrammar.length > 0 && (
                      <span className={styles.chips} lang="ja">
                        {s.targetGrammar.slice(0, 3).map((g) => (
                          <span key={g} className={styles.chip}>
                            <FuriganaText text={g} />
                          </span>
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
