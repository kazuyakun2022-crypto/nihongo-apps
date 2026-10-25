/*
 * Service worker sederhana (dokumen: Catatan PWA).
 * - Halaman: network-first, jatuh ke cache lalu ke /offline saat tidak ada koneksi.
 * - Aset statis Next.js dan font: cache-first.
 * - /api tidak pernah di-cache di sini agar data pribadi dan token aman.
 * Naikkan VERSION setiap mengubah file ini.
 */
const VERSION = "v1";
const STATIC_CACHE = `nihongo-static-${VERSION}`;
const PAGE_CACHE = `nihongo-pages-${VERSION}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION) && k !== "nihongo-private").map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => (await caches.match(request)) || caches.match("/offline")),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.hostname.includes("fonts.g");
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
  }
});

/* Pengingat belajar lewat web push. Server mengirim payload JSON {title, body, url}. */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Neko-sensei menunggumu", {
      body: data.body || "Yuk latihan 5 menit hari ini!",
      icon: "/icons/icon-192.png",
      data: { url: data.url || "/beranda" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
