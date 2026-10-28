"use client";

import Link from "next/link";
import type { OnboardingStart } from "@/features/learning/domain/types";
import { ExamRunner } from "./ExamRunner";
import styles from "./levelUpTest.module.css";

interface Props {
  /** Titik mulai yang dipilih dan butuh tes. */
  start: OnboardingStart;
  /** Titik mulai tertinggi tanpa tes, ditawarkan jika belum lulus. */
  fallback: OnboardingStart | null;
  onStart: (levelId: number) => void;
  busy: boolean;
}

const levelLabel = (code: string) => (code === "PEMULA" ? "Pemula" : code);

export function PlacementTest({ start, fallback, onStart, busy }: Props) {
  return (
    <ExamRunner
      kind="placement"
      levelId={start.levelId}
      copy={{
        badge: "Tes Penempatan",
        title: `Tes untuk mulai di ${levelLabel(start.levelCode)}`,
        desc: `Kerjakan tes singkat ini supaya kami tahu kamu siap belajar di ${start.levelName}.`,
        passedTitle: `Kamu siap mulai di ${levelLabel(start.levelCode)}!`,
        passedDesc: `Materi ${start.levelName} sudah terbuka untukmu.`,
      }}
      backHref="/mulai"
      backLabel="Pilih titik mulai lain"
      resultActions={(result, retry) =>
        result.passed ? (
          <button className={styles.startBtn} onClick={() => onStart(start.levelId)} disabled={busy}>
            {busy ? "Menyimpan…" : `Mulai belajar ${levelLabel(start.levelCode)} →`}
          </button>
        ) : (
          <>
            {fallback && (
              <button className={styles.startBtn} onClick={() => onStart(fallback.levelId)} disabled={busy}>
                {busy ? "Menyimpan…" : `Mulai dari ${levelLabel(fallback.levelCode)}`}
              </button>
            )}
            {retry && <button className={styles.retryBtn} onClick={retry}>Coba Lagi</button>}
            <Link href="/mulai" className={styles.backLink}>Pilih titik mulai lain</Link>
          </>
        )
      }
    />
  );
}
