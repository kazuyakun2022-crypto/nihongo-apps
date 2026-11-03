"use client";

import { useScreenContext } from "@/features/navigator/application/NavigatorProvider";
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
  // Jawaban kartu baru diberikan ke Miu-chan setelah dibuka, supaya ia tidak membocorkannya
  useScreenContext("kartu", current ? `Kartu review: ${current.front}${revealed ? ` (${current.reading ?? ""} = ${current.meaning})` : " (jawaban belum dibuka; jangan beri tahu artinya, beri petunjuk saja)"}` : null);

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
      <section className={styles.empty} data-spotlight="review-kosong">
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
      <div className={styles.card} data-spotlight="review-kartu-depan">
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
        <div className={styles.grades} data-spotlight="review-nilai">
          {grades.map((g) => (
            <Button key={g.value} variant={g.value === "bisa" ? "primary" : "secondary"} onClick={() => grade(g.value)}>
              {g.label}
            </Button>
          ))}
        </div>
      ) : (
        <Button block onClick={reveal} data-spotlight="review-kartu">
          Lihat jawaban
        </Button>
      )}
    </section>
  );
}
