"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { PawIcon } from "@/shared/ui/icons";
import { TransitionLink } from "@/shared/ui/ViewTransitions";
import { useAuth } from "../application/AuthProvider";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function LoginForm() {
  const { login, loginWithOAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCancelled = searchParams.get("batal") === "1" || searchParams.get("status") === "batal";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await login({ email, password });
      router.replace(res.user.needsOnboarding ? "/mulai" : "/beranda");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

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
      setError(err instanceof ApiError ? err.message : "Tidak bisa masuk dengan Google.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!googleClientId) return;

    function renderGoogleBtn() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: onGoogleCredential,
      });

      const rawWidth = googleBtnRef.current.clientWidth || (typeof window !== "undefined" ? Math.min(window.innerWidth - 64, 320) : 280);
      const targetWidth = Math.min(Math.max(rawWidth, 220), 340);

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: targetWidth,
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
      });
    }

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      renderGoogleBtn();
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId]);

  return (
    <AuthCard
      title="Masuk ke Akun"
      japaneseTitle="ログイン"
      lead="Lanjutkan petualangan belajarmu bersama Miu-chan."
      bubbleText={
        busy
          ? "ちょっと待ってね… (Sebentar ya…)"
          : error
            ? "あれれ？ (Hmm, coba cek lagi ya)"
            : "おかえり！ (Selamat datang kembali!)"
      }
      mood={busy ? "berpikir" : error ? "bingung" : "senang"}
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {isCancelled && !error && (
          <div className={styles.cancelledBanner} role="status">
            <span className={styles.bannerIcon} aria-hidden="true">
              <PawIcon size={18} />
            </span>
            <div className={styles.bannerBody}>
              <strong className={styles.bannerTitle}>Pendaftaran Dibatalkan</strong>
              <p className={styles.bannerDesc}>
                Data belum tersimpan. Silakan masuk jika sudah punya akun, atau daftar kembali jika sudah siap.
              </p>
            </div>
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          required
        />

        <div className={styles.passwordWrap}>
          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password akunmu"
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
          />

          <TransitionLink href="/lupa-password" className={styles.smallLink}>
            Lupa password?
          </TransitionLink>
        </div>

        <Button type="submit" block disabled={busy} className={styles.submitBtn}>
          {busy ? (
            <span className={styles.busyRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Sedang masuk…</span>
            </span>
          ) : (
            "Masuk ke Akun"
          )}
        </Button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerText}>atau lanjutkan dengan</span>
      </div>

      <div className={styles.secondaryActions}>
        {googleClientId ? (
          <div className={styles.googleContainer}>
            <div ref={googleBtnRef} className={styles.googleBtnSlot} />
          </div>
        ) : (
          <button
            type="button"
            className={styles.googleBtn}
            disabled
            title="Google Sign-In dapat dikonfigurasi via NEXT_PUBLIC_GOOGLE_CLIENT_ID"
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Masuk dengan Google</span>
          </button>
        )}
      </div>

      <p className={styles.footer}>
        Belum punya akun?{" "}
        <TransitionLink href="/daftar" className={styles.footerLink}>
          Daftar gratis sekarang
        </TransitionLink>
      </p>
    </AuthCard>
  );
}
