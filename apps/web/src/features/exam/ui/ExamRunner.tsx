"use client";

import { QuestionAudio } from "@/features/learning/ui/exercises/QuestionAudio";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { QuestionHeader } from "@/features/learning/ui/ChapterLesson";
import { HandwritingExercise } from "@/features/learning/ui/exercises/HandwritingExercise";
import { SpeakingExercise } from "@/features/learning/ui/exercises/SpeakingExercise";
import { TileExercise } from "@/features/learning/ui/exercises/TileExercise";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { examApi, type ExamKind, type ExamQuestion, type ExamStatus, type SubmitExamResponse } from "../data/examApi";
import styles from "./levelUpTest.module.css";
import { AlertIcon, FrownIcon, HourglassIcon, TimerIcon, TrophyIcon } from "@/shared/ui/icons";

/** break = istirahat di antara sesi ujian bersesi (Simulasi JLPT). */
type Phase = "loading" | "error" | "ready" | "testing" | "break" | "submitting" | "submit_failed" | "result";

/** Sesi berwaktu: rentang soal [start, end) dengan batas waktu sendiri. */
interface RunSession {
  key: string;
  title: string;
  minutes: number;
  start: number;
  end: number;
}

/** Garis bawah pada soal ditulis sebagai <u>kata</u> di bank soal; selain tag ini, teks tampil apa adanya. */
export function MarkedText({ text }: { text: string }) {
  const parts = text.split(/<u>(.*?)<\/u>/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <u key={i}>{p}</u> : p))}</>;
}

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


export interface ExamRunnerProps {
  kind: ExamKind;
  levelId: number;
  copy: { badge: string; title: string; desc: string; passedTitle: string; passedDesc: string };
  backHref: string;
  backLabel: string;
  /** Tombol di layar hasil; retry null jika belum boleh mengulang (masih jeda). */
  resultActions: (result: SubmitExamResponse, retry: (() => void) | null) => ReactNode;
  /** Nama bagian pengganti (misalnya istilah JLPT). */
  sectionLabels?: Record<string, string>;
  /** Isi tambahan di layar hasil, di bawah nilai per bagian. */
  resultExtra?: (result: SubmitExamResponse) => ReactNode;
  /** Boleh mengulang walau sudah lulus (latihan). */
  retryAfterPass?: boolean;
  /** Tata letak lebih lebar (simulasi dengan pembahasan panjang). */
  wide?: boolean;
  /** Pengganti daftar aturan di layar sebelum mulai. */
  rules?: (status: ExamStatus) => ReactNode;
  /** Pengganti nilai besar dan nilai per bagian di layar hasil. */
  resultBody?: (result: SubmitExamResponse) => ReactNode;
}

/** Alur tes bersama untuk tes naik tahap dan tes penempatan: aturan → soal berwaktu → hasil. */
export function ExamRunner({ kind, levelId, copy, backHref, backLabel, resultActions, sectionLabels, resultExtra, retryAfterPass, wide, rules, resultBody }: ExamRunnerProps) {
  const wrapClass = wide ? `${styles.wrap} ${styles.wrapWide}` : styles.wrap;
  const labelOf = (sec: string) => sectionLabels?.[sec] ?? SECTION_LABELS[sec] ?? sec;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [kanji, setKanji] = useState<string[]>([]);
  const [timeLimitSec, setTimeLimitSec] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitExamResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Waktu berakhir sesi atau istirahat yang sedang berjalan (ms). Sisa waktu dihitung dari sini, bukan dikurangi
   *  per detik: HP memperlambat setInterval saat tab di latar belakang, sehingga hitungan mundur dulu meleset. */
  const deadlineRef = useRef(0);
  /** Sesi berwaktu; tes tanpa sesi diperlakukan sebagai satu sesi utuh. */
  const [sessions, setSessions] = useState<RunSession[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const sessionIdxRef = useRef(0);
  sessionIdxRef.current = sessionIdx;
  const sessionsRef = useRef<RunSession[]>([]);
  sessionsRef.current = sessions;
  const breakMinutesRef = useRef(0);
  breakMinutesRef.current = breakMinutes;

  // Load status on mount
  useEffect(() => {
    examApi.getStatus(kind, levelId)
      .then(s => { setStatus(s); setPhase("ready"); })
      .catch(() => { setError("Gagal memuat status tes. Coba lagi."); setPhase("error"); });
  }, [kind, levelId]);

  // Timer tick: sesi yang habis waktunya pindah ke istirahat (atau dikumpulkan bila sesi terakhir),
  // istirahat yang habis langsung memulai sesi berikutnya
  useEffect(() => {
    if (phase !== "testing" && phase !== "break") return;
    let done = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !done) {
        done = true;
        if (timerRef.current) clearInterval(timerRef.current);
        if (phase === "break") startSession(sessionIdxRef.current + 1);
        else if (sessionIdxRef.current + 1 < sessionsRef.current.length) enterBreak();
        // Pakai handleSubmit terbaru agar jawaban yang sudah diisi ikut terkirim
        else void submitRef.current(true);
      }
    };
    timerRef.current = setInterval(tick, 1000);
    // Kembali dari latar belakang: sisa waktu langsung disesuaikan
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);  // eslint-disable-line react-hooks/exhaustive-deps

  const startTest = async () => {
    setPhase("loading");
    try {
      const res = await examApi.getQuestions(kind, levelId);
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setKanji(res.kanji ?? []);
      const secs = res.timeLimitMin * 60;
      setTimeLimitSec(secs);
      // Server mengirim soal berurutan per sesi; sesi tanpa soal dilewati
      const runSessions: RunSession[] = [];
      for (const s of res.jlpt?.sessions ?? []) {
        const idx = res.questions.flatMap((q, i) => (q.session === s.key ? [i] : []));
        if (idx.length) runSessions.push({ key: s.key, title: s.title, minutes: s.minutes, start: idx[0], end: idx[idx.length - 1] + 1 });
      }
      const all = runSessions.length ? runSessions : [{ key: "all", title: "", minutes: res.timeLimitMin, start: 0, end: res.questions.length }];
      setSessions(all);
      sessionsRef.current = all;
      setBreakMinutes(res.jlpt?.breakMinutes ?? 0);
      setSessionIdx(0);
      deadlineRef.current = Date.now() + all[0].minutes * 60_000;
      setRemaining(all[0].minutes * 60);
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
      const res = await examApi.submit(kind, { attemptId, answers: finalAnswers, levelId });
      setResult(res);
      setPhase("result");
    } catch {
      // Jawaban tetap disimpan di layar supaya bisa dikirim ulang (sebelumnya seluruh percobaan hilang)
      setError("Jawabanmu belum terkirim. Periksa koneksi internet, lalu kirim ulang.");
      setPhase("submit_failed");
    }
  }, [phase, answers, attemptId, kind, levelId]);

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  const pickAnswer = (opt: string) => {
    if (chosen) return;
    setChosen(opt);
    const q = questions[index];
    setAnswers(prev => ({ ...prev, [q.id]: { answer: opt, section: q.section } }));
  };

  /** Jawaban soal susun/menulis/berbicara masih bisa diubah sampai siswa menekan Lanjut. */
  const setExerciseAnswer = (q: ExamQuestion, answer: string, skipped = false) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (answer || skipped) next[q.id] = { answer, section: q.section, skipped };
      else delete next[q.id];
      return next;
    });
  };

  function enterBreak() {
    deadlineRef.current = Date.now() + breakMinutesRef.current * 60_000;
    setRemaining(breakMinutesRef.current * 60);
    setPhase("break");
  }

  function startSession(i: number) {
    const s = sessionsRef.current[i];
    if (!s) return;
    setSessionIdx(i);
    setIndex(s.start);
    setChosen(null);
    deadlineRef.current = Date.now() + s.minutes * 60_000;
    setRemaining(s.minutes * 60);
    setPhase("testing");
  }

  const session = sessions[sessionIdx];
  const sessionEnd = session?.end ?? questions.length;
  const hasNextSession = sessionIdx + 1 < sessions.length;

  const next = () => {
    if (index + 1 < sessionEnd) {
      setIndex(i => i + 1);
      setChosen(null);
    } else if (hasNextSession) {
      enterBreak();
    } else {
      void handleSubmit();
    }
  };

  const isLastQ = index + 1 >= sessionEnd;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const timerDanger = remaining < 120;

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <SkeletonRegion label="Memuat tes…" className={wrapClass}>
        <div className={styles.readyCard}>
          <Skeleton width="7rem" height="1.5rem" radius="var(--radius-pill)" />
          <Skeleton width="80%" height="1.75rem" />
          <SkeletonText lines={2} />
          <SkeletonText lines={5} lastWidth="45%" />
          <Skeleton height="3rem" radius="var(--radius-pill)" />
        </div>
      </SkeletonRegion>
    );
  }

  // ── GAGAL MENGIRIM: jawaban masih ada, bisa dikirim ulang ──
  if (phase === "submit_failed") {
    return (
      <div className={wrapClass}>
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <p>{Object.keys(answers).length} jawaban masih tersimpan di perangkat ini.</p>
          <Button onClick={() => void handleSubmit()}>Kirim ulang</Button>
        </div>
      </div>
    );
  }

  // ── ERROR ──
  if (phase === "error") {
    return (
      <div className={wrapClass}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Link href={backHref} className={styles.linkBtn}>← Kembali</Link>
        </div>
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready" && status) {
    const { config, canTake, cooldownUntil, consecutiveFails } = status;
    const cooldownLabel = cooldownUntil ? formatCooldown(new Date(cooldownUntil)) : null;

    return (
      <div className={wrapClass}>
        <div className={styles.readyCard}>
          <span className={styles.readyBadge}>{copy.badge}</span>
          <h1 className={styles.readyTitle}>{copy.title}</h1>
          <p className={styles.readyDesc}>{copy.desc}</p>

          {rules ? rules(status) : (
          <ul className={styles.ruleList}>
            <li><strong>{config.questionCount}</strong> soal (pilihan ganda, susun, menulis, dan berbicara)</li>
            <li><strong>{config.timeLimitMin} menit</strong> waktu pengerjaan</li>
            <li>Nilai lulus total: <strong>{config.passScore}%</strong></li>
            {config.sectionRules ? (
              Object.entries(config.sectionRules).map(([sec, r]) => (
                <li key={sec}>
                  {labelOf(sec)}: <strong>{r?.count} soal</strong>, nilai minimal {r?.minScore}%
                </li>
              ))
            ) : (
              config.sectionMinScore > 0 && <li>Nilai minimum per bagian: <strong>{config.sectionMinScore}%</strong></li>
            )}
            <li>Jawaban tidak dapat diubah setelah lanjut</li>
            {config.cooldownHours > 0 && <li>Jeda {config.cooldownHours} jam setelah tidak lulus</li>}
          </ul>
          )}

          {consecutiveFails >= 3 && (
            <p className={styles.warnBox}><AlertIcon size={16} /> Sudah {consecutiveFails}× gagal berturut-turut. Pastikan kamu sudah mengulang materi yang lemah.</p>
          )}

          {!canTake && cooldownLabel ? (
            <p className={styles.cooldownBox}><HourglassIcon size={16} /> Bisa ikut tes lagi dalam {cooldownLabel}</p>
          ) : (
            <button className={styles.startBtn} onClick={startTest}>Mulai Tes →</button>
          )}
          <Link href={backHref} className={styles.backLink}>← {backLabel}</Link>
        </div>
      </div>
    );
  }

  // ── ISTIRAHAT DI ANTARA SESI ──
  if (phase === "break" && session) {
    const nextSession = sessions[sessionIdx + 1];
    const done = questions.slice(session.start, session.end);
    const answeredCount = done.filter((x) => answers[x.id]).length;
    return (
      <div className={wrapClass}>
        <div className={styles.readyCard} role="status">
          <span className={styles.readyBadge}>Sesi {sessionIdx + 1} dari {sessions.length} selesai</span>
          <h1 className={styles.readyTitle}>Istirahat sebentar</h1>
          <p className={styles.readyDesc}>
            {session.title}: {answeredCount} dari {done.length} soal dijawab. Jawaban sesi ini sudah dikunci.
          </p>
          {nextSession && (
            <ul className={styles.ruleList}>
              <li>
                Berikutnya: <strong>{nextSession.title}</strong>
              </li>
              <li>
                {nextSession.end - nextSession.start} soal, <strong>{nextSession.minutes} menit</strong>
              </li>
              <li>
                Sesi berikutnya mulai otomatis dalam{" "}
                <strong>
                  {pad(min)}:{pad(sec)}
                </strong>
              </li>
            </ul>
          )}
          <button className={styles.startBtn} onClick={() => startSession(sessionIdx + 1)}>
            Mulai sesi {sessionIdx + 2} →
          </button>
        </div>
      </div>
    );
  }

  // ── TESTING / SUBMITTING ──
  if ((phase === "testing" || phase === "submitting") && questions.length > 0) {
    const q = questions[index];
    const sessionStart = session?.start ?? 0;
    const sessionTotal = sessionEnd - sessionStart;
    const progress = ((index - sessionStart + 1) / sessionTotal) * 100;
    const isChoice = q.type === "pilihan_ganda" || q.type === "mendengar";
    const current = answers[q.id];
    const answered = isChoice ? !!chosen : !!current?.answer || !!current?.skipped;
    const sameSection = questions.filter((x) => x.section === q.section);
    const sectionPos = { at: sameSection.indexOf(q) + 1, of: sameSection.length };
    const multiSession = sessions.length > 1;

    return (
      <div className={wrapClass}>
        <div className={styles.testHeader}>
          <div className={styles.progressWrap}>
            {multiSession && (
              <span className={styles.sessionLabel}>
                Sesi {sessionIdx + 1}/{sessions.length} · {session?.title}
              </span>
            )}
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {index - sessionStart + 1}/{sessionTotal}
              {multiSession && ` · soal ${index + 1} dari ${questions.length}`}
            </span>
          </div>
          <div
            className={`${styles.timer} ${timerDanger ? styles.timerDanger : ""}`}
            aria-label={`Sisa waktu ${multiSession ? "sesi " : ""}${min} menit ${sec} detik`}
          >
            <TimerIcon size={16} /> {pad(min)}:{pad(sec)}
          </div>
        </div>

        <div className={styles.sectionChip}>
          {labelOf(q.section)} · {sectionPos.at}/{sectionPos.of}
        </div>

        {q.passage && (
          <div className={styles.passage} lang="ja" tabIndex={0} aria-label="Teks bacaan">
            {q.passage}
          </div>
        )}

        {isChoice ? (
          <p className={styles.question} lang="ja">
            <MarkedText text={q.question} />
          </p>
        ) : (
          <QuestionHeader q={q} />
        )}
        {q.audioUrl && (
          // Key harus beda dari kotak soal di bawah: key kembar membuat React tidak membuang tombol audio lama
          <QuestionAudio key={`audio-${q.id}`} url={q.audioUrl} className={styles.audioBtn} />
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
              feedback={false}
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
            {phase === "submitting" ? "Menilai…" : !isLastQ ? "Lanjut →" : hasNextSession ? "Selesai sesi →" : "Kumpulkan →"}
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
      <div className={wrapClass}>
        <div className={styles.resultCard}>
          {passed && <div className={styles.confetti} aria-hidden="true" />}

          <div className={styles.resultEmoji} data-passed={passed || undefined} aria-hidden="true">
            {passed ? <TrophyIcon size={44} strokeWidth={1.6} /> : <FrownIcon size={44} strokeWidth={1.6} />}
          </div>
          <h1 className={styles.resultTitle}>
            {passed ? copy.passedTitle : "Belum Lulus"}
          </h1>

          {resultBody ? resultBody(result) : (
          <>
          <div className={`${styles.scoreBig} ${passed ? styles.scorePassed : styles.scoreFailed}`}>
            {totalScore}%
          </div>
          <p className={styles.scoreDesc}>
            {passed
              ? copy.passedDesc
              : result.late
                ? "Jawaban terkirim melewati batas waktu, jadi belum bisa dinyatakan lulus."
                : totalScore >= (status?.config.passScore ?? 0)
                  ? "Nilai total sudah cukup, tapi ada bagian yang di bawah nilai minimal. Latih bagian itu lagi!"
                  : "Nilai total belum mencapai batas lulus. Jangan menyerah!"}
          </p>

          <div className={styles.sectionBars}>
            <h3 className={styles.sectionTitle}>Nilai per Bagian</h3>
            {Object.entries(sectionScores).map(([sec, score]) => {
              const min = result.sectionMinScores?.[sec] ?? status?.config.sectionMinScore ?? 0;
              return (
                <div key={sec} className={styles.sectionRow}>
                  <span className={styles.sectionName}>
                    {labelOf(sec)} <small>(min. {min}%)</small>
                  </span>
                  <div className={styles.sectionBar}>
                    <div
                      className={`${styles.sectionBarFill} ${score >= min ? styles.sectionBarPass : styles.sectionBarFail}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`${styles.sectionScore} ${score >= min ? styles.sectionScorePass : styles.sectionScoreFail}`}>
                    {score}%
                  </span>
                </div>
              );
            })}
          </div>
          </>
          )}

          {resultExtra?.(result)}

          {!passed && cooldownLabel && (
            <p className={styles.cooldownBox}><HourglassIcon size={16} /> Bisa ikut tes lagi dalam {cooldownLabel}</p>
          )}

          <div className={styles.resultActions}>
            {resultActions(result, cooldownLabel || (passed && !retryAfterPass) ? null : startTest)}
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
