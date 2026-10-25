"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { learningApi } from "../data/learningApi";
import type { LearningGoal } from "../domain/types";
import styles from "./learning.module.css";

const goals: { value: LearningGoal; label: string }[] = [
  { value: "jlpt", label: "Lulus JLPT" },
  { value: "kerja", label: "Kerja atau magang di Jepang" },
  { value: "hobi", label: "Anime, manga, dan musik" },
  { value: "wisata", label: "Jalan-jalan ke Jepang" },
];

const starts = [
  { levelId: 1, label: "Mulai dari nol", hint: "Belum bisa membaca hiragana", requiresTest: false },
  { levelId: 2, label: "Sudah bisa kana", hint: "Langsung ke materi N5", requiresTest: false },
  { levelId: 3, label: "Sudah lulus N5", hint: "Lanjut ke N4 — perlu tes singkat dulu", requiresTest: true },
  { levelId: 4, label: "Sudah lulus N4", hint: "Lanjut ke N3 — perlu tes singkat dulu", requiresTest: true },
  { levelId: 5, label: "Sudah lulus N3", hint: "Lanjut ke N2 — perlu tes singkat dulu", requiresTest: true },
  { levelId: 6, label: "Sudah lulus N2", hint: "Lanjut ke N1 — perlu tes singkat dulu", requiresTest: true },
];

export function OnboardingForm() {
  const router = useRouter();
  const [goal, setGoal] = useState<LearningGoal>("jlpt");
  const [minutes, setMinutes] = useState<5 | 10 | 20>(10);
  const [levelId, setLevelId] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = starts.find((s) => s.levelId === levelId)!;

  async function submit() {
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
    } catch {
      setError("Belum bisa menyimpan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <main className={styles.onboarding}>
      <Mascot mood="semangat" size={96} />
      <h1 className={styles.heading}>Halo! Ceritakan sedikit tentangmu.</h1>

      <fieldset className={styles.fieldset}>
        <legend>Kenapa kamu belajar bahasa Jepang?</legend>
        {goals.map((g) => (
          <label key={g.value} className={styles.option}>
            <input type="radio" name="goal" checked={goal === g.value} onChange={() => setGoal(g.value)} />
            {g.label}
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Berapa menit sehari?</legend>
        <div className={styles.segmented}>
          {([5, 10, 20] as const).map((m) => (
            <label key={m} className={styles.segment}>
              <input type="radio" name="minutes" checked={minutes === m} onChange={() => setMinutes(m)} />
              {m} menit
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Dari mana kamu mulai?</legend>
        {starts.map((s) => (
          <label key={s.levelId} className={styles.option}>
            <input type="radio" name="level" checked={levelId === s.levelId} onChange={() => setLevelId(s.levelId)} />
            <span>
              {s.label}
              <small className={styles.optionHint}>{s.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {error && <Alert>{error}</Alert>}
      <Button block onClick={submit} disabled={busy}>
        {busy ? "Menyimpan…" : selected.requiresTest ? "Lanjut ke Tes Penempatan →" : "Mulai belajar"}
      </Button>
      <Button variant="ghost" onClick={() => router.back()}>
        Kembali
      </Button>
    </main>
  );
}
