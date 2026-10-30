"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { examApi, type ExamStatus, type ReadinessResponse } from "../data/examApi";
import { masteryGateApi } from "../data/masteryGateApi";
import styles from "./readinessCard.module.css";

interface Props {
  levelId: number;
  levelCode: string;
  /** Level tertinggi: tes menjadi Ujian Kelulusan Akhir kurikulum, bukan naik level. */
  final?: boolean;
}

export function ReadinessCard({ levelId, levelCode, final = false }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Level Pemula (Pre-N5) naik lewat Mastery Gate hiragana, bukan tes naik tahap biasa
  const isPreN5 = levelCode === "PEMULA";

  useEffect(() => {
    const statusFor = isPreN5
      ? masteryGateApi.status().then((g): Pick<ExamStatus, "canTake" | "cooldownUntil" | "consecutiveFails"> => ({ canTake: g.canTake, cooldownUntil: g.cooldownUntil, consecutiveFails: 0 }))
      : examApi.getStatus("level-up", levelId);
    Promise.all([examApi.getReadiness(levelId), statusFor])
      .then(([r, s]) => { setData(r); setStatus(s as ExamStatus); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [levelId, isPreN5]);

  if (loading) {
    return (
      <SkeletonRegion label="Memuat kesiapan naik tahap…" className={styles.card}>
        <div className={styles.header}>
          <Skeleton width="10rem" />
          <Skeleton width="8rem" height="1.5rem" radius="var(--radius-pill)" />
        </div>
        <div className={styles.stats}>
          <Skeleton height="0.5rem" radius="var(--radius-pill)" />
          <div className={styles.statRow}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height="3.5rem" radius="var(--radius-md)" style={{ flex: 1 }} />
            ))}
          </div>
        </div>
        <Skeleton height="3rem" radius="var(--radius-pill)" />
      </SkeletonRegion>
    );
  }
  if (!data) return null;

  const pct = data.chaptersTotal > 0 ? Math.round((data.chaptersCompleted / data.chaptersTotal) * 100) : 0;
  const cooldownLabel = status?.cooldownUntil ? formatCooldown(new Date(status.cooldownUntil)) : null;
  const canTakeNow = data.canTakeTest && (status?.canTake ?? true);

  const readyText = data.ready === "yes" ? "✓ Siap" : data.ready === "almost" ? "~ Hampir" : "× Belum";
  const readyMod = data.ready === "yes" ? styles.chipNumSuccess : data.ready === "almost" ? styles.chipNumAccent : styles.chipNumMuted;
  const barMod = pct >= 80 ? styles.statBarFillSuccess : styles.statBarFillPrimary;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.label}>{final ? "Kesiapan Ujian Kelulusan" : "Kesiapan Naik Tahap"}</span>
        <span className={styles.levelBadge}>{final ? `${levelCode} → Lulus Kurikulum` : `${levelCode} → Level Berikutnya`}</span>
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
        <p className={styles.warning}>Perhatian: Sudah {status.consecutiveFails}× belum lulus. Disarankan mengulang bab yang lemah dulu.</p>
      )}

      {cooldownLabel && (
        <p className={styles.cooldown}>Bisa ikut tes lagi dalam {cooldownLabel}</p>
      )}

      <button
        className={styles.testBtn}
        disabled={!canTakeNow}
        onClick={() => router.push(isPreN5 ? "/belajar/gerbang-hiragana" : `/belajar/tes-naik-tahap?levelId=${levelId}${final ? "&final=1" : ""}`)}
      >
        {canTakeNow
          ? isPreN5
            ? "Ikut Mastery Gate Hiragana"
            : final
              ? `Ikut Ujian Kelulusan ${levelCode}`
              : `Ikut Tes Naik Tahap ${levelCode}`
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
