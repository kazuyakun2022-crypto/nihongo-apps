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
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
