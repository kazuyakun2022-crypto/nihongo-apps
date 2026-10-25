"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#fdfbf7",
          color: "#1a1215",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", fontWeight: "bold" }}>
          Sesi terputus
        </h2>
        <p style={{ color: "#6e6065", marginBottom: "1.5rem", maxWidth: "400px", lineHeight: "1.6" }}>
          Halaman mengalami kendala saat dibiarkan diam. Klik tombol di bawah untuk memuat ulang.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#d92534",
              color: "#fff",
              border: "none",
              borderRadius: "999px",
              fontSize: "0.95rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f3ede3",
              color: "#1a1215",
              border: "1px solid #d4c8b9",
              borderRadius: "999px",
              fontSize: "0.95rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
