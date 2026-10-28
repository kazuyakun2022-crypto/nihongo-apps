"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QuestionHeader } from "@/features/learning/ui/ChapterLesson";
import { HandwritingExercise } from "@/features/learning/ui/exercises/HandwritingExercise";
import { SpeakingExercise } from "@/features/learning/ui/exercises/SpeakingExercise";
import { TileExercise } from "@/features/learning/ui/exercises/TileExercise";
import { examApi, type LevelUpQuestion, type LevelUpStatus, type SubmitLevelUpResponse } from "../data/examApi";
import styles from "./levelUpTest.module.css";

type Phase = "loading" | "error" | "ready" | "testing" | "submitting" | "result";

const SECTION_LABELS: Record<string, string> = {
  kosakata: "Kosakata",
  tata_bahasa: "Tata Bahasa",
  membaca: "Membaca",
  mendengar: "Mendengar",
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

type ExamAnswer = { answer: string; section: string; skipped?: boolean };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

let questionAudio: HTMLAudioElement | null = null;
/** Audio soal bagian mendengar: URL file biasa, atau /api/tts?text=… untuk suara buatan. */
function playAudio(url: string) {
  questionAudio?.pause();
  questionAudio = new Audio(url);
  void questionAudio.play().catch(() => {});
}

export function LevelUpTest() {
  const router = useRouter();
  const params = useSearchParams();
  const levelId = parseInt(params.get("levelId") ?? "2");

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<LevelUpStatus | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<LevelUpQuestion[]>([]);
  const [kanji, setKanji] = useState<string[]>([]);
  const [timeLimitSec, setTimeLimitSec] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitLevelUpResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load status on mount
  useEffect(() => {
    examApi.getLevelUpStatus(levelId)
      .then(s => { setStatus(s); setPhase("ready"); })
      .catch(() => { setError("Gagal memuat status tes. Coba lagi."); setPhase("error"); });
  }, [levelId]);

  // Timer tick
  useEffect(() => {
    if (phase !== "testing") return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(timerRef.current!);
          void handleSubmit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);  // eslint-disable-line react-hooks/exhaustive-deps

  const startTest = async () => {
    setPhase("loading");
    try {
      const res = await examApi.getLevelUpQuestions(levelId);
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setKanji(res.kanji ?? []);
      const secs = res.timeLimitMin * 60;
      setTimeLimitSec(secs);
      setRemaining(secs);
      setIndex(0);
      setAnswers({});
      setChosen(null);
      setPhase("testing");
    } catch {
      setError("Gagal memuat soal tes. Coba lagi.");
      setPhase("error");
    }
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (phase === "submitting") return;
    setPhase("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    const finalAnswers = Object.entries(answers).map(([questionId, { answer, section, skipped }]) => ({
      questionId, answer, section, skipped,
    }));

    try {
      const res = await examApi.submitLevelUp({ attemptId, answers: finalAnswers, levelId });
      setResult(res);
      setPhase("result");
    } catch {
      setError("Gagal mengirim jawaban. Coba lagi.");
      setPhase("error");
    }
  }, [phase, answers, attemptId, levelId]);

  const pickAnswer = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const q = questions[index];
    setAnswers(prev => ({ ...prev, [q.id]: { answer: opt, section: q.section } }));
  };

  /** Jawaban soal susun/menulis/berbicara masih bisa diubah sampai siswa menekan Lanjut. */
  const setExerciseAnswer = (q: LevelUpQuestion, answer: string, skipped = false) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (answer || skipped) next[q.id] = { answer, section: q.section, skipped };
      else delete next[q.id];
      return next;
    });
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      void handleSubmit();
    } else {
      setIndex(i => i + 1);
      setChosen(null);
    }
  };

  const isLastQ = index + 1 >= questions.length;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const timerDanger = remaining < 120;

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className={styles.wrap}>
        <div className={styles.loadingCenter}>
          <div className={styles.spinner} />
          <p>Memuat tes…</p>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (phase === "error") {
    return (
      <div className={styles.wrap}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Link href="/belajar" className={styles.linkBtn}>← Kembali</Link>
        </div>
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready" && status) {
    const { config, canTake, cooldownUntil, consecutiveFails } = status;
    const cooldownLabel = cooldownUntil ? formatCooldown(new Date(cooldownUntil)) : null;

    return (
      <div className={styles.wrap}>
        <div className={styles.readyCard}>
          <span className={styles.readyBadge}>Tes Naik Tahap</span>
          <h1 className={styles.readyTitle}>Siap untuk tes kenaikan level?</h1>
          <p className={styles.readyDesc}>Tes ini menentukan apakah kamu siap naik ke level berikutnya.</p>

          <ul className={styles.ruleList}>
            <li><strong>{config.questionCount}</strong> soal (pilihan ganda, susun, menulis, dan berbicara)</li>
            <li><strong>{config.timeLimitMin} menit</strong> waktu pengerjaan</li>
            <li>Nilai lulus total: <strong>{config.passScore}%</strong></li>
            <li>Nilai minimum per bagian: <strong>{config.sectionMinScore}%</strong></li>
            <li>Jawaban tidak dapat diubah setelah lanjut</li>
            {config.passScore && <li>Jeda 24 jam setelah tidak lulus</li>}
          </ul>

          {consecutiveFails >= 3 && (
            <p className={styles.warnBox}>⚠️ Sudah {consecutiveFails}× gagal berturut-turut. Pastikan kamu sudah mengulang materi yang lemah.</p>
          )}

          {!canTake && cooldownLabel ? (
            <p className={styles.cooldownBox}>⏳ Bisa ikut tes lagi dalam {cooldownLabel}</p>
          ) : (
            <button className={styles.startBtn} onClick={startTest}>Mulai Tes →</button>
          )}
          <Link href="/belajar" className={styles.backLink}>← Kembali ke daftar bab</Link>
        </div>
      </div>
    );
  }

  // ── TESTING / SUBMITTING ──
  if ((phase === "testing" || phase === "submitting") && questions.length > 0) {
    const q = questions[index];
    const progress = ((index + 1) / questions.length) * 100;
    const isChoice = q.type === "pilihan_ganda" || q.type === "mendengar";
    const current = answers[q.id];
    const answered = isChoice ? !!chosen : !!current?.answer || !!current?.skipped;

    return (
      <div className={styles.wrap}>
        <div className={styles.testHeader}>
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>{index + 1}/{questions.length}</span>
          </div>
          <div className={`${styles.timer} ${timerDanger ? styles.timerDanger : ""}`}>
            ⏱ {pad(min)}:{pad(sec)}
          </div>
        </div>

        <div className={styles.sectionChip}>{SECTION_LABELS[q.section] ?? q.section}</div>

        {isChoice ? <p className={styles.question} lang="ja">{q.question}</p> : <QuestionHeader q={q} />}
        {q.audioUrl && (
          <button type="button" className={styles.audioBtn} onClick={() => playAudio(q.audioUrl ?? "")}>
            <span aria-hidden>🔊</span> Putar audio
          </button>
        )}

        <div key={q.id}>
          {(q.type === "susun_huruf" || q.type === "susun_kalimat") && (
            <TileExercise
              tiles={q.options}
              sentence={q.type === "susun_kalimat"}
              answer={current?.answer ?? null}
              onAnswer={(a) => setExerciseAnswer(q, a)}
              disabled={phase === "submitting"}
            />
          )}
          {q.type === "menulis" && (
            <HandwritingExercise
              slots={q.slots ?? 1}
              script={q.script ?? "campuran"}
              kanji={kanji}
              answer={current?.answer ?? null}
              onAnswer={(a) => setExerciseAnswer(q, a)}
            />
          )}
          {q.type === "berbicara" && (
            <SpeakingExercise
              text={q.speakText ?? ""}
              answer={current?.answer ?? null}
              onAnswer={(a) => setExerciseAnswer(q, a)}
              onSkip={() => setExerciseAnswer(q, "", true)}
              skipped={!!current?.skipped}
            />
          )}
        </div>

        {isChoice && (
        <div className={styles.options}>
          {q.options.map((opt, i) => (
            <button
              key={opt}
              className={`${styles.optionBtn} ${chosen === opt ? styles.optionChosen : ""}`}
              onClick={() => pickAnswer(opt)}
              disabled={!!chosen || phase === "submitting"}
            >
              <span className={styles.optionLabel}>{OPTION_LABELS[i]}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
        )}

        <div className={styles.navRow}>
          <button
            className={styles.nextBtn}
            disabled={!answered || phase === "submitting"}
            onClick={next}
          >
            {phase === "submitting" ? "Menilai…" : isLastQ ? "Kumpulkan →" : "Lanjut →"}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === "result" && result) {
    const { passed, totalScore, sectionScores, cooldownUntil } = result;
    const cooldownLabel = cooldownUntil ? formatCooldown(new Date(cooldownUntil)) : null;

    return (
      <div className={styles.wrap}>
        <div className={styles.resultCard}>
          {passed && <div className={styles.confetti} aria-hidden="true" />}

          <div className={styles.resultEmoji}>{passed ? "🎉" : "😔"}</div>
          <h1 className={styles.resultTitle}>
            {passed ? "Selamat! Kamu Naik Level!" : "Belum Lulus"}
          </h1>

          <div className={`${styles.scoreBig} ${passed ? styles.scorePassed : styles.scoreFailed}`}>
            {totalScore}%
          </div>
          <p className={styles.scoreDesc}>
            {passed
              ? "Kamu berhasil memenuhi syarat untuk naik ke level berikutnya."
              : "Nilai total belum mencapai batas lulus. Jangan menyerah!"}
          </p>

          <div className={styles.sectionBars}>
            <h3 className={styles.sectionTitle}>Nilai per Bagian</h3>
            {Object.entries(sectionScores).map(([sec, score]) => (
              <div key={sec} className={styles.sectionRow}>
                <span className={styles.sectionName}>{SECTION_LABELS[sec] ?? sec}</span>
                <div className={styles.sectionBar}>
                  <div
                    className={`${styles.sectionBarFill} ${score >= 60 ? styles.sectionBarPass : styles.sectionBarFail}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className={`${styles.sectionScore} ${score >= 60 ? styles.sectionScorePass : styles.sectionScoreFail}`}>
                  {score}%
                </span>
              </div>
            ))}
          </div>

          {!passed && cooldownLabel && (
            <p className={styles.cooldownBox}>⏳ Bisa ikut tes lagi dalam {cooldownLabel}</p>
          )}

          <div className={styles.resultActions}>
            {passed ? (
              <Link href="/belajar" className={styles.startBtn}>Lanjut ke Level Baru →</Link>
            ) : (
              <>
                <Link href="/belajar" className={styles.startBtn}>Kembali Latihan</Link>
                {!cooldownLabel && (
                  <button className={styles.retryBtn} onClick={startTest}>Coba Lagi</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function formatCooldown(until: Date): string {
  const diff = until.getTime() - Date.now();
  if (diff <= 0) return "";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}
