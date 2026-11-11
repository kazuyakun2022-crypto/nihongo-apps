"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { NavigatorProvider } from "@/features/navigator/application/NavigatorProvider";
import { MascotNavigator } from "@/features/navigator/ui/MascotNavigator";
import { SpotlightOverlay } from "@/features/navigator/ui/SpotlightOverlay";
import { MiuStage } from "@/features/navigator/ui/MiuStage";
import { InstallPrompt } from "./InstallPrompt";
import { NotificationBell } from "@/features/notifications/ui/NotificationBell";
import { InAppNotificationBanner } from "@/features/notifications/ui/InAppNotificationBanner";
import styles from "./shell.module.css";
import { ConfirmHost } from "@/shared/ui/confirmDialog";
import { soundFX } from "@/lib/audio/SoundFXManager";
import {
  ArrowLeftIcon,
  SidebarToggleIcon,
  NavHomeIcon,
  NavLearnIcon,
  NavChatIcon,
  NavProfileIcon,
  ChunkyLearnIcon,
  ChunkyReviewIcon,
  ChunkyProfileIcon,
  DashboardIcon,
  UsersIcon,
  BookOpenIcon,
  ImageIcon,
  BotIcon,
  TrendingUpIcon,
  type IconProps,
} from "@/shared/ui/icons";

function useSidebarCollapse() {
  // Desktop terbuka secara bawaan (muncul), menimpa konten tanpa menggeser.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nihongo_sidebar_collapsed_v4");
      if (saved === "1") setCollapsed(true);
      else if (saved === "0") setCollapsed(false);
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nihongo_sidebar_collapsed_v4", next ? "1" : "0");
      } catch {
        // Abaikan jika localStorage gagal
      }
      return next;
    });
  };

  return [collapsed, toggle] as const;
}

interface NavItem {
  href: string;
  label: string;
  short?: string;
  superAdminOnly?: boolean;
  Icon: React.ComponentType<IconProps>;
}

const studentNav: NavItem[] = [
  { href: "/beranda", label: "Beranda", Icon: NavHomeIcon },
  { href: "/belajar", label: "Belajar", Icon: ChunkyLearnIcon },
  { href: "/review",  label: "Review",  Icon: ChunkyReviewIcon },
  { href: "/ngobrol", label: "Ngobrol", Icon: NavChatIcon },
  { href: "/profil",  label: "Profil",  Icon: ChunkyProfileIcon },
];

function getParentRoute(pathname: string, isAdmin: boolean): string | null {
  if (pathname.startsWith("/profil/")) return "/profil";
  if (pathname.startsWith("/belajar/")) return "/belajar";
  if (pathname.startsWith("/ngobrol/skenario/")) return "/ngobrol?tab=skenario";
  if (pathname.startsWith("/simulasi/")) return "/simulasi";
  if (pathname.startsWith("/admin/materi/")) return "/admin/materi";
  if (pathname.startsWith("/admin/pengguna/")) return "/admin/pengguna";
  if (pathname.startsWith("/admin/pantau/")) return "/admin/pantau";
  if (pathname.startsWith("/admin/") && pathname !== "/admin" && pathname !== "/admin/ringkasan") return "/admin";
  if (pathname === "/notifikasi") return "/beranda";
  if (pathname === "/scan") return "/beranda";
  if (pathname === "/review") return "/beranda";
  return null;
}

const adminNav: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    short: "Dasbor",
    Icon: DashboardIcon,
  },
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    short: "Akun",
    Icon: UsersIcon,
  },
  {
    href: "/admin/materi",
    label: "Materi",
    short: "Materi",
    Icon: BookOpenIcon,
  },
  {
    href: "/admin/konten",
    label: "Konten",
    short: "Konten",
    Icon: ImageIcon,
  },
  {
    href: "/admin/ai",
    label: "Konfig AI",
    short: "AI",
    Icon: BotIcon,
  },
  {
    href: "/admin/pantau",
    label: "Pantau",
    Icon: TrendingUpIcon,
    superAdminOnly: true,
  },
  {
    href: "/ngobrol",
    label: "Uji AI",
    Icon: NavChatIcon,
  },
  {
    href: "/profil",
    label: "Profil",
    Icon: NavProfileIcon,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.role === "super_admin";
  const parentRoute = getParentRoute(pathname, isAdmin);

  const handleTopBarBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else if (parentRoute) {
      router.push(parentRoute);
    }
  };

  const nav = isAdmin
    ? adminNav.filter((item) => !item.superAdminOnly || isSuperAdmin)
    : studentNav;
  const isChatPage = pathname.startsWith("/ngobrol") || pathname.startsWith("/suara");
  // Panel admin berisi tabel & data padat, jadi memakai seluruh lebar layar
  const isWidePage = pathname.startsWith("/admin");
  const [collapsed, toggleSidebar] = useSidebarCollapse();

  return (
    <NavigatorProvider>
      <div className={`${styles.shell} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <nav className={styles.nav} aria-label="Menu utama">
          <span className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/app-icon.png" alt="日本語" className={styles.brandLogoImg} />
            <span className={styles.brandText}>
              <span className={styles.brandName} lang="ja">
                日本語
              </span>
              <span className={styles.brandTag}>{isAdmin ? "Panel pengelola" : "Belajar bersama Miu-chan"}</span>
            </span>
          </span>
          <ul className={styles.navList} style={{ "--nav-cols": nav.length } as React.CSSProperties}>
            {nav.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const NavIcon = item.Icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    title={item.label}
                    data-spotlight={`nav-${item.href.slice(1)}`}
                    onClick={() => soundFX.play("tap", 0.35)}
                  >
                    <span className={styles.navIconWrap}>
                      <NavIcon size={24} strokeWidth={active ? 2.8 : 2.2} active={active} filled={active} />
                    </span>
                    {/* Nama layar: terlihat jelas di ponsel maupun sidebar desktop */}
                    <span className={styles.navLabel}>
                      {(item as { short?: string }).short ? (
                        <>
                          <span className={styles.navLabelFull}>{item.label}</span>
                          <span className={styles.navLabelShort} aria-hidden="true">
                            {(item as { short?: string }).short}
                          </span>
                        </>
                      ) : (
                        <span className={styles.navLabelText}>{item.label}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

        </nav>

        {/* Tombol panah setengah lingkaran — di LUAR nav agar tidak ikut translateX saat collapsed */}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Buka menu samping" : "Sembunyikan menu samping"}
          title={collapsed ? "Buka menu samping" : "Sembunyikan menu samping"}
        >
          <span className={styles.collapseIconWrap}>
            <SidebarToggleIcon size={20} strokeWidth={2.4} />
          </span>
        </button>
        {/* Bilah atas terpadu: logo aplikasi, judul halaman aktif, & akses lonceng notifikasi */}
        {!isChatPage && (
          <header className={styles.topBar}>
            <div className={styles.topBarInner}>
              <div className={styles.topBarLeft}>
                {parentRoute && (
                  <button
                    type="button"
                    className={styles.topBarBackBtn}
                    onClick={handleTopBarBack}
                    aria-label="Kembali ke layar sebelumnya"
                    title="Kembali"
                  >
                    <ArrowLeftIcon size={16} strokeWidth={2.4} />
                    <span className={styles.topBarBackLabel}>Kembali</span>
                  </button>
                )}
                <Link href={isAdmin ? "/admin" : "/beranda"} className={styles.topBarBrand} title="Ke Beranda">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/app-icon.png" alt="日本語" className={styles.topBarLogoImg} />
                  <span className={styles.topBarBrandText}>
                    <span className={styles.topBarName} lang="ja">
                      日本語
                    </span>
                    <span className={styles.topBarTag}>
                      {isAdmin ? "Panel pengelola" : "Belajar bersama Miu-chan"}
                    </span>
                  </span>
                </Link>
              </div>

              <div className={styles.topBarActions}>
                {isAdmin && (
                  <span className={isSuperAdmin ? styles.topBarSuperBadge : styles.topBarAdminBadge}>
                    {isSuperAdmin ? "Super Admin" : "Admin"}
                  </span>
                )}
                <NotificationBell inline />
              </div>
            </div>
          </header>
        )}

        <main className={`${styles.main} ${isChatPage ? styles.mainChat : ""} ${isWidePage ? styles.mainWide : ""}`}>
          {children}
        </main>
        {/* Miu-chan pemandu: widget melayang + sorotan (disembunyikan otomatis saat ujian) */}
        <MascotNavigator />
        <MiuStage />
        <ConfirmHost />
        <SpotlightOverlay />
        <InAppNotificationBanner />
        {!isChatPage && <InstallPrompt />}
      </div>
    </NavigatorProvider>
  );
}
