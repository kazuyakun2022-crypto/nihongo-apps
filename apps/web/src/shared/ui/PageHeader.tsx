import type { ReactNode } from "react";
import styles from "./pageHeader.module.css";

export interface PageHeaderProps {
  /** Satu kanji di cap merah (hanko), mis. 学 untuk Belajar. */
  seal: string;
  /** Label Jepang kecil di samping cap, mis. べんきょう. */
  jp: string;
  title: string;
  subtitle?: ReactNode;
  /** Tombol/kontrol di kanan judul (turun ke bawah di ponsel). */
  actions?: ReactNode;
  /** Kanji besar samar di latar; bawaan = seal. */
  watermark?: string;
  className?: string;
}

/** Kepala halaman bernuansa Jepang: cap hanko, label Jepang, judul mincho, garis rambut emas. */
export function PageHeader({ seal, jp, title, subtitle, actions, watermark, className }: PageHeaderProps) {
  return (
    <header className={[styles.header, className].filter(Boolean).join(" ")}>
      <span className={styles.watermark} aria-hidden="true" lang="ja">
        {watermark ?? seal}
      </span>
      <div className={styles.text}>
        <p className={styles.eyebrow}>
          <span className={styles.seal} aria-hidden="true" lang="ja">
            {seal}
          </span>
          <span lang="ja">{jp}</span>
        </p>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
