"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { examApi, type ReadinessResponse, type LevelUpStatus } from "../data/examApi";
import styles from "./readinessCard.module.css";

interface Props {
  levelId: number;
  levelCode: string;
}

export function ReadinessCard({ levelId, levelCode }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [status, setStatus] = useState<LevelUpStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examApi.getReadiness(levelId),
      examApi.getLevelUpStatus(levelId),
    ])
      .then(([r, s]) => { setData(r); setStatus(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [levelId]);

  if (loading || !data) return null;

  const pct = data.chaptersTotal > 0 ? Math.round((data.chaptersCompleted / data.chaptersTotal) * 100) : 0;
  const cooldownLabel = status?.cooldownUntil ? formatCooldown(new Date(status.cooldownUntil)) : null;
  const canTakeNow = data.canTakeTest && (status?.canTake ?? true);

  const readyText = data.ready === "yes" ? "✓ Siap" : data.ready === "almost" ? "~ Hampir" : "× Belum";
  const readyMod = data.ready === "yes" ? styles.chipNumSuccess : data.ready === "almost" ? styles.chipNumAccent : styles.chipNumMuted;
  const barMod = pct >= 80 ? styles.statBarFillSuccess : styles.statBarFillPrimary;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>Kesiapan Naik Tahap</span>
        <span className={styles.levelBadge}>{levelCode} → Level Berikutnya</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statBar}>
            <div className={`${styles.statBarFill} ${barMod}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.statLabel}>{data.chaptersCompleted}/{data.chaptersTotal} bab selesai</span>
        </div>
        <div className={styles.statRow}>
          <div className={styles.chip}>
            <span className={`${styles.chipNum} ${data.avgQuizScore >= 80 ? styles.chipNumSuccess : styles.chipNumMuted}`}>
              {data.avgQuizScore}%
            </span>
            <span className={styles.chipLabel}>Rata-rata kuis</span>
          </div>
          <div className={styles.chip}>
            <span className={`${styles.chipNum} ${data.weakCards < 10 ? styles.chipNumSuccess : styles.chipNumDanger}`}>
              {data.weakCards}
            </span>
            <span className={styles.chipLabel}>Kata lemah</span>
          </div>
          <div className={styles.chip}>
            <span className={`${styles.chipNum} ${readyMod}`}>{readyText}</span>
            <span className={styles.chipLabel}>Status</span>
          </div>
        </div>
      </div>

      <p className={styles.suggestion}>{data.suggestion}</p>

      {!!status?.consecutiveFails && status.consecutiveFails >= 3 && (
        <p className={styles.warning}>⚠️ Sudah {status.consecutiveFails}× gagal. Disarankan mengulang bab yang lemah dulu.</p>
      )}

      {cooldownLabel && (
        <p className={styles.cooldown}>⏳ Bisa ikut tes lagi dalam {cooldownLabel}</p>
      )}

      <button
        className={styles.testBtn}
        disabled={!canTakeNow}
        onClick={() => router.push(`/belajar/tes-naik-tahap?levelId=${levelId}`)}
      >
        {canTakeNow
          ? `Ikut Tes Naik Tahap ${levelCode}`
          : cooldownLabel
          ? `Tunggu ${cooldownLabel}`
          : "Selesaikan bab dulu"}
      </button>
    </div>
  );
}

function formatCooldown(until: Date): string {
  const diff = until.getTime() - Date.now();
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}
