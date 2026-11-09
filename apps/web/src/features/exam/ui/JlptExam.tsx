"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLayerBack } from "@/shared/lib/useLayerBack";
import { QuestionAudio } from "@/features/learning/ui/exercises/QuestionAudio";
import { Skeleton, SkeletonRegion, SkeletonText } from "@/shared/ui/Skeleton";
import { askConfirm } from "@/shared/ui/confirmDialog";
import { ArrowLeftIcon, ArrowRightIcon, FlagIcon, FrownIcon, HourglassIcon, ListChecksIcon, TimerIcon, TrophyIcon } from "@/shared/ui/icons";
import { examApi, type ExamQuestion, type ExamStatus, type SubmitExamResponse } from "../data/examApi";
import { JLPT_DAIMON, JLPT_SECTION_LABELS, SimulationReview, SimulationRules, SimulationScore } from "./JlptResult";
import { MarkedText } from "./MarkedText";
import runnerStyles from "./levelUpTest.module.css";
import styles from "./jlptExam.module.css";

type Phase = "loading" | "error" | "ready" | "testing" | "break" | "submitting" | "submit_failed" | "result";

/** Sesi berwaktu: rentang soal [start, end) dengan batas waktu sendiri. */
interface RunSession {
  key: string;
  title: string;
  minutes: number;
  start: number;
  end: number;
}

/** Nomor pilihan seperti lembar jawaban JLPT. */
const MARKS = ["1", "2", "3", "4", "5", "6"];

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (secs: number) => `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;

/**
 * Layar Simulasi JLPT bergaya ujian resmi: sesi berwaktu sendiri-sendiri, lembar jawaban bulat (OMR),
 * bebas pindah soal dan mengganti jawaban dalam satu sesi, serta tanda "ragu".
 * Jawaban satu sesi dikunci saat sesi diakhiri atau waktunya habis.
 */
export function JlptExam({ levelId, paket, backHref }: { levelId: number; paket: number | null; backHref: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ExamStatus | null>(null);
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [sessions, setSessions] = useState<RunSession[]>([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [result, setResult] = useState<SubmitExamResponse | null>(null);

  // ── LAYER BACK HANDLERS ──
  useLayerBack(sheetOpen, () => setSheetOpen(false), "jlpt-sheet");
  useLayerBack(
    phase === "testing",
    () => {
      if (window.confirm("Keluar dari simulasi JLPT? Jawaban sesi ini tidak akan tersimpan.")) {
        window.location.href = backHref;
      }
    },
    "jlpt-testing"
  );
  /** Akhir sesi/istirahat yang sedang berjalan (ms). Sisa waktu dihitung dari sini, bukan dikurangi per detik,
   *  karena HP memperlambat setInterval saat tab di latar belakang. */
  const deadlineRef = useRef(0);
  const questionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase("loading");
    examApi
      .getStatus("jlpt-sim", levelId, paket)
      .then((s) => {
        setStatus(s);
        setPhase("ready");
      })
      .catch(() => {
        setError(paket ? `Paket ${paket} belum tersedia untuk level ini.` : "Gagal memuat simulasi. Coba lagi.");
        setPhase("error");
      });
  }, [levelId, paket]);

  const session = sessions[sessionIdx];
  const hasNextSession = sessionIdx + 1 < sessions.length;
  const sessionQuestions = useMemo(() => (session ? questions.slice(session.start, session.end) : []), [questions, session]);

  const submit = useCallback(async () => {
    setPhase("submitting");
    try {
      const res = await examApi.submit("jlpt-sim", {
        attemptId,
        levelId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
      });
      setResult(res);
      setPhase("result");
      window.scrollTo({ top: 0 });
    } catch {
      // Jawaban tetap disimpan di layar supaya bisa dikirim ulang
      setError("Jawabanmu belum terkirim. Periksa koneksi internet, lalu kirim ulang.");
      setPhase("submit_failed");
    }
  }, [answers, attemptId, levelId]);

  const startSession = useCallback((i: number, list: RunSession[]) => {
    const s = list[i];
    if (!s) return;
    setSessionIdx(i);
    setIndex(s.start);
    deadlineRef.current = Date.now() + s.minutes * 60_000;
    setRemaining(s.minutes * 60);
    setPhase("testing");
    window.scrollTo({ top: 0 });
  }, []);

  /** Tutup sesi: masuk istirahat, atau kumpulkan bila ini sesi terakhir. */
  const finishSession = useCallback(() => {
    if (hasNextSession) {
      deadlineRef.current = Date.now() + breakMinutes * 60_000;
      setRemaining(breakMinutes * 60);
      setPhase("break");
      setSheetOpen(false);
      window.scrollTo({ top: 0 });
    } else {
      void submit();
    }
  }, [breakMinutes, hasNextSession, submit]);

  // Pakai versi terbaru di dalam timer (jawaban terakhir ikut terkirim)
  const finishRef = useRef(finishSession);
  finishRef.current = finishSession;
  const startRef = useRef(() => startSession(sessionIdx + 1, sessions));
  startRef.current = () => startSession(sessionIdx + 1, sessions);

  // Hitung mundur sesi atau istirahat; habis = sesi dikunci / sesi berikutnya dimulai otomatis
  useEffect(() => {
    if (phase !== "testing" && phase !== "break") return;
    let done = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !done) {
        done = true;
        if (phase === "break") startRef.current();
        else finishRef.current();
      }
    };
    const t = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);

  async function start() {
    setPhase("loading");
    try {
      const res = await examApi.getQuestions("jlpt-sim", levelId, paket);
      const list: RunSession[] = [];
      for (const s of res.jlpt?.sessions ?? []) {
        const idx = res.questions.flatMap((q, i) => (q.session === s.key ? [i] : []));
        if (idx.length) list.push({ key: s.key, title: s.title, minutes: s.minutes, start: idx[0], end: idx[idx.length - 1] + 1 });
      }
      if (!list.length) list.push({ key: "all", title: "Ujian", minutes: res.timeLimitMin, start: 0, end: res.questions.length });
      setAttemptId(res.attemptId);
      setQuestions(res.questions);
      setSessions(list);
      setBreakMinutes(res.jlpt?.breakMinutes ?? 0);
      setAnswers({});
      setFlagged({});
      setResult(null);
      startSession(0, list);
    } catch {
      setError("Gagal memuat soal simulasi. Coba lagi.");
      setPhase("error");
    }
  }

  function goTo(i: number) {
    if (!session) return;
    setIndex(Math.min(session.end - 1, Math.max(session.start, i)));
    setSheetOpen(false);
    // Fokus ke soal supaya pembaca layar dan keyboard langsung berada di soal yang dipilih
    requestAnimationFrame(() => questionRef.current?.focus({ preventScroll: false }));
  }

  async function confirmFinish() {
    const unanswered = sessionQuestions.filter((q) => !answers[q.id]).length;
    const doubt = sessionQuestions.filter((q) => flagged[q.id]).length;
    const parts = [
      unanswered ? `${unanswered} soal belum dijawab (dihitung salah)` : "",
      doubt ? `${doubt} soal masih ditandai ragu` : "",
    ].filter(Boolean);
    const ok = await askConfirm({
      title: hasNextSession ? `Akhiri sesi ${sessionIdx + 1}?` : "Kumpulkan ujian?",
      description: `${parts.length ? `${parts.join(" dan ")}. ` : ""}Jawaban sesi ini tidak bisa diubah lagi setelahnya.`,
      confirmText: hasNextSession ? "Akhiri sesi" : "Kumpulkan",
      cancelText: "Kembali ke soal",
      tone: "primary",
    });
    if (ok) finishSession();
  }

  // Pintasan keyboard saat mengerjakan: 1-4 memilih jawaban, panah kiri/kanan pindah soal, R menandai ragu
  useEffect(() => {
    if (phase !== "testing") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || target?.closest("input, textarea, select, [role=dialog]")) return;
      const q = questions[index];
      if (!q) return;
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) setAnswers((a) => ({ ...a, [q.id]: q.options[n - 1] }));
      else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key.toLowerCase() === "r") setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const title = `JLPT ${status?.level?.code ?? ""}${paket ? ` · Paket ${pad(paket)}` : " · Paket acak"}`;

  // ── MEMUAT ──
  if (phase === "loading") {
    return (
      <SkeletonRegion label="Memuat simulasi…" className={styles.narrow}>
        <div className={runnerStyles.readyCard}>
          <Skeleton width="7rem" height="1.5rem" radius="var(--radius-pill)" />
          <Skeleton width="80%" height="1.75rem" />
          <SkeletonText lines={4} lastWidth="45%" />
          <Skeleton height="3rem" radius="var(--radius-pill)" />
        </div>
      </SkeletonRegion>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.narrow}>
        <div className={runnerStyles.errorBox} role="alert">
          <p>{error}</p>
          <Link href={backHref} className={runnerStyles.linkBtn}>← Pilih paket lain</Link>
        </div>
      </div>
    );
  }

  if (phase === "submit_failed") {
    return (
      <div className={styles.narrow}>
        <div className={runnerStyles.errorBox} role="alert">
          <p>{error}</p>
          <p>{Object.keys(answers).length} jawaban masih tersimpan di perangkat ini.</p>
          <button type="button" className={runnerStyles.startBtn} onClick={() => void submit()}>Kirim ulang</button>
        </div>
      </div>
    );
  }

  // ── ATURAN SEBELUM MULAI ──
  if (phase === "ready" && status) {
    const cooldown = status.cooldownUntil && !status.canTake ? new Date(status.cooldownUntil) : null;
    return (
      <div className={styles.wide}>
        <div className={runnerStyles.readyCard}>
          <span className={runnerStyles.readyBadge}>{title}</span>
          <h1 className={runnerStyles.readyTitle}>Siap mengerjakan simulasi?</h1>
          <p className={runnerStyles.readyDesc}>
            {status.config.questionCount} soal. Kerjakan seperti hari ujian: siapkan waktu tanpa gangguan dan headphone untuk sesi Choukai.
          </p>
          <SimulationRules status={status} />
          {cooldown ? (
            <p className={runnerStyles.cooldownBox}>
              <HourglassIcon size={16} /> Bisa diulang lagi pukul {cooldown.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : (
            <button type="button" className={runnerStyles.startBtn} onClick={() => void start()}>
              Mulai ujian
            </button>
          )}
          <Link href={backHref} className={runnerStyles.backLink}>← Pilih paket lain</Link>
        </div>
      </div>
    );
  }

  // ── ISTIRAHAT ──
  if (phase === "break" && session) {
    const next = sessions[sessionIdx + 1];
    const answered = sessionQuestions.filter((q) => answers[q.id]).length;
    return (
      <div className={styles.narrow}>
        <div className={runnerStyles.readyCard} role="status">
          <span className={runnerStyles.readyBadge}>Sesi {sessionIdx + 1} dari {sessions.length} selesai</span>
          <h1 className={runnerStyles.readyTitle}>Istirahat sebentar</h1>
          <p className={runnerStyles.readyDesc}>
            {session.title}: {answered} dari {sessionQuestions.length} soal dijawab. Jawaban sesi ini sudah dikunci.
          </p>
          {next && (
            <ul className={runnerStyles.ruleList}>
              <li>Berikutnya: <strong>{next.title}</strong></li>
              <li>{next.end - next.start} soal, <strong>{next.minutes} menit</strong></li>
              <li>Mulai otomatis dalam <strong>{clock(remaining)}</strong></li>
            </ul>
          )}
          <button type="button" className={runnerStyles.startBtn} onClick={() => startSession(sessionIdx + 1, sessions)}>
            Mulai sesi {sessionIdx + 2}
          </button>
        </div>
      </div>
    );
  }

  // ── HASIL ──
  if (phase === "result" && result) {
    return (
      <div className={styles.wide}>
        <div className={runnerStyles.resultCard}>
          {result.passed && <div className={runnerStyles.confetti} aria-hidden="true" />}
          <div className={runnerStyles.resultEmoji} data-passed={result.passed || undefined} aria-hidden="true">
            {result.passed ? <TrophyIcon size={44} strokeWidth={1.6} /> : <FrownIcon size={44} strokeWidth={1.6} />}
          </div>
          <h1 className={runnerStyles.resultTitle}>{result.passed ? "Lulus simulasi!" : "Belum lulus"}</h1>
          <p className={styles.resultSub}>{title}</p>
          <SimulationScore result={result} />
          <SimulationReview result={result} />
          <div className={runnerStyles.resultActions}>
            <Link href={backHref} className={runnerStyles.startBtn}>Pilih paket lain</Link>
            {!result.cooldownUntil && (
              <button type="button" className={runnerStyles.retryBtn} onClick={() => void start()}>
                Ulangi paket ini
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MENGERJAKAN ──
  if ((phase === "testing" || phase === "submitting") && session && questions[index]) {
    const q = questions[index];
    const posInSession = index - session.start;
    const chosen = answers[q.id];
    const answeredCount = sessionQuestions.filter((x) => answers[x.id]).length;
    const doubtCount = sessionQuestions.filter((x) => flagged[x.id]).length;
    // Nomor Daimon (問題 1, 2, …) mengikuti urutan tipe soal di dalam sesi, seperti kertas ujian
    const daimonOrder = [...new Set(sessionQuestions.map((x) => x.category ?? x.section))];
    const daimonNo = daimonOrder.indexOf(q.category ?? q.section) + 1;
    const daimon = q.category ? JLPT_DAIMON[q.category] : undefined;
    const danger = remaining < 120;
    const busy = phase === "submitting";

    return (
      <div className={styles.exam}>
        <header className={styles.bar}>
          <div className={styles.barTitle}>
            <strong>{title}</strong>
            <span>
              Sesi {sessionIdx + 1}/{sessions.length} · {session.title}
            </span>
          </div>
          <div className={`${styles.timer} ${danger ? styles.timerDanger : ""}`} role="timer" aria-label={`Sisa waktu sesi ${clock(remaining)}`}>
            <TimerIcon size={16} />
            <span>{clock(remaining)}</span>
            <span className={styles.timerTotal}>/ {pad(session.minutes)}:00</span>
          </div>
        </header>

        <div className={styles.layout}>
          <section className={styles.paper} aria-label="Soal">
            <div className={styles.daimon}>
              <span className={styles.daimonNo} lang="ja">問題{daimonNo}</span>
              <span className={styles.daimonName}>
                {daimon ? (
                  <>
                    <span lang="ja">{daimon.ja}</span> · {daimon.id}
                  </>
                ) : (
                  JLPT_SECTION_LABELS[q.section] ?? q.section
                )}
              </span>
            </div>

            <div className={styles.qHead}>
              <span className={styles.qCount}>
                Soal {posInSession + 1} dari {sessionQuestions.length}
              </span>
              <button
                type="button"
                className={`${styles.flagBtn} ${flagged[q.id] ? styles.flagOn : ""}`}
                aria-pressed={!!flagged[q.id]}
                onClick={() => setFlagged((f) => ({ ...f, [q.id]: !f[q.id] }))}
              >
                <FlagIcon size={15} /> {flagged[q.id] ? "Ditandai ragu" : "Tandai ragu"}
              </button>
            </div>

            <div ref={questionRef} tabIndex={-1} className={styles.qBody}>
              {q.passage && (
                <div className={styles.passage} lang="ja" tabIndex={0} aria-label="Teks bacaan">
                  {q.passage}
                </div>
              )}
              {q.audioUrl && <QuestionAudio key={`audio-${q.id}`} url={q.audioUrl} className={runnerStyles.audioBtn} />}
              <p className={styles.question} lang="ja">
                <span className={styles.qNo}>{posInSession + 1}</span>
                <MarkedText text={q.question} />
              </p>

              <div className={styles.options} role="radiogroup" aria-label={`Pilihan jawaban soal ${posInSession + 1}`}>
                {q.options.map((opt, i) => (
                  <button
                    key={`${q.id}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={chosen === opt}
                    className={`${styles.option} ${chosen === opt ? styles.optionOn : ""}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    disabled={busy}
                  >
                    <span className={styles.mark} aria-hidden="true">{MARKS[i]}</span>
                    <span lang="ja">{opt}</span>
                  </button>
                ))}
              </div>
            </div>

            <nav className={styles.nav} aria-label="Pindah soal">
              <button type="button" className={styles.navBtn} onClick={() => goTo(index - 1)} disabled={index <= session.start || busy}>
                <ArrowLeftIcon size={16} />
                <span className={styles.long}>Sebelumnya</span>
                <span className={styles.short}>Kembali</span>
              </button>
              <button type="button" className={styles.sheetToggle} onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen}>
                <ListChecksIcon size={16} /> {answeredCount}/{sessionQuestions.length}
              </button>
              {index + 1 < session.end ? (
                <button type="button" className={`${styles.navBtn} ${styles.navNext}`} onClick={() => goTo(index + 1)} disabled={busy}>
                  <span className={styles.long}>Berikutnya</span>
                  <span className={styles.short}>Lanjut</span>
                  <ArrowRightIcon size={16} />
                </button>
              ) : (
                <button type="button" className={`${styles.navBtn} ${styles.navFinish}`} onClick={() => void confirmFinish()} disabled={busy}>
                  {busy ? "Menilai…" : hasNextSession ? "Akhiri sesi" : "Kumpulkan"}
                </button>
              )}
            </nav>
          </section>

          <aside className={`${styles.sheet} ${sheetOpen ? styles.sheetOpen : ""}`} aria-label="Lembar jawaban">
            <div className={styles.sheetHead}>
              <h2>Lembar jawaban</h2>
              <span>
                Dijawab {answeredCount}/{sessionQuestions.length}
                {doubtCount > 0 && ` · Ragu ${doubtCount}`}
              </span>
            </div>
            <ol className={styles.omr}>
              {sessionQuestions.map((x, i) => {
                const picked = answers[x.id];
                const pickedIdx = picked ? x.options.indexOf(picked) : -1;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      className={`${styles.omrRow} ${x.id === q.id ? styles.omrCurrent : ""} ${flagged[x.id] ? styles.omrFlag : ""}`}
                      onClick={() => goTo(session.start + i)}
                      aria-current={x.id === q.id ? "step" : undefined}
                      aria-label={`Soal ${i + 1}: ${pickedIdx >= 0 ? `dijawab ${pickedIdx + 1}` : "belum dijawab"}${flagged[x.id] ? ", ditandai ragu" : ""}`}
                    >
                      <span className={styles.omrNo}>{pad(i + 1)}</span>
                      <span className={styles.bubbles} aria-hidden="true">
                        {x.options.map((_, j) => (
                          <span key={j} className={`${styles.bubble} ${j === pickedIdx ? styles.bubbleOn : ""}`}>
                            {MARKS[j]}
                          </span>
                        ))}
                      </span>
                      {flagged[x.id] && <FlagIcon size={12} className={styles.omrFlagIcon} />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <button type="button" className={styles.finishBtn} onClick={() => void confirmFinish()} disabled={busy}>
              {hasNextSession ? `Akhiri sesi ${sessionIdx + 1}` : "Kumpulkan ujian"}
            </button>
            <p className={styles.keys}>Pintasan: tombol 1–4 memilih jawaban, panah kiri/kanan pindah soal, R menandai ragu.</p>
          </aside>
        </div>
      </div>
    );
  }

  return null;
}
