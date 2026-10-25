"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error caught by ErrorBoundary:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2rem",
        textAlign: "center",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <Mascot mood="berpikir" size={88} title="Ada kendala" />
      <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: "bold" }}>
        Halaman terjeda atau mengalami kendala
      </h2>
      <p style={{ margin: 0, color: "var(--color-text-muted)", maxWidth: "42ch", fontSize: "0.95rem" }}>
        Sesi terputus saat perangkat dalam keadaan diam (idle). Silakan coba lagi atau muat ulang halaman.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <Button onClick={() => reset()} variant="primary">
          Coba Lagi
        </Button>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}
