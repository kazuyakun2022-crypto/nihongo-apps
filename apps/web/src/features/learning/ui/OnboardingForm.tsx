"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { learningApi } from "../data/learningApi";
import type { OnboardingOptions } from "../domain/types";
import styles from "./learning.module.css";

/** Layar pendaftaran awal. Pertanyaan dan pilihannya diatur admin di Konten → Pendaftaran. */
export function OnboardingForm() {
  const router = useRouter();
  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [goal, setGoal] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [levelId, setLevelId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    learningApi
      .onboardingOptions()
      .then((o) => {
        // Tujuan dan titik mulai sengaja tidak dipilihkan: siswa harus memilih sendiri
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

  const missing = !goal ? "Pilih tujuan belajarmu dulu." : !selected ? "Pilih dari mana kamu mulai dulu." : null;

  async function submit() {
    if (!selected || !goal) return;
    setBusy(true);
    setError(null);
    if (selected.requiresTest) {
      const params = new URLSearchParams({ target: String(levelId), goal, min: String(minutes) });
      router.push(`/mulai/tes-penempatan?${params}`);
      return;
    }
    try {
      await learningApi.completeOnboarding({ currentLevelId: levelId, learningGoal: goal, dailyTargetMin: minutes });
      window.location.assign("/beranda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belum bisa menyimpan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <main className={styles.onboarding}>
      <Mascot mood="semangat" size={96} />
      <h1 className={styles.heading}>{options.title}</h1>

      <fieldset className={styles.fieldset}>
        <legend>{options.goalQuestion}</legend>
        {options.goals.map((g) => (
          <label key={g.value} className={styles.option}>
            <input type="radio" name="goal" checked={goal === g.value} onChange={() => setGoal(g.value)} />
            {g.label}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{options.minutesQuestion}</legend>
        <div className={styles.segmented}>
          {options.minuteOptions.map((m) => (
            <label key={m} className={styles.segment}>
              <input type="radio" name="minutes" checked={minutes === m} onChange={() => setMinutes(m)} />
              {m} menit
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{options.startQuestion}</legend>
        {options.starts.map((s) => (
          <label key={s.levelId} className={styles.option}>
            <input type="radio" name="level" checked={levelId === s.levelId} onChange={() => setLevelId(s.levelId)} />
            <span>
              {s.label}
              {s.hint && <small className={styles.optionHint}>{s.hint}</small>}
            </span>
          </label>
        ))}
      </fieldset>

      {error && <Alert>{error}</Alert>}
      {missing && <p className={styles.optionHint} role="status" style={{ textAlign: "center" }}>{missing}</p>}
      <Button block onClick={submit} disabled={busy || !!missing}>
        {busy ? "Menyimpan…" : selected?.requiresTest ? "Lanjut ke Tes Penempatan →" : "Mulai belajar"}
      </Button>
      <Button variant="ghost" onClick={() => router.back()}>
        Kembali
      </Button>
    </main>
  );
}

function OnboardingSkeleton() {
  return (
    <SkeletonRegion label="Memuat pilihan…" className={styles.onboarding}>
      <Skeleton circle width={96} style={{ justifySelf: "center" }} />
      <Skeleton width="80%" height="1.75rem" style={{ justifySelf: "center" }} />
      {[4, 1, 6].map((rows, i) => (
        <div key={i} className={styles.fieldset} style={{ border: 0 }}>
          <Skeleton width="60%" height="1.1rem" />
          {i === 1 ? (
            <div className={styles.segmented}>
              {[0, 1, 2].map((j) => <Skeleton key={j} height="2.75rem" radius="var(--radius-pill)" />)}
            </div>
          ) : (
            Array.from({ length: rows }, (_, j) => <Skeleton key={j} height="3rem" radius="var(--radius-md)" />)
          )}
        </div>
      ))}
      <Skeleton height="3rem" radius="var(--radius-pill)" />
    </SkeletonRegion>
  );
}
