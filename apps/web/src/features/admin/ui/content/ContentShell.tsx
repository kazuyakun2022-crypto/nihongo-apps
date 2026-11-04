"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import styles from "./content.module.css";
import { CloseIcon } from "@/shared/ui/icons";

/** Kerangka halaman konten admin: cek akses, judul, dan tab Pelajaran / Ujian / Kamus / Pendaftaran. */
export function ContentShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
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
      href: "/admin/konten",
      label: "Pelajaran",
      active: !["/admin/konten/ujian", "/admin/konten/pendaftaran", "/admin/konten/kamus", "/admin/konten/skenario"].some((p) => pathname.startsWith(p)),
    },
    { href: "/admin/konten/skenario", label: "Skenario AI", active: pathname.startsWith("/admin/konten/skenario") },
    { href: "/admin/konten/ujian", label: "Ujian & Tes Penempatan", active: pathname.startsWith("/admin/konten/ujian") },
    { href: "/admin/konten/kamus", label: "Kamus", active: pathname.startsWith("/admin/konten/kamus") },
    { href: "/admin/konten/pendaftaran", label: "Pendaftaran", active: pathname.startsWith("/admin/konten/pendaftaran") },
  ];
  return (
    <div className={adminStyles.container}>
      <AdminHeaderNav title={title} subtitle={subtitle} />
      <nav className={`${adminStyles.tabs} ${styles.wrapTabs}`} aria-label="Jenis konten">
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

/**
 * Pesan sukses (hilang sendiri setelah 4 detik) dan galat (menetap sampai ditutup, supaya galat pemuatan
 * tidak lenyap lalu berganti kerangka yang berputar selamanya).
 */
export function useFlash() {
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!flash || flash.error) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);
  const node = flash ? (
    <div role={flash.error ? "alert" : "status"} className={`${styles.message} ${flash.error ? styles.messageError : ""}`}>
      <span>{flash.text}</span>
      {flash.error && (
        <button type="button" className={styles.messageClose} onClick={() => setFlash(null)} aria-label="Tutup pesan">
          <CloseIcon size={14} strokeWidth={2.6} />
        </button>
      )}
    </div>
  ) : null;
  // Stabil antar-render supaya aman dipakai sebagai dependency useCallback/useEffect
  const ok = useCallback((text: string) => setFlash({ text }), []);
  const fail = useCallback((err: unknown) => setFlash({ text: err instanceof Error ? err.message : "Terjadi kesalahan.", error: true }), []);
  return { node, ok, fail };
}

export const STATUS_LABEL = { draft: "Draft", review: "Review", published: "Terbit" } as const;
