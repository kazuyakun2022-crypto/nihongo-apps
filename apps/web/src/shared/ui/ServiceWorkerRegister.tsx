"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (public/sw.js) untuk mendukung Web Push & PWA. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[sw] Service worker gagal didaftarkan", err));
  }, []);
  return null;
}
