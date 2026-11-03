"use client";

import { useAuth } from "@/features/auth/application/AuthProvider";
import styles from "@/app/(app)/admin/admin.module.css";

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
}

export function AdminHeaderNav({ title, subtitle }: AdminPageHeaderProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <div>
          <span className={styles.titleJa} lang="ja">
            管理パネル
          </span>
          <h1 className={styles.title}>{title}</h1>
        </div>
        {/* Peran saja; status "Sistem Operasional" dihapus karena tidak pernah memeriksa apa pun */}
        {isSuperAdmin ? (
          <span className={styles.superBadge}>Super Admin</span>
        ) : (
          <span className={styles.adminBadge}>Admin</span>
        )}
      </div>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  );
}
