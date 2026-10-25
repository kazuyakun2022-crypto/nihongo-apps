"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Mascot } from "./Mascot";
import { Button } from "./Button";

/** Penjaga halaman: arahkan ke /masuk jika belum login, ke /mulai jika profil belum lengkap. */
export function RequireAuth({ children, allowIncompleteProfile = false }: { children: React.ReactNode; allowIncompleteProfile?: boolean }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/masuk");
    } else if (status === "authenticated" && user?.needsOnboarding && !allowIncompleteProfile) {
      router.replace("/mulai");
    }
  }, [status, user, router, allowIncompleteProfile]);

  // Jika setelah 4 detik masih tertahan di loading (misalnya jaringan idle / reconnecting), tampilkan opsi reload
  useEffect(() => {
    if (status === "loading") {
      const timer = setTimeout(() => setShowFallback(true), 4000);
      return () => clearTimeout(timer);
    }
    setShowFallback(false);
  }, [status]);

  if (status !== "authenticated" || (user?.needsOnboarding && !allowIncompleteProfile)) {
    return (
      <div
        style={{
          minHeight: "65dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          textAlign: "center",
          animation: "fadeIn var(--motion-fast) ease-out",
        }}
      >
        <Mascot mood="berpikir" size={72} title="Memuat sesi" />
        <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", fontWeight: "500" }}>
          {status === "loading" ? "Memeriksa status sesi..." : "Mengarahkan ke halaman masuk..."}
        </p>

        {showFallback && (
          <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)" }}>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Muat Ulang
            </Button>
            <Button variant="ghost" onClick={() => router.push("/masuk")}>
              Ke Halaman Masuk
            </Button>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
