"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { useChapters, useLevels } from "../application/useLevels";
import styles from "./learning.module.css";

const STATUS_ICON = { open: "▶", completed: "✅", locked: "🔒" } as const;

function scoreStars(score: number | null): string {
  if (score === null) return "";
  if (score >= 90) return "★★★";
  if (score >= 70) return "★★☆";
  return "★☆☆";
}

export function LevelBrowser() {
  const { levels, error } = useLevels();
  const [selected, setSelected] = useState<number | null>(null);
  const chapters = useChapters(selected);

  if (error) return <Alert>{error}</Alert>;
  if (!levels) return <p className={styles.muted}>Memuat level…</p>;

  return (
    <div className={styles.browser}>
      <h1 className={styles.heading}>Belajar</h1>
      <div className={styles.levelTabs} role="tablist" aria-label="Level JLPT">
        {levels.map((l) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={selected === l.id}
            className={styles.levelTab}
            disabled={l.locked}
            title={l.locked ? "Tersedia untuk Premium" : undefined}
            onClick={() => setSelected(l.id)}
          >
            {l.locked && <span className={styles.tabLock}>🔒</span>}
            {l.code === "PEMULA" ? "Pemula" : l.code}
          </button>
        ))}
      </div>

      {selected === null ? (
        <p className={styles.muted}>Pilih level untuk melihat daftar bab.</p>
      ) : !chapters ? (
        <p className={styles.muted}>Memuat bab…</p>
      ) : chapters.length === 0 ? (
        <p className={styles.muted}>Belum ada bab di level ini. Pengajar sedang menyiapkannya.</p>
      ) : (
        <ol className={styles.chapterList}>
          {chapters.map((c, idx) => {
            const canOpen = c.status !== "locked";
            const stars = scoreStars(c.bestScore);

            return (
              <li key={c.id}>
                {canOpen ? (
                  <Link href={`/belajar/${c.id}`} className={styles.chapter} data-status={c.status}>
                    <span className={styles.chapterNum}>{idx + 1}</span>
                    <div className={styles.chapterInfo}>
                      <strong className={styles.chapterTitle}>{c.title}</strong>
                      {c.status === "completed" && stars && (
                        <span className={styles.chapterStars}>{stars}</span>
                      )}
                      {c.status !== "completed" && (
                        <span className={styles.chapterSub}>Siap dipelajari</span>
                      )}
                    </div>
                    <span className={styles.chapterStatus}>{STATUS_ICON[c.status]}</span>
                  </Link>
                ) : (
                  <div className={styles.chapter} data-status={c.status}>
                    <span className={styles.chapterNum}>{idx + 1}</span>
                    <div className={styles.chapterInfo}>
                      <strong className={styles.chapterTitle}>{c.title}</strong>
                      <span className={styles.chapterSub}>Selesaikan bab sebelumnya</span>
                    </div>
                    <span className={styles.chapterStatus}>{STATUS_ICON[c.status]}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
