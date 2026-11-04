"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { NavigatorProvider } from "@/features/navigator/application/NavigatorProvider";
import { MascotNavigator } from "@/features/navigator/ui/MascotNavigator";
import { SpotlightOverlay } from "@/features/navigator/ui/SpotlightOverlay";
import { MiuStage } from "@/features/navigator/ui/MiuStage";
import { InstallPrompt } from "./InstallPrompt";
import styles from "./shell.module.css";
import { ConfirmHost } from "@/shared/ui/confirmDialog";

const studentNav = [
  { href: "/beranda", label: "Beranda", icon: "M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" },
  { href: "/belajar", label: "Belajar", icon: "M4 5 H11 V20 H4 Z M13 5 H20 V20 H13 Z" },
  { href: "/huruf",   label: "Huruf",   icon: "M4 6 H20 M4 12 H16 M4 18 H12" },
  { href: "/ngobrol", label: "Ngobrol", icon: "M4 5 H20 V16 H10 L6 20 V16 H4 Z" },
  { href: "/kamus",   label: "Kamus",   icon: "M4 5 H20 V19 H4 Z M4 15 L9 10 L13 14 L15 12 L20 17 M15 8.5 A0.5 0.5 0 1 0 15 9.5 A0.5 0.5 0 1 0 15 8.5 Z" },
  { href: "/profil",  label: "Profil",  icon: "M12 12 A4 4 0 1 0 12 4 A4 4 0 1 0 12 12 Z M4 20 C5 15 19 15 20 20" },
];

const adminNav = [
  {
    href: "/admin",
    label: "Dashboard",
    short: "Dasbor",
    icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    short: "Akun",
    icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  },
  {
    href: "/admin/konten",
    label: "Konten",
    icon: "M4 5 H11 V20 H4 Z M13 5 H20 V20 H13 Z",
  },
  {
    href: "/admin/ai",
    label: "Konfig AI",
    short: "AI",
    icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  },
  {
    href: "/admin/pantau",
    label: "Pantau",
    icon: "M4 20 V4 M4 20 H20 M8 16 V12 M12 16 V8 M16 16 V11",
    superAdminOnly: true,
  },
  {
    href: "/ngobrol",
    label: "Uji AI",
    icon: "M4 5 H20 V16 H10 L6 20 V16 H4 Z",
  },
  {
    href: "/profil",
    label: "Profil",
    icon: "M12 12 A4 4 0 1 0 12 4 A4 4 0 1 0 12 12 Z M4 20 C5 15 19 15 20 20",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";

  const nav = isAdmin
    ? adminNav.filter((item) => !item.superAdminOnly || isSuperAdmin)
    : studentNav;
  const isChatPage = pathname.startsWith("/ngobrol") || pathname.startsWith("/suara");
  // Panel admin berisi tabel & data padat, jadi memakai seluruh lebar layar
  const isWidePage = pathname.startsWith("/admin");

  return (
    <NavigatorProvider>
      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="Menu utama">
          <span className={styles.brand}>
            <span className={styles.brandSeal} aria-hidden="true" lang="ja">
              日
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName} lang="ja">
                にほんご
              </span>
              <span className={styles.brandTag}>{isAdmin ? "Panel pengelola" : "Belajar bersama Miu-chan"}</span>
            </span>
          </span>
          <ul className={styles.navList} style={{ "--nav-cols": nav.length } as React.CSSProperties}>
            {nav.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    aria-current={active ? "page" : undefined}
                    data-spotlight={`nav-${item.href.slice(1)}`}
                  >
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                      <path d={item.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                    {/* Navigasi bawah ponsel (7 menu untuk super admin) memakai label pendek supaya tidak terpotong */}
                    {(item as { short?: string }).short ? (
                      <>
                        <span className={styles.navLabelFull}>{item.label}</span>
                        <span className={styles.navLabelShort} aria-hidden="true">
                          {(item as { short?: string }).short}
                        </span>
                      </>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className={`${styles.main} ${isChatPage ? styles.mainChat : ""} ${isWidePage ? styles.mainWide : ""}`}>
          {!isChatPage && <InstallPrompt />}
          {children}
        </main>
        {/* Miu-chan pemandu: widget melayang + sorotan (disembunyikan otomatis saat ujian) */}
        <MascotNavigator />
        <MiuStage />
        <ConfirmHost />
        <SpotlightOverlay />
      </div>
    </NavigatorProvider>
  );
}
