"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps } from "react";

type Navigate = (href: string, opts?: { replace?: boolean }) => void;

const NavigateContext = createContext<Navigate | null>(null);

/**
 * Perpindahan halaman yang dianimasikan lewat View Transitions API.
 * Snapshot halaman lama ditahan sampai halaman baru ter-render, lalu browser memadukan keduanya
 * (gaya animasinya ada di globals.css). Browser tanpa dukungan langsung pindah seperti biasa.
 */
export function ViewTransitions({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const finish = useRef<(() => void) | null>(null);

  useEffect(() => {
    const done = finish.current;
    finish.current = null;
    // Satu frame agar gambar di halaman baru sempat tergambar sebelum snapshot barunya diambil
    if (done) requestAnimationFrame(() => done());
  }, [pathname]);

  const navigate = useCallback<Navigate>(
    (href, opts) => {
      const go = () => (opts?.replace ? router.replace(href) : router.push(href));
      const url = new URL(href, window.location.href);
      const canAnimate =
        typeof document.startViewTransition === "function" &&
        url.origin === window.location.origin &&
        url.pathname !== window.location.pathname &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!canAnimate) {
        go();
        return;
      }
      // Penanda agar animasi masuk CSS di halaman tujuan tidak dobel dengan animasi transisi
      const root = document.documentElement;
      root.dataset.navTransition = "";
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            finish.current?.();
            finish.current = resolve;
            go();
            // Jaga-jaga halaman tujuan lambat: jangan bekukan layar terlalu lama
            setTimeout(resolve, 1200);
          }),
      );
      transition.finished.finally(() => delete root.dataset.navTransition);
    },
    [router],
  );

  return <NavigateContext.Provider value={navigate}>{children}</NavigateContext.Provider>;
}

/** Pengganti `next/link` yang memakai transisi halaman; klik dengan modifier (tab baru, dll.) tetap normal. */
export function TransitionLink({ href, replace, onClick, ...props }: ComponentProps<typeof Link>) {
  const navigate = useContext(NavigateContext);
  return (
    <Link
      href={href}
      replace={replace}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !navigate || typeof href !== "string") return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || props.target === "_blank") return;
        e.preventDefault();
        navigate(href, { replace });
      }}
    />
  );
}
