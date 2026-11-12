"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { PawIcon } from "@/shared/ui/icons";
import { ChibiMascot } from "@/shared/ui/neko/ChibiMascot";
import { NekoAvatar, type NekoEmotion } from "@/shared/ui/neko/NekoAvatar";
import { TransitionLink } from "@/shared/ui/ViewTransitions";
import { useAuth } from "../application/AuthProvider";
import styles from "./login.module.css";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [typingPassword, setTypingPassword] = useState(false);

  // Interaksi maskot desktop & mobile
  const [desktopPokes, setDesktopPokes] = useState(0);
  const [mobileEmotion, setMobileEmotion] = useState<NekoEmotion>("biasa");
  const mobileEmotionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  function handleDesktopMascotPoke() {
    setDesktopPokes((prev) => prev + 1);
  }

  function handleMobileMascotTap() {
    const reactiveEmotions: NekoEmotion[] = ["senang", "semangat", "malu", "dielus"];
    const nextEmotion = reactiveEmotions[Math.floor(Math.random() * reactiveEmotions.length)];
    setMobileEmotion(nextEmotion);

    if (mobileEmotionTimerRef.current) {
      clearTimeout(mobileEmotionTimerRef.current);
    }
    mobileEmotionTimerRef.current = setTimeout(() => {
      setMobileEmotion("biasa");
    }, 2200);
  }

  useEffect(() => {
    return () => {
      if (mobileEmotionTimerRef.current) {
        clearTimeout(mobileEmotionTimerRef.current);
      }
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await login({ email: cleanEmail, password });
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

      const rawWidth = googleBtnRef.current.clientWidth || 320;
      const targetWidth = Math.min(Math.max(rawWidth, 220), 400);

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

  // Ucapan responsif Miu-chan di balon ucapan desktop
  const bubbleJp = busy
    ? "ちょっと待ってね…"
    : error
    ? "あれれ？"
    : typingPassword
    ? "見ないよ〜！"
    : "おかえり！";

  const bubbleId = busy
    ? "Sebentar ya…"
    : error
    ? "Hmm, coba cek lagi ya"
    : typingPassword
    ? "Miu tutup mata, aman kok!"
    : "Selamat datang kembali!";

  return (
    <main className={styles.page}>
      {/* 2 Lingkaran blur lembut sebagian keluar layar */}
      <div className={styles.decorCircle1} aria-hidden="true" />
      <div className={styles.decorCircle2} aria-hidden="true" />

      <div className={styles.layoutWrapper}>
        {/* ──────── KOLOM KIRI (DESKTOP HERO >= 900px) ──────── */}
        <aside className={styles.heroPanel}>
          {/* Bagian Atas: Chip brand dengan wajah Miu-chan */}
          <div className={styles.heroTop}>
            <TransitionLink href="/" className={styles.brandChip} title="Beranda Nihongo">
              <div className={styles.brandChipLogo}>
                <Image
                  src="/neko/chibi/neko-chibi-face.webp"
                  alt="Miu-chan"
                  width={34}
                  height={34}
                  className={styles.brandChipLogoImg}
                />
              </div>
              <div className={styles.brandChipTexts}>
                <span className={styles.brandChipTitle}>日本語</span>
                <span className={styles.brandChipSubtitle}>Nihongo × ミウちゃん</span>
              </div>
            </TransitionLink>
          </div>

          {/* Watermark vertikal "日本語" */}
          <div className={styles.heroWatermark} aria-hidden="true">
            日本語
          </div>

          {/* Bagian Tengah: Balon ucapan + Miu-chan (dari Landing Page) + 2 cincin dekoratif */}
          <div className={styles.heroCenter}>
            <div className={styles.heroRingOuter} aria-hidden="true" />
            <div className={styles.heroRingInner} aria-hidden="true" />

            <div className={styles.speechBubble}>
              <span className={styles.speechBubbleJp}>{bubbleJp}</span>
              <span className={styles.speechBubbleId}>{bubbleId}</span>
            </div>

            {/* Miu-chan interaktif dari Landing Page (ChibiMascot) */}
            <button
              type="button"
              className={styles.heroChibiBtn}
              onClick={handleDesktopMascotPoke}
              title="Klik Miu-chan untuk menyapa!"
              aria-label="Sentuh Miu-chan"
            >
              <ChibiMascot
                alt="Miu-chan Maskot Bahasa Jepang"
                pokeSignal={desktopPokes}
                eyesClosed={typingPassword}
                className={styles.heroChibiMascot}
                priority
              />
            </button>
          </div>

          {/* Bagian Bawah: Tagline motivasi */}
          <div className={styles.heroBottom}>
            <p className={styles.heroQuoteJp} lang="ja">
              一歩ずつ、一緒に。
            </p>
            <p className={styles.heroQuoteId}>
              Selangkah demi selangkah, belajar bareng Miu-chan.
            </p>
          </div>
        </aside>

        {/* ──────── KOLOM KANAN / FORM ──────── */}
        <div className={styles.contentColumn}>
          {/* Header Mobile (< 900px): "← Beranda" di kiri dan "日本語" di kanan */}
          <header className={styles.mobileHeader}>
            <TransitionLink href="/" className={styles.mobileHeaderBack} aria-label="Kembali ke Beranda">
              ← Beranda
            </TransitionLink>
            <TransitionLink href="/" className={styles.mobileHeaderBrand} aria-label="Nihongo">
              日本語
            </TransitionLink>
          </header>

          {/* Header Desktop (>= 900px): Pill putih "← Beranda" dan "日本語" */}
          <header className={styles.desktopHeader}>
            <TransitionLink href="/" className={styles.desktopBackPill} aria-label="Kembali ke Beranda">
              ← Beranda
            </TransitionLink>
            <TransitionLink href="/" className={styles.desktopHeaderBrand} aria-label="Nihongo">
              日本語
            </TransitionLink>
          </header>

          {/* Bagian Maskot Mobile (< 900px): Kepala Miu beranimasi idle, mengikuti kursor, berekspresi saat disentuh, tanpa frame bg */}
          <div className={styles.mobileMascotSection}>
            <div className={styles.mobileAvatarWrap}>
              <NekoAvatar
                mode="idle"
                emotion={mobileEmotion}
                size={135}
                onTap={handleMobileMascotTap}
                label="Miu-chan"
              />
            </div>
            <p className={styles.mobileMascotText}>おかえり！</p>
          </div>

          {/* Form Utama (Shared Mobile & Desktop) */}
          <div className={styles.formContainer}>
            {/* 1. Badge "ログイン" */}
            <div className={styles.japaneseBadge}>ログイン</div>

            {/* 2. Judul & Subjudul */}
            <h1 className={styles.formTitle}>Masuk ke Akun</h1>
            <p className={styles.formSubtitle}>
              Lanjutkan petualangan belajarmu bersama Miu-chan.
            </p>

            {/* Banner status batal jika ada */}
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

            {/* Alert Error jika ada */}
            {error && (
              <div className={styles.alertBox} role="alert">
                {error}
              </div>
            )}

            {/* 3. Tombol Google: pill 52px, full width, 20px 4-color Google logo */}
            <div className={styles.googleBtnWrapper}>
              <button
                type="button"
                className={styles.googleBtn}
                disabled={busy}
                onClick={() => {
                  if (window.google?.accounts?.id) {
                    window.google.accounts.id.prompt();
                  }
                }}
              >
                <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className={styles.googleText}>Lanjutkan dengan Google</span>
              </button>
              {googleClientId && (
                <div ref={googleBtnRef} className={styles.hiddenGoogleSdkSlot} aria-hidden="true" />
              )}
            </div>

            {/* 4. Pemisah: garis - "atau masuk dengan email" (12px) - garis */}
            <div className={styles.divider}>
              <div className={styles.dividerLine} />
              <span className={styles.dividerText}>atau masuk dengan email</span>
              <div className={styles.dividerLine} />
            </div>

            {/* Form Input Email & Password */}
            <form onSubmit={onSubmit} noValidate className={styles.formFields}>
              {/* 5. Field Email */}
              <div className={styles.fieldGroup}>
                <label htmlFor="login-email" className={styles.fieldLabel}>
                  Email
                </label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIconLeft} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8A1F35"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`${styles.inputField} ${
                      error && !email.trim() ? styles.inputFieldError : ""
                    }`}
                  />
                </div>
              </div>

              {/* 6. Field Password */}
              <div className={styles.fieldGroup}>
                <div className={styles.passwordHeaderRow}>
                  <label htmlFor="login-password" className={styles.fieldLabel}>
                    Password
                  </label>
                  <TransitionLink href="/lupa-password" className={styles.forgotLink}>
                    Lupa password?
                  </TransitionLink>
                </div>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIconLeft} aria-hidden="true">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8A1F35"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan password akunmu"
                    required
                    value={password}
                    onFocus={() => setTypingPassword(true)}
                    onBlur={() => setTypingPassword(false)}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    className={`${styles.inputField} ${styles.inputFieldWithRight} ${
                      error && !password ? styles.inputFieldError : ""
                    }`}
                  />
                  <button
                    type="button"
                    className={styles.togglePassBtn}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 7. Tombol Utama "Masuk ke Akun" */}
              <button type="submit" disabled={busy} className={styles.submitBtn}>
                {busy ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    <span>Sedang masuk…</span>
                  </>
                ) : (
                  "Masuk ke Akun"
                )}
              </button>
            </form>

            {/* 8. Teks Belum punya akun? + Link Daftar */}
            <div className={styles.footerWrapper}>
              <p className={styles.footerText}>
                Belum punya akun?{" "}
                <TransitionLink href="/daftar" className={styles.footerLink}>
                  Daftar gratis sekarang
                </TransitionLink>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
