"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (public/sw.js) hanya di production agar tidak mengganggu hot reload. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker gagal didaftarkan", err));
  }, []);
  return null;
}
