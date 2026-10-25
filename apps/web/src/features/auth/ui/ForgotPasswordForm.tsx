"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { authApi } from "../data/authApi";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await authApi.forgotPassword(String(new FormData(e.currentTarget).get("email"))).catch(() => undefined);
    setSent(true);
    setBusy(false);
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
        Ingat passwordmu? <Link href="/masuk">Kembali ke halaman masuk</Link>
      </p>
    </AuthCard>
  );
}
