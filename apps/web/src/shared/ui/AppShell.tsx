"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstallPrompt } from "./InstallPrompt";
import styles from "./shell.module.css";

const nav = [
  { href: "/beranda", label: "Beranda", icon: "M4 11 L12 4 L20 11 V20 H14 V14 H10 V20 H4 Z" },
  { href: "/belajar", label: "Belajar", icon: "M4 5 H11 V20 H4 Z M13 5 H20 V20 H13 Z" },
  { href: "/huruf",   label: "Huruf",   icon: "M4 6 H20 M4 12 H16 M4 18 H12" },
  { href: "/ngobrol", label: "Ngobrol", icon: "M4 5 H20 V16 H10 L6 20 V16 H4 Z" },
  { href: "/review",  label: "Review",  icon: "M6 4 H18 V20 H6 Z M9 9 H15 M9 13 H15" },
  { href: "/profil",  label: "Profil",  icon: "M12 12 A4 4 0 1 0 12 4 A4 4 0 1 0 12 12 Z M4 20 C5 15 19 15 20 20" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Menu utama">
        <span className={styles.brand} lang="ja">
          にほんご
        </span>
        <ul className={styles.navList}>
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
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
      <main className={styles.main}>
        <InstallPrompt />
        {children}
      </main>
    </div>
  );
}
