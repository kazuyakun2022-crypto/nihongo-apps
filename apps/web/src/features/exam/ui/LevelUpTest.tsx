"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExamRunner } from "./ExamRunner";
import styles from "./levelUpTest.module.css";

export function LevelUpTest() {
  const params = useSearchParams();
  const levelId = parseInt(params.get("levelId") ?? "2");
  // Level tertinggi (N1): ujian kelulusan akhir kurikulum, tidak ada level berikutnya
  const final = params.get("final") === "1";

  return (
    <ExamRunner
      kind="level-up"
      levelId={levelId}
      copy={
        final
          ? {
              badge: "Ujian Kelulusan Akhir",
              title: "Siap untuk ujian kelulusan kurikulum?",
              desc: "Ujian ini menentukan apakah kamu lulus seluruh kurikulum NihonGo.",
              passedTitle: "Selamat! Kamu Lulus Kurikulum NihonGo!",
              passedDesc: "Kamu telah menuntaskan level tertinggi. Teruskan latihan untuk menjaga kemampuanmu.",
            }
          : {
              badge: "Tes Naik Tahap",
              title: "Siap untuk tes kenaikan level?",
              desc: "Tes ini menentukan apakah kamu siap naik ke level berikutnya.",
              passedTitle: "Selamat! Kamu Naik Level!",
              passedDesc: "Kamu berhasil memenuhi syarat untuk naik ke level berikutnya.",
            }
      }
      backHref="/belajar"
      backLabel="Kembali ke daftar bab"
      resultActions={(result, retry) =>
        result.passed ? (
          <Link href="/belajar" className={styles.startBtn}>{final ? "Kembali ke Belajar" : "Lanjut ke Level Baru →"}</Link>
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
