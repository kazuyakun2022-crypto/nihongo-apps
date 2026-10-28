"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { AdminHeaderNav } from "@/features/admin/ui/AdminHeaderNav";
import adminStyles from "@/app/(app)/admin/admin.module.css";
import styles from "./content.module.css";

/** Kerangka halaman konten admin: cek akses, judul, dan tab Pelajaran / Ujian. */
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
    { href: "/admin/konten", label: "Pelajaran", active: !pathname.startsWith("/admin/konten/ujian") && !pathname.startsWith("/admin/konten/pendaftaran") },
    { href: "/admin/konten/ujian", label: "Ujian & Tes Penempatan", active: pathname.startsWith("/admin/konten/ujian") },
    { href: "/admin/konten/pendaftaran", label: "Pendaftaran", active: pathname.startsWith("/admin/konten/pendaftaran") },
  ];
  return (
    <div className={adminStyles.container}>
      <AdminHeaderNav title={title} subtitle={subtitle} />
      <nav className={adminStyles.tabs} aria-label="Jenis konten">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={`${adminStyles.tabBtn} ${t.active ? adminStyles.tabBtnActive : ""}`}>
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

/** Pesan sukses/gagal yang hilang sendiri. */
export function useFlash() {
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);
  const node = flash ? (
    <div role="status" className={`${styles.message} ${flash.error ? styles.messageError : ""}`}>
      {flash.text}
    </div>
  ) : null;
  // Stabil antar-render supaya aman dipakai sebagai dependency useCallback/useEffect
  const ok = useCallback((text: string) => setFlash({ text }), []);
  const fail = useCallback((err: unknown) => setFlash({ text: err instanceof Error ? err.message : "Terjadi kesalahan.", error: true }), []);
  return { node, ok, fail };
}

export const STATUS_LABEL = { draft: "Draft", review: "Review", published: "Terbit" } as const;
