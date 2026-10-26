"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { useAuth } from "../application/AuthProvider";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

type FieldErrors = Partial<Record<"displayName" | "email" | "password", string>>;

export function RegisterForm() {
  const { register, loginWithOAuth, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const fromGuest = user?.isGuest;

  async function onGoogleCredential(response: any) {
    const idToken = response?.credential;
    if (!idToken) {
      setError("Token Google tidak diterima.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await loginWithOAuth({ provider: "google", idToken });
      router.replace(res.user.needsOnboarding ? "/mulai" : "/beranda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa mendaftar dengan Google.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: onGoogleCredential,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnRef.current.offsetWidth || 320,
          text: "signup_with",
          shape: "rectangular",
        });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: googleClientId,
        callback: onGoogleCredential,
      });
      if (googleBtnRef.current && window.google?.accounts?.id) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: googleBtnRef.current.offsetWidth || 320,
          text: "signup_with",
          shape: "rectangular",
        });
      }
    };
    document.body.appendChild(script);
  }, [googleClientId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await register({
        displayName: String(form.get("displayName")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      router.replace(res.user.needsOnboarding ? "/mulai" : "/beranda");
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setFieldErrors(Object.fromEntries((err.details as { field: string; message: string }[]).map((d) => [d.field, d.message])));
      }
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title={fromGuest ? "Simpan Progres Belajarmu" : "Buat Akun Baru"}
      japaneseTitle={fromGuest ? "データ保存" : "新規登録"}
      lead={fromGuest ? "Semua XP dan kartu flashcard yang kamu buat akan tetap tersimpan." : "100% Gratis! Progresmu otomatis tersimpan di semua perangkat."}
      bubbleText={fromGuest ? "これで安心！(Progresmu aman!)" : "いらっしゃい！(Selamat datang!)"}
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && <Alert tone="danger">{error}</Alert>}

        <TextField
          label="Nama Panggilan"
          name="displayName"
          autoComplete="nickname"
          placeholder="Contoh: Budi, Sakura"
          hint="Neko-sensei akan menyapamu dengan nama ini."
          error={fieldErrors.displayName}
          required
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={fieldErrors.email}
          required
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          hint="Gunakan kombinasi huruf dan angka agar aman."
          error={fieldErrors.password}
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

        <p className={styles.legal}>
          Dengan mendaftar, kamu menyetujui Syarat Layanan dan Kebijakan Privasi Nihongo.
        </p>

        <Button type="submit" block disabled={busy}>
          {busy ? "Membuat akun…" : "Daftar Sekarang"}
        </Button>
      </form>

      <div className={styles.divider}>
        <span>atau daftar dengan</span>
      </div>

      <div className={styles.oauthRow}>
        {googleClientId ? (
          <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center", width: "100%" }} />
        ) : (
          <button
            type="button"
            className={styles.googleBtn}
            onClick={() => setError("Google Sign-In belum dikonfigurasi di server.")}
            title="Konfigurasi NEXT_PUBLIC_GOOGLE_CLIENT_ID di web dan GOOGLE_CLIENT_ID di API"
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Daftar dengan Google</span>
          </button>
        )}
      </div>

      <p className={styles.footer}>
        Sudah punya akun? <Link href="/masuk">Masuk ke akunmu</Link>
      </p>
    </AuthCard>
  );
}
