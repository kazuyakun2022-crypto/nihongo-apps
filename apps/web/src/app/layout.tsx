import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/features/auth/application/AuthProvider";
import { ServiceWorkerRegister } from "@/shared/ui/ServiceWorkerRegister";
import "@/shared/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Nihongo bersama Neko-sensei", template: "%s · Nihongo" },
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
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
