"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/application/AuthProvider";
import styles from "./adminNotice.module.css";

interface AdminLearnerNoticeProps {
  featureName?: string;
}

export function AdminLearnerNotice({ featureName = "Jalur Belajar Siswa" }: AdminLearnerNoticeProps) {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper} aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>

      <span className={styles.badge}>
        {isSuper ? "Super Administrator" : "Administrator"}
      </span>

      <h2 className={styles.title}>{featureName}</h2>

      <p className={styles.description}>
        Halo <strong>{user?.displayName ?? "Admin"}</strong>. Akun dengan peran{" "}
        <strong>{isSuper ? "Super Admin" : "Admin"}</strong> difokuskan untuk tata kelola sistem, manajemen pengguna, konfigurasi AI, dan pemantauan platform.
        <br />
        Fitur kurikulum bab, kuis, dan latihan SRS ini dikhususkan bagi akun siswa.
      </p>

      <div className={styles.actions}>
        <Link href="/admin" className={styles.primaryBtn}>
          <span>Buka Dashboard Admin</span>
        </Link>
        <Link href="/ngobrol" className={styles.secondaryBtn}>
          <span>Uji Percakapan dengan Maskot AI</span>
        </Link>
      </div>
    </div>
  );
}
