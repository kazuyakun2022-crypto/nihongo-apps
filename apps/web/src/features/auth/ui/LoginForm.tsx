"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { PawIcon } from "@/shared/ui/icons";
import { useAuth } from "../application/AuthProvider";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

export function LoginForm() {
  const { login, startGuest } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await login({ email: String(form.get("email")), password: String(form.get("password")) });
      router.replace(res.user.needsOnboarding ? "/mulai" : "/beranda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  async function onGuest() {
    setBusy(true);
    try {
      const res = await startGuest();
      router.replace(res.user.needsOnboarding ? "/mulai" : "/beranda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server.");
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Masuk ke Akun"
      japaneseTitle="ログイン"
      lead="Lanjutkan petualangan belajarmu bersama Neko-sensei."
      bubbleText="おかえり！(Selamat datang kembali!)"
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          required
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Masukkan password"
          required
          rightElement={
            <button
              type="button"
              className={styles.togglePassBtn}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          }
        />

        <Link href="/lupa-password" className={styles.smallLink}>
          Lupa password?
        </Link>

        <Button type="submit" block disabled={busy}>
          {busy ? "Sedang masuk…" : "Masuk"}
        </Button>
      </form>

      <div className={styles.divider}>atau</div>

      <div className={styles.secondaryActions}>
        <button
          type="button"
          className={styles.googleBtn}
          disabled
          title="Aktif setelah integrasi Google Client ID dikonfigurasi"
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Masuk dengan Google</span>
        </button>

        <button
          type="button"
          onClick={onGuest}
          className={styles.guestBtn}
          disabled={busy}
        >
          <PawIcon size={16} />
          <span>{busy ? "Menyiapkan sesi..." : "Coba Dulu Tanpa Akun"}</span>
        </button>
      </div>

      <p className={styles.footer}>
        Belum punya akun? <Link href="/daftar">Daftar sekarang</Link>
      </p>
    </AuthCard>
  );
}
