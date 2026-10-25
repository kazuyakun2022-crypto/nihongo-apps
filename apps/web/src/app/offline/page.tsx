import { Mascot } from "@/shared/ui/Mascot";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: "var(--space-5)" }}>
      <div style={{ display: "grid", gap: "var(--space-3)", justifyItems: "center" }}>
        <Mascot mood="berpikir" size={110} />
        <h1>Kamu sedang offline</h1>
        <p style={{ color: "var(--color-text-muted)", maxWidth: "32ch", margin: 0 }}>
          Materi dan kartu yang sudah dibuka tetap bisa dipakai. Ngobrol dengan Neko-sensei butuh internet.
        </p>
      </div>
    </main>
  );
}
