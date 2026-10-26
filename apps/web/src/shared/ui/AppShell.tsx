"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { InstallPrompt } from "./InstallPrompt";
import styles from "./shell.module.css";

const studentNav = [
  { href: "/beranda", label: "Beranda", icon: "M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" },
  { href: "/belajar", label: "Belajar", icon: "M4 5 H11 V20 H4 Z M13 5 H20 V20 H13 Z" },
  { href: "/huruf",   label: "Huruf",   icon: "M4 6 H20 M4 12 H16 M4 18 H12" },
  { href: "/ngobrol", label: "Ngobrol", icon: "M4 5 H20 V16 H10 L6 20 V16 H4 Z" },
  { href: "/review",  label: "Review",  icon: "M6 4 H18 V20 H6 Z M9 9 H15 M9 13 H15" },
  { href: "/profil",  label: "Profil",  icon: "M12 12 A4 4 0 1 0 12 4 A4 4 0 1 0 12 12 Z M4 20 C5 15 19 15 20 20" },
];

const adminNav = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  },
  {
    href: "/admin/ai",
    label: "Konfig AI",
    icon: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
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

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Menu utama">
        <span className={styles.brand} lang="ja">
          にほんご
        </span>
        <ul className={styles.navList} style={{ "--nav-cols": nav.length } as React.CSSProperties}>
          {nav.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} aria-current={active ? "page" : undefined}>
                  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                    <path d={item.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className={`${styles.main} ${isChatPage ? styles.mainChat : ""}`}>
        {!isChatPage && <InstallPrompt />}
        {children}
      </main>
    </div>
  );
}
