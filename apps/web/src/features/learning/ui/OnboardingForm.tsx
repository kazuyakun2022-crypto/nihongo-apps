"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { TextField } from "@/shared/ui/TextField";
import { ConfirmModal } from "@/shared/ui/ConfirmModal";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { learningApi } from "../data/learningApi";
import type { OnboardingOptions } from "../domain/types";
import styles from "./learning.module.css";

/** Layar onboarding interaktif dua langkah:
 * 1. Data Diri (Nama panggilan & Jenis kelamin/sapaan akrab).
 * 2. Rencana Belajar (Tujuan, target menit harian, & titik mulai/tes penempatan).
 */
export function OnboardingForm() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const initializedRef = useRef(false);

  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [goal, setGoal] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [levelId, setLevelId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Jika user sudah menyelesaikan onboarding, jangan tampilkan layar ini lagi
  useEffect(() => {
    if (user && user.needsOnboarding === false) {
      router.replace("/beranda");
    }
  }, [user, router]);

  // Isi data awal dari akun user HANYA SEKALI saat pertama kali dimuat
  useEffect(() => {
    if (initializedRef.current || !user) return;
    initializedRef.current = true;
    if (user.displayName && user.displayName !== "Pelajar") {
      setDisplayName(user.displayName);
    }
    if (user.gender === "male" || user.gender === "female") {
      setGender(user.gender);
    }
  }, [user]);

  function load() {
    setError(null);
    learningApi
      .onboardingOptions()
      .then((o) => {
        setOptions(o);
        setMinutes(o.defaultMinutes);
      })
      .catch(() => setError("Pilihan belum bisa dimuat. Coba lagi."));
  }
  useEffect(load, []);

  if (!options) {
    return error ? (
      <main className={styles.onboarding}>
        <Alert>{error}</Alert>
        <Button onClick={load}>Coba lagi</Button>
      </main>
    ) : (
      <OnboardingSkeleton />
    );
  }

  const selected = options.starts.find((s) => s.levelId === levelId);

  // Validasi Step 1
  const isNameValid = displayName.trim().length >= 2;
  const isGenderValid = gender === "male" || gender === "female";
  const step1Missing = !isNameValid
    ? "Masukkan nama panggilanmu (minimal 2 huruf)."
    : !isGenderValid
      ? "Pilih jenis kelamin / panggilan yang sesuai untukmu."
      : null;

  // Validasi Step 2
  const step2Missing = !goal
    ? "Pilih tujuan belajarmu dulu."
    : !selected
      ? "Pilih dari mana kamu mulai dulu."
      : null;

  function handleTriggerCancel() {
    setIsCancelModalOpen(true);
  }

  async function handleConfirmCancel() {
    setCancelling(true);
    try {
      await logout();
    } catch {}
    router.replace("/masuk?batal=1");
  }

  function handleNextStep1(e: React.FormEvent) {
    e.preventDefault();
    if (step1Missing) return;
    setError(null);
    setStep(2);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step1Missing || step2Missing || !selected) return;

    setBusy(true);
    setError(null);

    const trimmedName = displayName.trim();

    if (selected.requiresTest) {
      const params = new URLSearchParams({
        target: String(levelId),
        goal,
        min: String(minutes),
        name: trimmedName,
        gender: gender || "",
      });
      router.push(`/mulai/tes-penempatan?${params}`);
      return;
    }

    try {
      const res = await learningApi.completeOnboarding({
        displayName: trimmedName,
        gender: gender || undefined,
        currentLevelId: levelId,
        learningGoal: goal,
        dailyTargetMin: minutes,
      });

      // PENTING: Update AuthProvider dan sinkronkan ke localStorage
      if (res?.user) {
        updateUser(res.user);
      } else {
        updateUser({
          displayName: trimmedName,
          gender: gender,
          currentLevelId: levelId,
          learningGoal: goal,
          dailyTargetMin: minutes,
          needsOnboarding: false,
        });
      }

      // Redirect ke beranda dengan aman tanpa memunculkan onboarding kembali
      router.replace("/beranda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belum bisa menyimpan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <main className={styles.onboarding}>
      {/* Step Indicator Badge */}
      <div className={styles.stepBadge}>
        <span>{step === 1 ? "Langkah 1 dari 2" : "Langkah 2 dari 2"}</span>
        <span>•</span>
        <span>{step === 1 ? "Tentang Diri Kamu" : "Rencana Belajar"}</span>
      </div>

      {step === 1 ? (
        /* LANGKAH 1: DATA DIRI & SAPAAN AKRAB */
        <form onSubmit={handleNextStep1} className={styles.stepCard}>
          <div className={styles.headerWrap}>
            <Mascot mood="senang" size={88} />
            <h1 className={styles.heading}>Hajimemashite! Mari Berkenalan ✨</h1>
            <p className={styles.muted}>
              Beri tahu nama panggilan dan panggilan akrabmu agar teman belajarmu bisa menyapamu dengan ramah.
            </p>
          </div>

          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <TextField
              label="Nama Panggilan"
              placeholder="Contoh: Budi, Sakura, Kenji"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              required
              hint="Nama yang akan dipanggil oleh sensei dan teman-temanmu."
              autoFocus
            />

            <fieldset className={styles.fieldset}>
              <legend>Jenis Kelamin & Sapaan Akrab</legend>
              <div className={styles.genderGrid}>
                <label
                  className={styles.genderCard}
                  data-active={gender === "male"}
                  style={{
                    borderColor: gender === "male" ? "var(--color-primary)" : undefined,
                    background: gender === "male" ? "rgba(177, 42, 58, 0.06)" : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={() => setGender("male")}
                  />
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>👦</span>
                  <span className={styles.genderCall}>お兄ちゃん (Onii-chan)</span>
                  <span className={styles.genderLabel}>Laki-laki</span>
                </label>

                <label
                  className={styles.genderCard}
                  data-active={gender === "female"}
                  style={{
                    borderColor: gender === "female" ? "var(--color-primary)" : undefined,
                    background: gender === "female" ? "rgba(177, 42, 58, 0.06)" : undefined,
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={() => setGender("female")}
                  />
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>👧</span>
                  <span className={styles.genderCall}>お姉ちゃん (Onee-chan)</span>
                  <span className={styles.genderLabel}>Perempuan</span>
                </label>
              </div>
              <p className={styles.optionHint} style={{ marginTop: "4px" }}>
                Digunakan untuk sapaan hangat dan santun dalam dialog bahasa Jepang.
              </p>
            </fieldset>

            {gender && displayName.trim().length >= 2 && (
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--color-surface-muted)",
                  border: "1px dashed var(--color-primary-soft)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>💬</span>
                <span>
                  Sensei akan memanggilmu:{" "}
                  <strong style={{ color: "var(--color-primary)" }}>
                    {displayName.trim()} {gender === "male" ? "くん (kun)" : "さん (san)"}
                  </strong>
                  !
                </span>
              </div>
            )}
          </div>

          {step1Missing && (
            <p className={styles.optionHint} role="status" style={{ textAlign: "center", color: "var(--color-danger)" }}>
              {step1Missing}
            </p>
          )}

          <div className={styles.actionGroup}>
            <Button block type="submit" disabled={Boolean(step1Missing)}>
              Lanjut ke Rencana Belajar →
            </Button>
            <Button variant="ghost" type="button" disabled={cancelling} onClick={handleTriggerCancel}>
              ← Batalkan & Kembali ke Halaman Masuk
            </Button>
          </div>
        </form>
      ) : (
        /* LANGKAH 2: RENCANA & TITIK MULAI BELAJAR */
        <form onSubmit={handleFinalSubmit} className={styles.stepCard}>
          <div className={styles.headerWrap}>
            <Mascot mood="semangat" size={88} />
            <h1 className={styles.heading}>{options.title || "Tentukan Target Belajarmu 🎯"}</h1>
            <p className={styles.muted}>
              Pilih tujuan dan titik awal yang paling pas agar materi disesuaikan dengan kebutuhanmu.
            </p>
          </div>

          <fieldset className={styles.fieldset}>
            <legend>{options.goalQuestion}</legend>
            {options.goals.map((g) => (
              <label key={g.value} className={styles.option}>
                <input
                  type="radio"
                  name="goal"
                  checked={goal === g.value}
                  onChange={() => setGoal(g.value)}
                />
                <span>{g.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>{options.minutesQuestion}</legend>
            <div className={styles.segmented}>
              {options.minuteOptions.map((m) => (
                <label key={m} className={styles.segment}>
                  <input
                    type="radio"
                    name="minutes"
                    checked={minutes === m}
                    onChange={() => setMinutes(m)}
                  />
                  <span>{m} menit</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>{options.startQuestion}</legend>
            {options.starts.map((s) => (
              <label key={s.levelId} className={styles.option}>
                <input
                  type="radio"
                  name="level"
                  checked={levelId === s.levelId}
                  onChange={() => setLevelId(s.levelId)}
                />
                <span>
                  <strong>{s.label}</strong>
                  {s.hint && <small className={styles.optionHint}>{s.hint}</small>}
                </span>
              </label>
            ))}
          </fieldset>

          {error && <Alert>{error}</Alert>}
          {step2Missing && (
            <p className={styles.optionHint} role="status" style={{ textAlign: "center" }}>
              {step2Missing}
            </p>
          )}

          <div className={styles.actionGroup}>
            <Button block type="submit" disabled={busy || Boolean(step2Missing)}>
              {busy
                ? "Menyimpan…"
                : selected?.requiresTest
                  ? "Lanjut ke Tes Penempatan →"
                  : "Mulai Belajar Sekarang 🚀"}
            </Button>
            <Button
              variant="ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setStep(1);
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              ← Kembali ke Data Diri
            </Button>
          </div>
        </form>
      )}

      {/* Modal Konfirmasi Pembatalan Pendaftaran */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!cancelling) setIsCancelModalOpen(false);
        }}
        onConfirm={handleConfirmCancel}
        title="Batalkan Pendaftaran?"
        description="Jika kamu kembali sekarang, proses pendaftaranmu tidak selesai dan kamu akan dikeluarkan ke halaman masuk. Yakin ingin membatalkan?"
        confirmText="Ya, Batalkan & Keluar"
        cancelText="Lanjut Lengkapi Data"
        confirmVariant="danger"
        iconType="warning"
        busy={cancelling}
      />
    </main>
  );
}

function OnboardingSkeleton() {
  return (
    <SkeletonRegion label="Memuat pilihan…" className={styles.onboarding}>
      <Skeleton circle width={88} style={{ justifySelf: "center" }} />
      <Skeleton width="80%" height="1.75rem" style={{ justifySelf: "center" }} />
      {[4, 1, 6].map((rows, i) => (
        <div key={i} className={styles.fieldset} style={{ border: 0 }}>
          <Skeleton width="60%" height="1.1rem" />
          {i === 1 ? (
            <div className={styles.segmented}>
              {[0, 1, 2].map((j) => (
                <Skeleton key={j} height="2.75rem" radius="var(--radius-pill)" />
              ))}
            </div>
          ) : (
            Array.from({ length: rows }, (_, j) => (
              <Skeleton key={j} height="3rem" radius="var(--radius-md)" />
            ))
          )}
        </div>
      ))}
      <Skeleton height="3rem" radius="var(--radius-pill)" />
    </SkeletonRegion>
  );
}
