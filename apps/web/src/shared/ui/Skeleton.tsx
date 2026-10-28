import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

type Length = number | string;
const toCss = (v?: Length) => (typeof v === "number" ? `${v}px` : v);

interface SkeletonProps {
  width?: Length;
  height?: Length;
  radius?: Length;
  circle?: boolean;
  onColor?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Satu balok shimmer. Tinggi default = satu baris teks (1em). */
export function Skeleton({ width, height, radius, circle, onColor, className, style }: SkeletonProps) {
  const size = circle ? toCss(width ?? height) : undefined;
  return (
    <span
      aria-hidden="true"
      className={[styles.bone, onColor && styles.onColor, className].filter(Boolean).join(" ")}
      style={{
        width: size ?? toCss(width),
        height: size ?? toCss(height),
        borderRadius: circle ? "50%" : toCss(radius),
        ...style,
      }}
    />
  );
}

/** Beberapa baris teks; baris terakhir lebih pendek seperti paragraf asli. */
export function SkeletonText({ lines = 3, lastWidth = "60%", onColor }: { lines?: number; lastWidth?: Length; onColor?: boolean }) {
  return (
    <span className={styles.text} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={lines > 1 && i === lines - 1 ? lastWidth : "100%"} onColor={onColor} />
      ))}
    </span>
  );
}

/** Pembungkus area yang sedang dimuat: pembaca layar mendengar label, bukan balok-baloknya. */
export function SkeletonRegion({
  label = "Memuat…",
  className,
  style,
  children,
}: {
  label?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" className={className} style={style}>
      <span className={styles.srOnly}>{label}</span>
      {children}
    </div>
  );
}

export function SkeletonCard({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}

/** Baris-baris <tr> untuk tbody tabel yang sedang dimuat. */
export function SkeletonTableRows({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c}>
              <Skeleton width={c === 0 ? "75%" : `${45 + ((r + c) % 3) * 15}%`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Kerangka halaman umum: judul, dua kartu ringkasan, lalu daftar. Dipakai saat route/sesi belum siap. */
export function PageSkeleton({ label = "Memuat halaman…" }: { label?: string }) {
  return (
    <SkeletonRegion label={label} className={styles.page}>
      <div className={styles.stack}>
        <Skeleton width="7rem" height="0.875rem" />
        <Skeleton width="min(16rem, 70%)" height="2rem" />
      </div>
      <Skeleton height="9rem" radius="var(--radius-lg)" />
      <div className={styles.pageGrid}>
        {[0, 1].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton width="40%" height="1.25rem" />
            <SkeletonText lines={3} />
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.row}>
            <Skeleton circle width={40} />
            <div className={styles.stack} style={{ flex: 1, gap: "var(--space-2)" }}>
              <Skeleton width="55%" />
              <Skeleton width="30%" height="0.75rem" />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </SkeletonRegion>
  );
}
