"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import styles from "./content.module.css";

/**
 * Kerangka halaman materi & kurikulum belajar administrator:
 * Mengelola Pelajaran (Bab & Level N5–N1), Ujian & Tes Penempatan, Kamus, Pendaftaran, dan Skenario AI.
 */
export function MateriShell({
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/beranda");
  }, [user, isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className={adminStyles.container}>
        <p className={adminStyles.emptyState}>Memeriksa hak akses administrator...</p>
      </div>
    );
  }

  const tabs = [
    {
      href: "/admin/materi",
      label: "Pelajaran",
      active:
        pathname === "/admin/materi" ||
        pathname.startsWith("/admin/materi/bab") ||
        pathname === "/admin/konten" && !pathname.includes("banner"),
    },
    {
      href: "/admin/materi/ujian",
      label: "Ujian & Tes Penempatan",
      active: pathname.startsWith("/admin/materi/ujian"),
    },
    {
      href: "/admin/materi/kamus",
      label: "Kamus",
      active: pathname.startsWith("/admin/materi/kamus"),
    },
    {
      href: "/admin/materi/pendaftaran",
      label: "Pendaftaran",
      active: pathname.startsWith("/admin/materi/pendaftaran"),
    },
    {
      href: "/admin/materi/skenario",
      label: "Skenario AI",
      active: pathname.startsWith("/admin/materi/skenario"),
    },
  ];

  return (
    <div className={adminStyles.container}>
      <nav className={`${adminStyles.tabs} ${styles.wrapTabs}`} aria-label="Jenis materi belajar">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`${adminStyles.tabBtn} ${t.active ? adminStyles.tabBtnActive : ""}`}
            aria-current={t.active ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

