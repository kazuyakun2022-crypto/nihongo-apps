"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExamRunner } from "./ExamRunner";
import styles from "./levelUpTest.module.css";

export function LevelUpTest() {
  const levelId = parseInt(useSearchParams().get("levelId") ?? "2");

  return (
    <ExamRunner
      kind="level-up"
      levelId={levelId}
      copy={{
        badge: "Tes Naik Tahap",
        title: "Siap untuk tes kenaikan level?",
        desc: "Tes ini menentukan apakah kamu siap naik ke level berikutnya.",
        passedTitle: "Selamat! Kamu Naik Level!",
        passedDesc: "Kamu berhasil memenuhi syarat untuk naik ke level berikutnya.",
      }}
      backHref="/belajar"
      backLabel="Kembali ke daftar bab"
      resultActions={(result, retry) =>
        result.passed ? (
          <Link href="/belajar" className={styles.startBtn}>Lanjut ke Level Baru →</Link>
        ) : (
          <>
            <Link href="/belajar" className={styles.startBtn}>Kembali Latihan</Link>
            {retry && <button className={styles.retryBtn} onClick={retry}>Coba Lagi</button>}
          </>
        )
      }
    />
  );
}
