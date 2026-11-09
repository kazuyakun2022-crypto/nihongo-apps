"use client";

import { useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { TransitionLink } from "@/shared/ui/ViewTransitions";
import { authApi } from "../data/authApi";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(String(new FormData(e.currentTarget).get("email")));
      setSent(true);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Gagal menghubungi server. Pastikan koneksi internet stabil.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Lupa Password"
      japaneseTitle="パスワード再設定"
      lead="Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk membuat password baru."
      bubbleText="大丈夫だよ！(Jangan khawatir, pasti beres!)"
    >
      {sent ? (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <Alert tone="success">
            Jika email kamu terdaftar, tautan reset password telah dikirim ke kotak masuk emailmu. Tautan berlaku selama 1 jam.
          </Alert>
          <Button variant="secondary" block onClick={() => setSent(false)}>
            Kirim Ulang Link
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit}>
          {error && <Alert tone="danger">{error}</Alert>}
          <TextField
            label="Alamat Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            hint="Pastikan email kamu aktif untuk menerima link verifikasi."
            required
          />
          <Button type="submit" block disabled={busy}>
            {busy ? "Mengirim tautan…" : "Kirim Tautan Reset"}
          </Button>
        </form>
      )}

      <p className={styles.footer}>
        Ingat passwordmu?{" "}
        <TransitionLink href="/masuk" className={styles.footerLink}>
          Kembali ke halaman masuk
        </TransitionLink>
      </p>
    </AuthCard>
  );
}
