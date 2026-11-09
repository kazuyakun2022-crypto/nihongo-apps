"use client";

import React, { useId } from "react";
import Link from "next/link";
import styles from "./streakFlame.module.css";

export interface StreakFlameProps {
  /** Jumlah hari streak berturut-turut. Jika > 0, api berkobar & bergerak. */
  count?: number;
  /** Ukuran lebar ikon api dalam px (default: 22). */
  size?: number;
  /** Kelas CSS tambahan untuk ikon/pembungkus. */
  className?: string;
  /** Apakah streak dianggap aktif secara paksa (default: count > 0). */
  active?: boolean;
}

export function StreakFlame({
  count = 0,
  size = 22,
  className = "",
  active = count > 0,
}: StreakFlameProps) {
  const rawId = useId();
  const gradId = `flame_${rawId.replace(/[:]/g, "")}`;

  const height = Math.round((size * 42) / 34);

  return (
    <span
      className={`${styles.flameWrapper} ${active ? styles.flameActive : styles.flameDormant} ${className}`}
      style={{ width: size, height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 34 42"
        width={size}
        height={height}
        className={styles.flameSvg}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradasi Api Luar: Merah Crimson ke Oranye Terang */}
          <linearGradient id={`${gradId}_outer`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="35%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>

          {/* Gradasi Api Tengah: Oranye ke Emas */}
          <linearGradient id={`${gradId}_mid`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Gradasi Inti Api: Emas ke Putih Bersinar */}
          <linearGradient id={`${gradId}_core`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Gradasi Api Padam: Abu-abu redup */}
          <linearGradient id={`${gradId}_dormant`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>

        {/* 1. Lapisan Api Luar (Menjilat & Bergoyang) */}
        <path
          className={`${styles.flameLayer} ${active ? styles.flameOuter : ""}`}
          d="M17 1 C17 1 22 7.5 22 13.5 C22 15 21.6 16.3 21 17.5 C23 16 24.5 13.5 25 10.5 C27.5 14.5 29 19 29 23.5 C29 31.2 23.6 37.5 17 37.5 C10.4 37.5 5 31.2 5 23.5 C5 17.8 8.5 12.8 13.5 10.5 C13 13 14.2 15.6 16.5 17 C16.8 14.5 16 8 17 1 Z"
          fill={active ? `url(#${gradId}_outer)` : `url(#${gradId}_dormant)`}
        />

        {/* 2. Lapisan Lidah Api Tengah (Berkobar) */}
        {active && (
          <path
            className={`${styles.flameLayer} ${styles.flameMid}`}
            d="M17 9.5 C17 9.5 20 14.5 20 18.5 C20 20.5 19 22 18 23 C19.5 21.5 20.5 20 21 18 C22.5 21 23 24 23 26.5 C23 31 20.3 34.5 17 34.5 C13.7 34.5 11 31 11 26.5 C11 22.5 13.2 19 16 17.5 C15.5 19.3 16.2 21 17.5 21.5 C17 18.5 16.5 13.5 17 9.5 Z"
            fill={`url(#${gradId}_mid)`}
          />
        )}

        {/* 3. Inti Api Panas (Putih Bersinar) */}
        {active && (
          <path
            className={`${styles.flameLayer} ${styles.flameCore}`}
            d="M17 19.5 C17 19.5 19 23 19 25.5 C19 28 18.2 30.5 17 31.5 C15.8 30.5 15 28 15 25.5 C15 23 17 19.5 17 19.5 Z"
            fill={`url(#${gradId}_core)`}
          />
        )}

        {/* 4. Percikan Bara Api Melayang */}
        {active && (
          <>
            <circle className={`${styles.spark} ${styles.spark1}`} cx="23" cy="11" r="1.3" fill="#fef08a" />
            <circle className={`${styles.spark} ${styles.spark2}`} cx="10" cy="16" r="1.1" fill="#fed7aa" />
            <circle className={`${styles.spark} ${styles.spark3}`} cx="18" cy="5" r="0.9" fill="#fef08a" />
          </>
        )}
      </svg>
    </span>
  );
}

export interface StreakBadgeProps {
  /** Jumlah hari streak berturut-turut. */
  count: number;
  /** Teks label opsional di samping angka (default: 'Hari'). */
  unitLabel?: string;
  /** Tautan href jika dapat diklik (misal /profil atau /beranda). */
  href?: string;
  /** Ukuran ikon api dalam px. Default 20. */
  flameSize?: number;
  className?: string;
  title?: string;
}

/**
 * Komponen Kapsul Badge Streak interaktif:
 * Menampilkan ikon api yang berkobar dan bergoyang saat aktif, lengkap dengan jumlah hari.
 */
export function StreakBadge({
  count = 0,
  unitLabel = "Hari",
  href,
  flameSize = 20,
  className = "",
  title,
}: StreakBadgeProps) {
  const active = count > 0;
  const badgeTitle =
    title ||
    (active
      ? `Streak ${count} ${unitLabel} Aktif! Belajar hari ini agar apimu terus berkobar 🔥`
      : "Streak belum dimulai. Belajar hari ini untuk menyalakan api streak-mu!");

  const content = (
    <>
      <StreakFlame count={count} size={flameSize} active={active} />
      <span className={styles.streakBadgeCount}>{count}</span>
      {unitLabel && <span className={styles.streakBadgeLabel}>{unitLabel}</span>}
    </>
  );

  const combinedClass = `${styles.streakBadge} ${
    active ? styles.streakBadgeActive : styles.streakBadgeDormant
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClass} title={badgeTitle} aria-label={badgeTitle}>
        {content}
      </Link>
    );
  }

  return (
    <span className={combinedClass} title={badgeTitle} aria-label={badgeTitle}>
      {content}
    </span>
  );
}
