"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/shared/ui/Mascot";
import { starsFor } from "./WorldMap";
import styles from "./scoreScreen.module.css";
import { StarIcon } from "@/shared/ui/icons";

/** Angka naik dari 0 ke target supaya momen nilai terasa. */
export function useCountUp(target: number, durationMs = 900, delayMs = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delayMs;
      const t = Math.max(0, Math.min(1, (now - start) / durationMs));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, delayMs]);
  return value;
}

const R = 70;
const C = 2 * Math.PI * R;
const CONFETTI = Array.from({ length: 28 }, (_, i) => i);

/**
 * Layar nilai penuh setelah kuis. Lulus: ulang pembelajaran / lanjut. Belum lulus: hanya pemberitahuan + coba lagi.
 * Dirender lewat portal agar menutup seluruh layar (leluhur ber-transform mematahkan position: fixed).
 */
export function ScoreScreen({
  score,
  passed,
  passingScore,
  xpEarned,
  correct,
  graded,
  chapterTitle,
  onRestartStudy,
  onRetryQuiz,
  onShowReview,
}: {
  score: number;
  passed: boolean;
  passingScore: number;
  xpEarned: number;
  correct: number;
  graded: number;
  chapterTitle: string;
  onRestartStudy: () => void;
  onRetryQuiz: () => void;
  onShowReview: () => void;
}) {
  const shown = useCountUp(score, 1200, 350);
  const stars = passed ? starsFor(score) : 0;
  const gap = Math.max(0, passingScore - score);
  const passAngle = (passingScore / 100) * 360;

  // Halaman di belakang tidak ikut tergulir selama layar nilai tampil
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className={styles.screen} data-passed={passed || undefined} role="dialog" aria-modal="true" aria-labelledby="score-heading">
      {passed && (
        <div className={styles.confetti} aria-hidden>
          {CONFETTI.map((i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}

      <div className={styles.inner}>
        <p className={styles.chapter}>{chapterTitle}</p>

        <div className={styles.ringWrap}>
          <svg className={styles.ring} viewBox="0 0 180 180" aria-hidden>
            <circle cx="90" cy="90" r={R} className={styles.ringTrack} />
            <circle cx="90" cy="90" r={R} className={styles.ringFill} strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
            {/* Penanda batas lulus */}
            <line x1="90" y1="8" x2="90" y2="30" className={styles.passTick} transform={`rotate(${passAngle} 90 90)`} />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.score} aria-label={`Nilai ${score} persen`}>
              {shown}
              <small>%</small>
            </span>
            <span className={styles.scoreSub}>
              {correct}/{graded} benar
            </span>
          </div>
          <span className={styles.mascot} aria-hidden>
            <Mascot mood={passed ? "senang" : "berpikir"} size={72} title="" />
          </span>
        </div>

        <div className={styles.verdict}>
          <h2 id="score-heading" className={styles.heading}>
            {passed ? "Bab Selesai!" : "Belum Lulus"}
          </h2>

          {passed ? (
            <>
              <p className={styles.stars} aria-label={`${stars} dari 3 bintang`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} data-on={i < stars || undefined} style={{ "--si": i } as React.CSSProperties}>
                    <StarIcon filled size={36} strokeWidth={1.5} />
                  </span>
                ))}
              </p>
              <p className={styles.meta}>
                Batas lulus {passingScore}% · <strong>+{xpEarned} XP</strong>
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost} onClick={onRestartStudy}>
                  Ulang pembelajaran
                </button>
                <Link href="/belajar" className={styles.btnPrimary}>
                  Lanjut ke bab berikutnya →
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className={styles.notice} role="alert">
                <strong>
                  Butuh {passingScore}% untuk lulus, nilaimu kurang {gap} poin.
                </strong>
                <span>Bab berikutnya masih terkunci. Kerjakan kuisnya sekali lagi; materinya tidak perlu diulang.</span>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.btnPrimary} onClick={onRetryQuiz}>
                  Coba kuis lagi
                </button>
              </div>
            </>
          )}

          <button type="button" className={styles.reviewLink} onClick={onShowReview}>
            Lihat pembahasan soal
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
