/*
 * Service worker sederhana (dokumen: Catatan PWA).
 * - Halaman: network-first, jatuh ke cache lalu ke /offline saat tidak ada koneksi.
 * - Aset statis Next.js dan font: cache-first.
 * - /api tidak pernah di-cache di sini agar data pribadi dan token aman.
 * Naikkan VERSION setiap mengubah file ini.
 */
const VERSION = "v7";
const STATIC_CACHE = `nihongo-static-${VERSION}`;
const PAGE_CACHE = `nihongo-pages-${VERSION}`;
const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/neko/base-idle.webp",
  "/neko/eyes-idle.png",
  "/neko/mouth-atlas.webp",
  "/neko/neko-idle.webp",
  "/sounds/notification.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Jangan sentuh API atau chunk internal Next.js agar hot-reload dan update selalu segar
  if (url.origin === self.location.origin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/"))) return;

  // Pada localhost / pembangunan lokal, jangan intersep cache navigasi agar hot-reload lancar
  if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") {
    if (request.mode === "navigate") return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Coba jaringan dengan batas waktu cepat (1.8 detik); jika lama, langsung pakai cache agar PWA terbuka instan
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("NetworkTimeout")), 1800),
          );
          const res = await Promise.race([networkPromise, timeoutPromise]);
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          return offline || fetch(request);
        }
      })(),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/neko/") ||
    url.pathname.startsWith("/images/kamus/") ||
    url.hostname.includes("fonts.g");
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

/* Pengingat belajar lewat web push. Server mengirim payload JSON {title, body, url, tag}. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const url = data.url || "/beranda";
  const title = data.title || "Miu-chan menunggumu";

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "Yuk latihan 5 menit hari ini!",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || "nihongo-reminder",
        renotify: true,
        silent: true, // Matikan suara bawaan sistem operasi agar tidak membunyikan chime default device
        vibrate: [150, 80, 150],
        data: { url },
        actions: [
          { action: "open", title: "Mulai Belajar" },
          { action: "close", title: "Tutup" },
        ],
      }),
      // Beri tahu tab yang sedang terbuka agar daftar notifikasi langsung diperbarui.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "push", payload: { title, url } }));
      }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/beranda", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const sameOrigin = clients.find((client) => client.url.startsWith(self.location.origin));
      if (sameOrigin) {
        await sameOrigin.focus();
        if ("navigate" in sameOrigin) await sameOrigin.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
