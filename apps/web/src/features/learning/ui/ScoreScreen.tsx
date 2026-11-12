"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { StreakFlame } from "@/shared/ui/StreakFlame";
import { DailyStreakCelebrationModal } from "@/shared/ui/DailyStreakCelebrationModal";
import { AchievementUnlockModal, type UnlockedAchievement } from "@/features/progress/ui/AchievementUnlockModal";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { useDailyStreakCelebration } from "@/features/progress/application/useDailyStreakCelebration";
import { soundFX } from "@/lib/audio/SoundFXManager";
import { starsFor } from "./WorldMap";
import { StarIcon } from "@/shared/ui/icons";
import styles from "./scoreScreen.module.css";

/** Angka naik dari 0 ke target dengan kurva easing yang mulus. */
export function useCountUp(target: number, durationMs = 1000, delayMs = 300, active = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  }, [target, durationMs, delayMs, active]);
  return value;
}

type ResultPhase = "score" | "achievement" | "xp" | "streak" | "done";

const R = 70;
const C = 2 * Math.PI * R;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  scale: number;
  type: "sakura" | "star" | "ribbon";
  color: string;
  alpha: number;
}

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
  const [phase, setPhase] = useState<ResultPhase>("score");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stars = passed ? starsFor(score) : 0;
  const gap = Math.max(0, passingScore - score);

  const { user } = useAuth();
  const {
    open: streakOpen,
    streak: streakValue,
    previousStreak,
    celebrate: celebrateStreak,
    close: closeStreak,
  } = useDailyStreakCelebration(user?.id);
  const hasNewAchievements = Boolean(newAchievements && newAchievements.length > 0);
  const xpActive = phase === "xp" || phase === "streak" || phase === "done";
  const shown = useCountUp(score, 1100, 300);
  const shownXp = useCountUp(xpEarned, 850, 120, xpActive);

  useEffect(() => {
    if (phase !== "score") return;
    const timer = window.setTimeout(() => {
      if (hasNewAchievements) setPhase("achievement");
      else setPhase(passed ? "xp" : "done");
    }, passed ? 2200 : 1500);
    return () => clearTimeout(timer);
  }, [phase, hasNewAchievements, passed]);

  useEffect(() => {
    if (phase !== "xp") return;
    const timer = window.setTimeout(() => {
      if (!passed || typeof streak !== "number" || streak <= 0) {
        setPhase("done");
        return;
      }
      const opened = celebrateStreak(streak);
      setPhase(opened ? "streak" : "done");
    }, 1100);
    return () => clearTimeout(timer);
  }, [phase, passed, streak, celebrateStreak]);

  useEffect(() => {
    if (phase === "xp") soundFX.play("coin_tick", 0.5);
  }, [phase]);

  // Kunci scroll latar belakang
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Orkestrasi Efek Suara Reaktif (Web Audio API Berlatensi 0ms) ──
  useEffect(() => {
    if (!passed) {
      soundFX.play("wrong", 0.45);
      return;
    }

    // Tahap 1: Fanfare instan saat kartu terbuka
    const tFanfare = setTimeout(() => {
      soundFX.play("fanfare_triumphant", 0.6);
    }, 60);

    // Tahap 2: Bintang 1, 2, 3 menyala bertahap dengan nada glockenspiel
    const tStar1 = setTimeout(() => {
      if (stars >= 1) soundFX.play("correct", 0.5);
    }, 1000);

    const tStar2 = setTimeout(() => {
      if (stars >= 2) soundFX.play("coin_tick", 0.55);
    }, 1250);

    const tStar3 = setTimeout(() => {
      if (stars >= 3) soundFX.play("glockenspiel_chime", 0.65);
    }, 1500);

    return () => {
      clearTimeout(tFanfare);
      clearTimeout(tStar1);
      clearTimeout(tStar2);
      clearTimeout(tStar3);
    };
  }, [passed, stars]);

  // ── Partikel 2D Canvas Confetti (Sakura, Bintang Emas, Pita Berwarna) ──
  useEffect(() => {
    if (!passed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);
    const originX = width / 2;
    const originY = height / 2 - 50;

    const colors = ["#FF5A79", "#FFC800", "#58CC02", "#38BDF8", "#F472B6", "#A855F7", "#FF9600"];
    const particles: Particle[] = [];

    // Tepat 60 partikel berenergi selebrasi
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.4;
      const speed = 7 + Math.random() * 11;
      const types: ("sakura" | "star" | "ribbon")[] = ["sakura", "star", "ribbon"];
      const type = types[i % 3];

      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        scale: 0.7 + Math.random() * 0.6,
        type,
        color: type === "sakura" ? "#FF5A79" : type === "star" ? "#FFC800" : colors[i % colors.length],
        alpha: 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // Gravitasi alami
        p.vx *= 0.985;
        p.rotation += p.vRot;
        p.alpha -= 0.007;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.scale(p.scale, p.scale);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;

          if (p.type === "sakura") {
            ctx.beginPath();
            ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === "star") {
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * 8, -Math.sin(((18 + s * 72) * Math.PI) / 180) * 8);
              ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * 4, -Math.sin(((54 + s * 72) * Math.PI) / 180) * 4);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(-6, -3, 12, 6);
          }

          ctx.restore();
        }
      }

      if (alive) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [passed]);

  return createPortal(
    <div
      className={styles.screen}
      data-passed={passed || undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-heading"
    >
      {/* 2D Canvas Confetti Layer */}
      {passed && (
        <canvas
          ref={canvasRef}
          className={styles.canvasConfetti}
          aria-hidden="true"
        />
      )}

      {/* Kartu Selebrasi Utama (Warm Tactile Neubrutalism-Lite) */}
      <motion.div
        initial={{ scale: 0.82, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 260 }}
        className={styles.cardModal}
      >
        {/* Panggung Maskot Miu-chan */}
        <motion.div
          initial={{ scale: 0.7, y: -20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className={styles.mascotBadgeWrap}
        >
          <motion.div
            animate={passed ? { y: [0, -8, 0] } : undefined}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className={styles.mascotBadgeCircle}
          >
            <Image
              src={passed ? "/neko/maskot-senang.webp" : "/neko/maskot-berpikir.webp"}
              alt="Miu-chan"
              width={90}
              height={90}
              className={styles.mascotImg}
              priority
            />
          </motion.div>
          {passed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className={styles.mascotPopperBadge}
              aria-hidden="true"
            >
              🎉
            </motion.div>
          )}
        </motion.div>

        {/* Lencana Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className={styles.badgePill}
          data-passed={passed || undefined}
        >
          {passed ? "✨ BAB SELESAI!" : "💪 BELUM LULUS"}
        </motion.div>

        {/* Judul & Sesi Bab */}
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          id="score-heading"
          className={styles.heading}
        >
          {passed ? "Luar Biasa, Kamu Berhasil!" : "Hampir Berhasil!"}
        </motion.h2>
        <p className={styles.chapter}>{chapterTitle}</p>

        {/* Cincin Skor Radial (Matcha Green Radiant Gauge Tanpa Coretan Slop) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", damping: 16 }}
          className={styles.ringWrap}
        >
          <svg className={styles.ring} viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r={R} className={styles.ringTrack} />
            <circle
              cx="90"
              cy="90"
              r={R}
              className={styles.ringFill}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - shown / 100)}
              style={{
                stroke: passed ? "#58CC02" : "#EF4444",
                filter: passed ? "drop-shadow(0 0 10px rgba(88, 204, 2, 0.45))" : "none",
              }}
            />
          </svg>
          <div className={styles.ringCenter}>
            <span className={styles.score} aria-label={`Nilai ${score} persen`}>
              {shown}
              <small>%</small>
            </span>
            <span className={styles.scoreSubBadge}>
              {correct}/{graded} benar
            </span>
          </div>
        </motion.div>

        {passed ? (
          <div className={styles.verdict}>
            {/* 3 Bintang Pencapaian Bertingkat (Staggered Elastic Bounce) */}
            <div className={styles.stars} aria-label={`${stars} dari 3 bintang`}>
              {[0, 1, 2].map((i) => {
                const isOn = i < stars;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, rotate: -40 }}
                    animate={
                      isOn
                        ? { scale: [0, 1.35, 1], rotate: [-40, 10, 0] }
                        : { scale: 1, rotate: 0 }
                    }
                    transition={
                      isOn
                        ? {
                            delay: 0.95 + i * 0.25,
                            type: "spring",
                            damping: 12,
                            stiffness: 220,
                          }
                        : undefined
                    }
                    className={`${styles.starItem} ${isOn ? styles.starOn : styles.starOff}`}
                  >
                    <StarIcon filled={isOn} size={38} strokeWidth={1.5} />
                  </motion.div>
                );
              })}
            </div>

            {/* Metrik Cepat (Tactile Neubrutalism-Lite Box) */}
            {xpActive && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, type: "spring" }}
                className={styles.quickStatsRow}
              >
                <motion.div
                  className={styles.statPill}
                  animate={{ scale: phase === "xp" ? [1, 1.08, 1] : 1 }}
                  transition={{ duration: 0.6, repeat: phase === "xp" ? 2 : 0, ease: "easeInOut" }}
                >
                  <span className={styles.statPillLabel}>Poin XP</span>
                  <span className={`${styles.statPillVal} ${styles.statPillValXp}`}>
                    <span className={styles.coinBadge}>🪙</span> +{shownXp} XP
                  </span>
                </motion.div>
                <div className={styles.statDivider} />
                <div className={styles.statPill}>
                  <span className={styles.statPillLabel}>Akurasi</span>
                  <span className={styles.statPillVal} style={{ color: "#16a34a" }}>
                    {Math.round((correct / Math.max(graded, 1)) * 100)}%
                  </span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statPill}>
                  <span className={styles.statPillLabel}>Batas Lulus</span>
                  <span className={styles.statPillVal}>{passingScore}%</span>
                </div>
              </motion.div>
            )}

            {/* Kartu Streak Berapi Hangat */}
            {phase === "done" && streak !== undefined && streak > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.05, type: "spring" }}
                className={styles.streakCard}
              >
                <div className={styles.streakFlameWrap}>
                  <StreakFlame count={streak} size={28} />
                </div>
                <div className={styles.streakInfo}>
                  <span className={styles.streakTitle}>🔥 Streak {streak} Hari Aktif!</span>
                  <span className={styles.streakSub}>Semangat belajarmu terus berkobar hari ini.</span>
                </div>
              </motion.div>
            )}

            {/* Tombol Aksi Fisik Tebal (Duolingo-Grade Tactile Buttons) */}
            {phase === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: "spring" }}
                className={styles.actions}
              >
                <Link
                  href="/belajar"
                  className={styles.btnPrimary}
                  onClick={() => soundFX.play("tap", 0.35)}
                >
                  Lanjut ke Bab Berikutnya →
                </Link>
                <div className={styles.actionRowSecondary}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      soundFX.play("tap", 0.35);
                      onShowReview();
                    }}
                  >
                    📝 Pembahasan Soal
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      soundFX.play("tap", 0.35);
                      onRestartStudy();
                    }}
                  >
                    🔄 Ulang Materi
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <div className={styles.verdict}>
            <div className={styles.notice} role="alert">
              <strong>Butuh {passingScore}% untuk lulus (kurang {gap}% lagi).</strong>
              <span>Bab berikutnya masih terkunci. Yuk coba kuisnya sekali lagi!</span>
            </div>
            {phase === "done" && (
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnPrimaryRetry}
                  onClick={() => {
                    soundFX.play("tap", 0.35);
                    onRetryQuiz();
                  }}
                >
                  Coba Kuis Lagi →
                </button>
                <div className={styles.actionRowSecondary}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      soundFX.play("tap", 0.35);
                      onShowReview();
                    }}
                  >
                    📝 Lihat Pembahasan
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      soundFX.play("tap", 0.35);
                      onRestartStudy();
                    }}
                  >
                    🔄 Pelajari Ulang
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {phase === "achievement" && newAchievements && newAchievements.length > 0 && (
        <AchievementUnlockModal
          achievements={newAchievements}
          onClose={() => setPhase(passed ? "xp" : "done")}
        />
      )}

      {phase === "streak" && streakOpen && (
        <DailyStreakCelebrationModal
          streak={streakValue}
          previousStreak={previousStreak}
          onClose={() => {
            closeStreak();
            setPhase("done");
          }}
        />
      )}
    </div>,
    document.body,
  );
}
