"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Mascot } from "./Mascot";
import { StreakFlame } from "./StreakFlame";
import { useModalBehavior } from "./useModalBehavior";
import { soundFX } from "@/lib/audio/SoundFXManager";
import styles from "./dailyStreakCelebration.module.css";

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

const EMBERS = [
  { left: "27%", bottom: "26%", rise: -48, drift: -10, delay: 0, duration: 1.7 },
  { left: "36%", bottom: "20%", rise: -62, drift: 8, delay: 0.35, duration: 2.1 },
  { left: "45%", bottom: "28%", rise: -40, drift: -6, delay: 0.7, duration: 1.5 },
  { left: "55%", bottom: "22%", rise: -58, drift: 10, delay: 0.15, duration: 1.9 },
  { left: "63%", bottom: "27%", rise: -46, drift: -8, delay: 0.55, duration: 2.2 },
  { left: "71%", bottom: "23%", rise: -54, drift: 6, delay: 0.9, duration: 1.6 },
];

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function jakartaWeekdayIndex(date = new Date()) {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(date);
  return WEEKDAY_INDEX[short] ?? 0;
}

function useRollUp(target: number, from: number, duration = 850, delay = 320) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delay;
      const progress = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, from, duration, delay]);

  return value;
}

export interface DailyStreakCelebrationModalProps {
  streak: number;
  previousStreak?: number;
  onClose: () => void;
}

export function DailyStreakCelebrationModal({ streak, previousStreak, onClose }: DailyStreakCelebrationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const safeStreak = Math.max(1, Math.round(streak));
  const startValue = Math.max(0, Math.min(previousStreak ?? safeStreak - 1, safeStreak - 1));
  const shownStreak = useRollUp(safeStreak, startValue);
  const todayIndex = useMemo(() => jakartaWeekdayIndex(), []);
  const filledFrom = Math.max(0, todayIndex - Math.max(0, safeStreak - 1));
  const filledDays = todayIndex - filledFrom + 1;

  useEffect(() => {
    setMounted(true);
    setReduceMotion(prefersReducedMotion());
  }, []);

  useModalBehavior(cardRef, onClose, false, mounted);

  useEffect(() => {
    if (!mounted) return;

    const timers: number[] = [];
    soundFX.play("fire_surge", 0.65);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([28, 45, 28]);
      } catch {}
    }

    timers.push(window.setTimeout(() => soundFX.play("cat_meow", 0.32), 430));
    for (let i = 0; i < filledDays; i++) {
      timers.push(window.setTimeout(() => soundFX.play("tap", 0.13), 540 + i * 90));
    }
    timers.push(window.setTimeout(() => soundFX.play("glockenspiel_chime", 0.45), 600 + filledDays * 90));

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [mounted, filledDays]);

  if (!mounted) return null;

  const popDelay = (index: number) => (reduceMotion ? 0 : 0.5 + index * 0.09);

  return createPortal(
    <div className={styles.overlay}>
      <motion.div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-streak-title"
        aria-describedby="daily-streak-desc"
        initial={{ opacity: 0, y: 28, scale: 0.86 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      >
        <div className={styles.miuCorner}>
          <span className={styles.miuBubble}>Nya~</span>
          <Mascot mood="senang" size={54} title="Miu tersenyum" className={styles.miuImage} />
        </div>

        <div className={styles.hero} aria-hidden="true">
          <span className={styles.rays} />
          <span className={styles.halo} />
          <motion.div
            className={styles.flameWrap}
            initial={{ scale: 0, y: 22, rotate: -10 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 12, delay: 0.08 }}
          >
            <StreakFlame count={safeStreak} size={104} />
          </motion.div>
          {!reduceMotion &&
            EMBERS.map((ember, index) => (
              <motion.span
                key={index}
                className={styles.ember}
                style={{ left: ember.left, bottom: ember.bottom }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ y: [0, ember.rise], x: [0, ember.drift], opacity: [0, 1, 0], scale: [0.5, 1, 0.15] }}
                transition={{
                  duration: ember.duration,
                  delay: ember.delay,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
        </div>

        <h2 id="daily-streak-title" className={styles.title} aria-label={`${safeStreak} hari streak`}>
          <span className={styles.counter} aria-hidden="true">
            {shownStreak}
          </span>
          <span aria-hidden="true"> Hari Streak!</span>
        </h2>

        <p className={styles.jp}>すごい！その火を絶やさないでね！</p>
        <p id="daily-streak-desc" className={styles.copy}>
          Sugoi! Pertahankan apimu!
        </p>

        <ol className={styles.week} aria-label="Streak mingguan">
          {DAY_LABELS.map((label, index) => {
            const filled = index >= filledFrom && index <= todayIndex;
            const isToday = index === todayIndex;
            const order = index - filledFrom;

            return (
              <li
                key={label}
                className={styles.day}
                data-filled={filled || undefined}
                data-today={isToday || undefined}
              >
                <span className={styles.dayLabel}>{label}</span>
                <motion.span
                  className={styles.dayCircle}
                  initial={filled ? { scale: 0.55, opacity: 0.35 } : false}
                  animate={filled ? { scale: 1, opacity: 1 } : undefined}
                  transition={
                    filled
                      ? { delay: popDelay(order), type: "spring", stiffness: 380, damping: 15 }
                      : undefined
                  }
                >
                  {filled && (
                    <motion.svg
                      className={styles.check}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ scale: 0, rotate: -28 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: popDelay(order) + (reduceMotion ? 0 : 0.12),
                        type: "spring",
                        stiffness: 520,
                        damping: 18,
                      }}
                      aria-hidden="true"
                    >
                      <path d="M5 12.5 10 17.5 19 7" />
                    </motion.svg>
                  )}
                </motion.span>
              </li>
            );
          })}
        </ol>

        <motion.button
          type="button"
          className={styles.cta}
          onClick={() => {
            soundFX.play("button_click", 0.5);
            onClose();
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.85, type: "spring", stiffness: 260, damping: 22 }}
          whileHover={reduceMotion ? undefined : { scale: 1.015 }}
          whileTap={reduceMotion ? undefined : { y: 4, scale: 0.995 }}
        >
          Lanjut Belajar
        </motion.button>
      </motion.div>
    </div>,
    document.body,
  );
}
