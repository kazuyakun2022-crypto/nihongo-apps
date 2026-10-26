"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { useChapters, useLevels } from "../application/useLevels";
import styles from "./learning.module.css";

function scoreStars(score: number | null): string {
  if (score === null) return "";
  if (score >= 90) return "★★★";
  if (score >= 70) return "★★☆";
  return "★☆☆";
}

function StatusIcon({ status }: { status: "open" | "completed" | "locked" }) {
  if (status === "completed") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "open") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
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
            {l.locked && (
              <span className={styles.tabLock} aria-hidden="true" style={{ marginRight: 4, display: "inline-flex", verticalAlign: "middle" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
            )}
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
                    <span className={styles.chapterStatus}>
                      <StatusIcon status={c.status} />
                    </span>
                  </Link>
                ) : (
                  <div className={styles.chapter} data-status={c.status}>
                    <span className={styles.chapterNum}>{idx + 1}</span>
                    <div className={styles.chapterInfo}>
                      <strong className={styles.chapterTitle}>{c.title}</strong>
                      <span className={styles.chapterSub}>Selesaikan bab sebelumnya</span>
                    </div>
                    <span className={styles.chapterStatus}>
                      <StatusIcon status={c.status} />
                    </span>
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
