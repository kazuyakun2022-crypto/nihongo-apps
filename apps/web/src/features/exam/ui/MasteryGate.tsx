"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Mascot } from "@/shared/ui/Mascot";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { masteryGateApi, type MasteryGateItem, type MasteryGateResult, type MasteryGateRules, type MasteryGateStatus } from "../data/masteryGateApi";
import styles from "./masteryGate.module.css";

type Phase = "loading" | "intro" | "countdown" | "running" | "submitting" | "result" | "error";

/** Jeda singkat antar soal agar pergantian terasa, tidak dihitung ke waktu jawab. */
const GAP_MS = 180;

export function MasteryGate() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [status, setStatus] = useState<MasteryGateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [items, setItems] = useState<MasteryGateItem[]>([]);
  const [rules, setRules] = useState<MasteryGateRules | null>(null);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(3);
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<MasteryGateResult | null>(null);
  const answers = useRef<{ index: number; answer: string | null; ms: number }[]>([]);
  const shownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStatus = useCallback(() => {
    setPhase("loading");
    masteryGateApi
      .status()
      .then((s) => {
        setStatus(s);
        setPhase("intro");
      })
      .catch((err: Error) => {
        setError(err.message);
        setPhase("error");
      });
  }, []);

  useEffect(loadStatus, [loadStatus]);

  async function start() {
    setError(null);
    try {
      const res = await masteryGateApi.start();
      setAttemptId(res.attemptId);
      setItems(res.items);
      setRules(res.rules);
      answers.current = [];
      setIndex(0);
      setCount(3);
      setPhase("countdown");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tes belum bisa dimulai.");
    }
  }

  // Hitung mundur 3-2-1 sebelum soal pertama
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      setPhase("running");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  const finish = useCallback(async () => {
    if (!attemptId) return;
    setPhase("submitting");
    try {
      setResult(await masteryGateApi.submit(attemptId, answers.current));
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hasil tidak bisa dikirim.");
      setPhase("error");
    }
  }, [attemptId]);

  const record = useCallback(
    (answer: string | null) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (answers.current.some((a) => a.index === index)) return;
      answers.current.push({ index, answer, ms: Math.round(performance.now() - shownAt.current) });
      setChosen(answer ?? "");
      setTimeout(() => {
        setChosen(null);
        if (index + 1 >= items.length) void finish();
        else setIndex(index + 1);
      }, GAP_MS);
    },
    [index, items.length, finish],
  );

  // Mulai jam setiap soal tampil; habis waktu = tidak menjawab
  useEffect(() => {
    if (phase !== "running" || !rules) return;
    shownAt.current = performance.now();
    timer.current = setTimeout(() => record(null), rules.maxResponseMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, index, rules, record]);

  // Tombol 1–4 di keyboard untuk menjawab cepat
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      const option = items[index]?.options[n - 1];
      if (option && chosen === null) record(option);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, index, items, chosen, record]);

  if (phase === "loading") {
    return (
      <SkeletonRegion label="Memuat Mastery Gate…" className={styles.wrap}>
        <Skeleton height="14rem" radius="var(--radius-lg)" />
      </SkeletonRegion>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.wrap}>
        <Alert>{error}</Alert>
        <Link href="/belajar">← Kembali ke Belajar</Link>
      </div>
    );
  }

  if (phase === "intro" && status) {
    const seconds = (status.rules.maxResponseMs / 1000).toLocaleString("id-ID");
    return (
      <div className={styles.wrap}>
        <section className={styles.intro}>
          <Mascot mood="semangat" size={84} />
          <p className={styles.eyebrow} lang="ja">ひらがな マスターゲート</p>
          <h1 className={styles.title}>Mastery Gate Hiragana</h1>
          <p className={styles.lead}>Uji refleks terakhir sebelum {status.nextLevel ?? "level berikutnya"} terbuka. Jawab secepat kilat — tidak ada waktu untuk berpikir lama!</p>
          <ul className={styles.rules}>
            <li>
              <strong>{status.totalItems}</strong> soal acak: 46 hiragana + {status.rules.vocabItems} kosakata
            </li>
            <li>
              <strong>{seconds} detik</strong> per soal — lewat dari itu dihitung salah
            </li>
            <li>
              Lulus bila benar <strong>≥ {status.rules.minAccuracyPercent}%</strong>
            </li>
            <li>Huruf yang salah atau lambat otomatis masuk Flashcard untuk dilatih ulang</li>
          </ul>
          <p className={styles.muted}>Tips: pakai tombol 1–4 di keyboard untuk menjawab lebih cepat.</p>
          {status.passedBefore && <Alert tone="success">Kamu sudah pernah lulus gerbang ini. Boleh mencoba lagi untuk latihan.</Alert>}
          {error && <Alert>{error}</Alert>}
          {status.canTake ? (
            <Button block onClick={start}>
              Mulai Tes
            </Button>
          ) : (
            <>
              <Alert tone="info">
                {status.cooldownUntil
                  ? `Bisa mencoba lagi pada ${new Date(status.cooldownUntil).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}.`
                  : `Selesaikan dulu minimal ${status.minChapterPct}% bab Pemula (sekarang ${status.chaptersCompleted}/${status.chaptersTotal} bab).`}
              </Alert>
              <Link href="/belajar" className={styles.backLink}>
                ← Lanjutkan belajar
              </Link>
            </>
          )}
        </section>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className={styles.wrap}>
        <div className={styles.countdown} aria-live="assertive">
          <span key={count} className={styles.countNum}>
            {count || "始め!"}
          </span>
        </div>
      </div>
    );
  }

  if ((phase === "running" || phase === "submitting") && rules) {
    const item = items[Math.min(index, items.length - 1)];
    return (
      <div className={styles.wrap}>
        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>
            {Math.min(index + 1, items.length)}/{items.length}
          </span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(index / items.length) * 100}%` }} />
          </div>
        </div>
        <section className={styles.stage}>
          {/* Batang waktu: dimulai ulang tiap soal lewat key */}
          <div key={index} className={styles.timer} style={{ animationDuration: `${rules.maxResponseMs}ms` }} />
          <p className={styles.kind}>{item.kind === "huruf" ? "Huruf ini dibaca…" : "Kata ini artinya…"}</p>
          <p className={item.kind === "huruf" ? styles.promptKana : styles.promptWord} lang="ja">
            {item.prompt}
          </p>
          <div className={styles.options}>
            {item.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={styles.option}
                data-chosen={chosen === o || undefined}
                disabled={chosen !== null || phase === "submitting"}
                onClick={() => record(o)}
              >
                <span className={styles.optionKey}>{i + 1}</span>
                {o}
              </button>
            ))}
          </div>
        </section>
        {phase === "submitting" && <p className={styles.muted}>Menghitung hasil…</p>}
      </div>
    );
  }

  if (phase === "result" && result) {
    const missed = result.results.filter((r) => !r.correct);
    return (
      <div className={styles.wrap}>
        <section className={styles.intro}>
          <Mascot mood={result.passed ? "senang" : "semangat"} size={84} />
          <h1 className={styles.title}>{result.passed ? "Lulus! おめでとう！" : "Belum lulus, ayo coba lagi!"}</h1>
          <div className={styles.scores}>
            <div className={styles.score} data-ok={result.accuracy >= result.rules.minAccuracyPercent || undefined}>
              <span className={styles.scoreNum}>{result.accuracy}%</span>
              <span className={styles.muted}>akurasi (min. {result.rules.minAccuracyPercent}%)</span>
            </div>
            <div className={styles.score} data-ok={result.avgMs <= result.rules.maxResponseMs || undefined}>
              <span className={styles.scoreNum}>{(result.avgMs / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} dtk</span>
              <span className={styles.muted}>rata-rata waktu jawab</span>
            </div>
          </div>
          {result.passed ? (
            <Alert tone="success">{result.nextLevel ? `${result.nextLevel} sekarang terbuka. Selamat datang di level berikutnya!` : "Selamat, kamu sudah menguasai hiragana!"}</Alert>
          ) : (
            <Alert tone="info">
              {result.weakMarked > 0
                ? `${result.weakMarked} huruf/kata masuk Flashcard sebagai kartu lemah. Latih 3 menit setiap hari, lalu coba lagi.`
                : "Latih lagi huruf yang salah, lalu coba lagi."}
            </Alert>
          )}
          {missed.length > 0 && (
            <div className={styles.missed}>
              <h2 className={styles.missedTitle}>Perlu dilatih ({missed.length})</h2>
              <ul className={styles.missedList}>
                {missed.map((r) => (
                  <li key={r.index} className={styles.missedItem}>
                    <span className={styles.missedPrompt} lang="ja">
                      {r.prompt}
                    </span>
                    <span className={styles.missedAnswer}>{r.answer}</span>
                    <span className={styles.missedNote}>{r.given === null ? "waktu habis" : r.slow ? "benar tapi lambat" : `kamu: ${r.given}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={styles.actions}>
            {result.passed ? (
              <Link href="/belajar" className={styles.primaryLink}>
                Lanjut ke {result.nextLevel ?? "Belajar"} →
              </Link>
            ) : (
              <>
                <Link href="/review" className={styles.primaryLink}>
                  Latih kartu lemah
                </Link>
                <Button variant="secondary" onClick={loadStatus}>
                  Coba lagi
                </Button>
              </>
            )}
          </div>
        </section>
      </div>
    );
  }

  return null;
}
