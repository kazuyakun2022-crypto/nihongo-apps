"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { useAuth } from "../application/AuthProvider";
import { AuthCard } from "./AuthCard";
import styles from "./auth.module.css";

type FieldErrors = Partial<Record<"displayName" | "email" | "password", string>>;

export function RegisterForm() {
  const { register, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fromGuest = user?.isGuest;

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

      <p className={styles.footer}>
        Sudah punya akun? <Link href="/masuk">Masuk ke akunmu</Link>
      </p>
    </AuthCard>
  );
}
