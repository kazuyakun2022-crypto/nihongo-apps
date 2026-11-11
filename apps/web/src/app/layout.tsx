import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AuthProvider } from "@/features/auth/application/AuthProvider";
import { NotificationsProvider } from "@/features/notifications/application/NotificationsProvider";
import { ServiceWorkerRegister } from "@/shared/ui/ServiceWorkerRegister";
import { ViewTransitions } from "@/shared/ui/ViewTransitions";
import { SplashGate } from "@/shared/ui/neko/SplashGate";
import "@/shared/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Nihongo · bersama Miu-chan", template: "%s · Nihongo" },
  description: "Belajar bahasa Jepang dari nol sampai JLPT, dengan maskot AI untuk latihan ngobrol sesuai levelmu.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Nihongo", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdfbf7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const splashSeen = cookieStore.get("neko_splash_seen")?.value === "1";

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=M+PLUS+Rounded+1c:wght@700;800&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Zen+Maru+Gothic:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
        {!splashSeen && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.__splashT0 = Date.now();
                  setTimeout(function() {
                    try {
                      var splash = document.getElementById('app-splash-overlay');
                      if (splash) {
                        splash.style.transition = 'opacity 0.35s ease-out';
                        splash.style.opacity = '0';
                        splash.style.pointerEvents = 'none';
                        setTimeout(function() { if (splash && splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
                      }
                    } catch (e) {}
                  }, 2400);
                `,
              }}
            />
            <link rel="preload" as="image" href="/neko/splash/miu-open.webp" type="image/webp" />
            <link rel="preload" as="image" href="/neko/splash/miu-wink.webp" type="image/webp" />
            <link rel="preload" as="image" href="/neko/splash/miu-closed.webp" type="image/webp" />
          </>
        )}
      </head>
      <body>
        <AuthProvider>
          <NotificationsProvider>
            <ViewTransitions>
              <SplashGate initialSeen={splashSeen}>{children}</SplashGate>
            </ViewTransitions>
          </NotificationsProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

