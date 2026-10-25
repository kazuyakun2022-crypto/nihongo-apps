"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/core/http/apiClient";
import { authApi } from "@/features/auth/data/authApi";
import { AuthCard } from "@/features/auth/ui/AuthCard";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";

function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await authApi.resetPassword(token, String(new FormData(e.currentTarget).get("password")));
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server.");
    }
  }

  return (
    <AuthCard
      title="Buat Password Baru"
      japaneseTitle="新パスワード"
      lead="Masukkan password baru yang kuat untuk akun Nihongo milikmu."
      bubbleText="もう少し！(Tinggal selangkah lagi!)"
    >
      {done ? (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <Alert tone="success">Password berhasil diganti. Semua sesi di perangkat lain sudah dikeluarkan demi keamanan.</Alert>
          <Button variant="primary" block onClick={() => (window.location.href = "/masuk")}>
            Masuk Sekarang
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "var(--space-4)" }}>
          {error && <Alert tone="danger">{error}</Alert>}
          <TextField
            label="Password baru"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            hint="Gunakan minimal 8 karakter dengan kombinasi angka dan huruf."
            required
          />
          <Button type="submit" block>
            Simpan Password Baru
          </Button>
        </form>
      )}
      <p style={{ textAlign: "center", margin: 0, fontSize: "var(--font-size-sm)" }}>
        <Link href="/masuk">Ke halaman masuk</Link>
      </p>
    </AuthCard>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
