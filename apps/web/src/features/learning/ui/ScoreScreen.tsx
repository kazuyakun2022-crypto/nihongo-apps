"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/shared/ui/Mascot";
import { StreakFlame } from "@/shared/ui/StreakFlame";
import { AchievementUnlockModal, type UnlockedAchievement } from "@/features/progress/ui/AchievementUnlockModal";
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
  streak,
  newAchievements,
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
  streak?: number;
  newAchievements?: UnlockedAchievement[];
  onRestartStudy: () => void;
  onRetryQuiz: () => void;
  onShowReview: () => void;
}) {
  const shown = useCountUp(score, 1200, 350);
  const shownXp = useCountUp(xpEarned, 800, 300);
  const [dismissedAchievements, setDismissedAchievements] = useState(false);
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

      <div className={styles.cardModal}>
        <div className={styles.mascotTop}>
          <Mascot mood={passed ? "senang" : "berpikir"} size={88} title="" />
        </div>

        <span className={styles.badgePill} data-passed={passed || undefined}>
          {passed ? "🎉 Bab Selesai!" : "💪 Belum Lulus"}
        </span>

        <h2 id="score-heading" className={styles.heading}>
          {passed ? "Luar Biasa, Kamu Berhasil!" : "Hampir Berhasil!"}
        </h2>
        <p className={styles.chapter}>{chapterTitle}</p>

        <div className={styles.ringWrap}>
          <svg className={styles.ring} viewBox="0 0 180 180" aria-hidden>
            <circle cx="90" cy="90" r={R} className={styles.ringTrack} />
            <circle cx="90" cy="90" r={R} className={styles.ringFill} strokeDasharray={C} strokeDashoffset={C * (1 - shown / 100)} />
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
        </div>

        {passed ? (
          <div className={styles.verdict}>
            <div className={styles.stars} aria-label={`${stars} dari 3 bintang`}>
              {[0, 1, 2].map((i) => (
                <span key={i} data-on={i < stars || undefined} style={{ "--si": i } as React.CSSProperties}>
                  <StarIcon filled size={34} strokeWidth={1.5} />
                </span>
              ))}
            </div>

            <div className={styles.quickStatsRow}>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>Poin XP</span>
                <span className={`${styles.statPillVal} ${styles.statPillValXp}`}>+{shownXp} XP</span>
              </div>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>Akurasi</span>
                <span className={styles.statPillVal}>{Math.round((correct / Math.max(graded, 1)) * 100)}%</span>
              </div>
              <div className={styles.statPill}>
                <span className={styles.statPillLabel}>Batas Lulus</span>
                <span className={styles.statPillVal}>{passingScore}%</span>
              </div>
            </div>

            {streak !== undefined && streak > 0 && (
              <div className={styles.streakCard}>
                <div className={styles.streakFlameWrap}>
                  <StreakFlame count={streak} size={26} />
                </div>
                <div className={styles.streakInfo}>
                  <span className={styles.streakTitle}>🔥 Streak {streak} Hari Aktif!</span>
                  <span className={styles.streakSub}>Semangat belajarmu terus berkobar hari ini.</span>
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <Link href="/belajar" className={styles.btnPrimary}>
                Lanjut ke Bab Berikutnya →
              </Link>
              <div className={styles.actionRowSecondary}>
                <button type="button" className={styles.btnGhost} onClick={onShowReview}>
                  📝 Pembahasan Soal
                </button>
                <button type="button" className={styles.btnGhost} onClick={onRestartStudy}>
                  🔄 Ulang Materi
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.verdict}>
            <div className={styles.notice} role="alert">
              <strong>Butuh {passingScore}% untuk lulus (kurang {gap}% lagi).</strong>
              <span>Bab berikutnya masih terkunci. Yuk coba kuisnya sekali lagi!</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} onClick={onRetryQuiz}>
                Coba Kuis Lagi →
              </button>
              <div className={styles.actionRowSecondary}>
                <button type="button" className={styles.btnGhost} onClick={onShowReview}>
                  📝 Lihat Pembahasan
                </button>
                <button type="button" className={styles.btnGhost} onClick={onRestartStudy}>
                  🔄 Pelajari Ulang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!dismissedAchievements && newAchievements && newAchievements.length > 0 && (
        <AchievementUnlockModal
          achievements={newAchievements}
          onClose={() => setDismissedAchievements(true)}
        />
      )}
    </div>,
    document.body,
  );
}
