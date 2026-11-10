"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AchievementBadge } from "./AchievementBadge";
import styles from "./achievementUnlockModal.module.css";

export interface UnlockedAchievement {
  code: string;
  name: string;
  description?: string | null;
}

export interface AchievementUnlockModalProps {
  achievements: UnlockedAchievement[];
  onClose: () => void;
}

export function AchievementUnlockModal({ achievements, onClose }: AchievementUnlockModalProps) {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !achievements || achievements.length === 0) return null;

  const current = achievements[index];
  if (!current) return null;

  const hasNext = index < achievements.length - 1;

  const handleNext = () => {
    if (hasNext) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="achievement-title">
      <div className={styles.modalCard}>
        <div className={styles.sunburst} aria-hidden="true" />

        <div className={styles.badgeWrap}>
          <AchievementBadge code={current.code} earned={true} size={108} />
        </div>

        <span className={styles.pillBadge}>
          🏆 Lencana Terbuka {achievements.length > 1 ? `(${index + 1}/${achievements.length})` : ""}
        </span>

        <h3 id="achievement-title" className={styles.title}>
          {current.name}
        </h3>

        <p className={styles.desc}>
          {current.description || "Selamat! Kamu berhasil membuka lencana baru dalam petualangan belajarmu."}
        </p>

        <button type="button" className={styles.btnClaim} onClick={handleNext}>
          {hasNext ? "Lihat Lencana Berikutnya →" : "Keren, Terima Kasih! 🎉"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
