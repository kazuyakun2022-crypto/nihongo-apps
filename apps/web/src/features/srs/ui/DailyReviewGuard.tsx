"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { useDailyReview } from "../application/DailyReviewContext";
import { Mascot } from "@/shared/ui/Mascot";
import styles from "./dailyReviewGuard.module.css";

export function DailyReviewGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuth();
  const { dueCount, isObligationMet, isChecking } = useDailyReview();
  const [redirecting, setRedirecting] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isReviewPage = pathname === "/review" || pathname.startsWith("/review");

  useEffect(() => {
    if (status !== "authenticated" || !user || isAdmin) return;
    if (isChecking) return;

    // Jika ada review yang jatuh tempo dan kewajiban belum selesai:
    // Pengguna diwajibkan untuk review dahulu sebelum melanjutkan ke layar lain!
    if (!isObligationMet && dueCount !== null && dueCount > 0) {
      if (!isReviewPage) {
        setRedirecting(true);
        router.replace("/review");
      } else {
        setRedirecting(false);
      }
    } else {
      setRedirecting(false);
    }
  }, [status, user, isAdmin, isChecking, isObligationMet, dueCount, isReviewPage, router]);

  // Akun belum siap atau admin: teruskan tanpa hambatan
  if (status !== "authenticated" || !user || isAdmin) {
    return <>{children}</>;
  }

  // Jika sedang di halaman review, tampilkan langsung
  if (isReviewPage) {
    return <>{children}</>;
  }

  // Jika sedang memeriksa pertama kali pada hari itu
  if (isChecking && dueCount === null) {
    return (
      <div className={styles.loadingScreen}>
        <Mascot mood="berpikir" size={72} />
        <p className={styles.loadingText}>Menyiapkan sesi belajar hari ini…</p>
      </div>
    );
  }

  // Jika ada kewajiban review hari ini dan sedang dialihkan ke /review
  if (!isObligationMet && dueCount !== null && dueCount > 0) {
    return (
      <div className={styles.redirectScreen}>
        <Mascot mood="semangat" size={84} />
        <span className={styles.redirectBadge}>
          <span className={styles.redirectDot} aria-hidden="true" />
          Kewajiban Harian
        </span>
        <h2 className={styles.redirectTitle}>Review Kosakata Wajib</h2>
        <p className={styles.redirectText}>
          Ada <strong>{dueCount} kosakata</strong> yang jatuh tempo hari ini. Mengalihkan ke sesi review sebelum membuka fitur lainnya…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

