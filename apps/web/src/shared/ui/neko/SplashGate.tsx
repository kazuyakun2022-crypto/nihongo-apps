"use client";

import { useState, type ReactNode } from "react";
import { SplashScreen } from "./SplashScreen";

/**
 * Flag memori global runtime:
 * Splash hanya tayang 1 kali saat aplikasi baru pertama dibuka (cold start / PWA launch).
 * Navigasi antar halaman di dalam aplikasi maupun reload dalam sesi yang sama tidak akan memicu splash berulang.
 */
let hasShownSplashInApp = false;

function markSplashSeen() {
  hasShownSplashInApp = true;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("neko:splash-seen", "1");
      // Session cookie: terhapus otomatis saat jendela browser / PWA ditutup
      document.cookie = "neko_splash_seen=1; path=/; SameSite=Lax";
    } catch {
      /* storage tidak tersedia */
    }
  }
}

function checkClientSeen(): boolean {
  if (hasShownSplashInApp) return true;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem("neko:splash-seen") === "1") {
        hasShownSplashInApp = true;
        return true;
      }
      if (document.cookie.split("; ").some((c) => c.startsWith("neko_splash_seen=1"))) {
        hasShownSplashInApp = true;
        return true;
      }
    } catch {
      /* storage tidak tersedia */
    }
  }
  return false;
}

export interface SplashGateProps {
  children: ReactNode;
  /** Nilai awal dari cookie sesi server (jika ada). */
  initialSeen?: boolean;
}

export function SplashGate({ children, initialSeen = false }: SplashGateProps) {
  // Hanya tampil jika aplikasi baru pertama dibuka di sesi ini
  const [show, setShow] = useState(() => {
    if (initialSeen) return false;
    return !checkClientSeen();
  });

  const finish = () => {
    markSplashSeen();
    setShow(false);
  };

  return (
    <>
      {/* Sembunyikan konten halaman sepenuhnya selama splash aktif agar tidak ada kebocoran visual */}
      <div suppressHydrationWarning style={show ? { display: "none" } : undefined}>
        {children}
      </div>
      {show && <SplashScreen onFinish={finish} />}
    </>
  );
}
