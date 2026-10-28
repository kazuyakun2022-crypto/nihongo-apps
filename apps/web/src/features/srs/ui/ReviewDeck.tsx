"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { useReview } from "../application/useReview";
import type { ReviewGrade } from "../domain/types";
import styles from "./srs.module.css";

const grades: { value: ReviewGrade; label: string }[] = [
  { value: "lupa", label: "Lupa" },
  { value: "sulit", label: "Sulit" },
  { value: "bisa", label: "Bisa" },
  { value: "mudah", label: "Mudah" },
];

export function ReviewDeck() {
  const { loading, current, remaining, revealed, reveal, grade } = useReview();

  if (loading) {
    return (
      <SkeletonRegion label="Memuat kartu…" className={styles.deck}>
        <Skeleton width="7rem" />
        <div className={styles.card} style={{ justifyItems: "center" }}>
          <Skeleton width="8rem" height="3rem" />
          <Skeleton width="5rem" />
        </div>
        <Skeleton height="3rem" radius="var(--radius-pill)" />
      </SkeletonRegion>
    );
  }
  if (!current) {
    return (
      <section className={styles.empty}>
        <Mascot mood="senang" size={96} />
        <h1 className={styles.heading}>Semua kartu hari ini selesai</h1>
        <p className={styles.muted}>Selesaikan bab baru untuk menambah kosakata ke review.</p>
        <Link href="/belajar">Buka daftar bab</Link>
      </section>
    );
  }

  return (
    <section className={styles.deck}>
      <p className={styles.muted}>{remaining} kartu tersisa</p>
      <div className={styles.card}>
        <p lang="ja" className={styles.front}>
          {current.front}
        </p>
        {revealed && (
          <div className={styles.back}>
            {current.reading && <p lang="ja">{current.reading}</p>}
            <p>{current.meaning}</p>
          </div>
        )}
      </div>
      {revealed ? (
        <div className={styles.grades}>
          {grades.map((g) => (
            <Button key={g.value} variant={g.value === "bisa" ? "primary" : "secondary"} onClick={() => grade(g.value)}>
              {g.label}
            </Button>
          ))}
        </div>
      ) : (
        <Button block onClick={reveal}>
          Lihat jawaban
        </Button>
      )}
    </section>
  );
}
