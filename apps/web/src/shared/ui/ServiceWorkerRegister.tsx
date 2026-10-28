"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker (public/sw.js) di production; otomatis unregister di development agar hot reload lancar. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("Service worker gagal didaftarkan", err));
  }, []);
  return null;
}
