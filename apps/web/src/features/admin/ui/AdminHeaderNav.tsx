"use client";

import { PageHeader } from "@/shared/ui/PageHeader";
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
    <PageHeader
      seal="管"
      jp="管理パネル"
      title={title}
      subtitle={subtitle}
      actions={
        isSuperAdmin ? <span className={styles.superBadge}>Super Admin</span> : <span className={styles.adminBadge}>Admin</span>
      }
    />
  );
}
