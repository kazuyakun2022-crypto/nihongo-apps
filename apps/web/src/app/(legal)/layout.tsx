import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./legal.module.css";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Kembali ke beranda
      </Link>
      {children}
    </main>
  );
}
