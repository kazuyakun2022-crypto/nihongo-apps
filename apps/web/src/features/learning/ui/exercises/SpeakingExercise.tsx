"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeech } from "@/shared/lib/useSpeech";
import { hasKana, toRomaji } from "@/shared/lib/kana";
import { speechMatches } from "../../domain/speechMatch";
import styles from "./exercises.module.css";
import { CheckIcon, MicIcon, StopIcon, VolumeIcon } from "@/shared/ui/icons";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_RECORDING_MS = 15000;
/** Diam selama ini setelah mulai bicara = selesai bicara, rekaman berhenti sendiri. */
const END_SILENCE_MS = 1100;
/** Tidak ada suara sama sekali selama ini sejak mic dibuka = berhenti dan beri tahu. */
const NO_SPEECH_MS = 7000;
const TICK_MS = 50;

type Status = "idle" | "recording" | "processing" | "unavailable";

async function transcribeJapanese(audio: Blob): Promise<string> {
  const res = await fetch("/api/ask/transcribe?lang=ja", {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { code?: string; message?: string } };
  if (res.status === 503) throw Object.assign(new Error(data.error?.message ?? "Pengenalan suara belum tersedia."), { unavailable: true });
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return data.text?.trim() ?? "";
}

/**
 * Berbicara: ketuk mic sekali lalu bicara. Rekaman berhenti sendiri saat siswa diam, transkrip langsung
 * dinilai di layar (aturan sama dengan server), dan bila belum pas cukup ketuk sekali lagi.
 * `feedback={false}` (ujian) hanya menampilkan transkrip tanpa penilaian.
 */
export function SpeakingExercise({
  text,
  variants = [],
  answer,
  onAnswer,
  onSkip,
  skipped,
  feedback = true,
}: {
  text: string;
  variants?: string[];
  answer: string | null;
  onAnswer: (transcript: string) => void;
  onSkip: () => void;
  skipped: boolean;
  feedback?: boolean;
}) {
  const { speak } = useSpeech();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval>>();
  const levelRef = useRef<HTMLSpanElement | null>(null);
  /** Ketukan ganda saat izin mikrofon diminta tidak boleh membuka dua aliran mikrofon. */
  const startingRef = useRef(false);
  const aliveRef = useRef(true);
  /** Berhenti karena tidak ada suara sama sekali: rekaman dibuang, tidak dikirim. */
  const silentStopRef = useRef(false);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    aliveRef.current = true;
    if (typeof window !== "undefined" && (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")) setStatus("unavailable");
    return () => {
      aliveRef.current = false;
      clearTimeout(maxTimerRef.current);
      stopMonitor();
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      releaseMic();
    };
  }, []);

  function stopMonitor() {
    clearInterval(tickRef.current);
    tickRef.current = undefined;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function releaseMic() {
    // Lepas mikrofon begitu selesai merekam (indikator mikrofon di HP ikut mati)
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Pantau volume: ambang = derau ruangan × 2,5; diam setelah bicara atau tidak bicara sama sekali = berhenti. */
  function monitor(stream: MediaStream) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const startedAt = performance.now();
    let floor = 0;
    let floorSamples = 0;
    let loudTicks = 0;
    let speaking = false;
    let quietSince = 0;
    tickRef.current = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (levelRef.current) levelRef.current.style.setProperty("--level", Math.min(1, rms * 12).toFixed(2));
      if (now - startedAt < 300) {
        floor += rms;
        floorSamples++;
        return;
      }
      const threshold = Math.max(0.012, (floor / Math.max(1, floorSamples)) * 2.5);
      if (rms > threshold) {
        loudTicks++;
        quietSince = 0;
        if (loudTicks >= 3) speaking = true;
      } else {
        loudTicks = 0;
        if (speaking) {
          quietSince ||= now;
          if (now - quietSince >= END_SILENCE_MS) stop();
        } else if (now - startedAt >= NO_SPEECH_MS) {
          stop(true);
        }
      }
    }, TICK_MS);
  }

  async function start() {
    if (startingRef.current || recorderRef.current?.state === "recording") return;
    startingRef.current = true;
    setError(null);
    setHeard(false);
    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.");
      setStatus("unavailable");
      return;
    } finally {
      startingRef.current = false;
    }
    if (!aliveRef.current) return releaseMic();
    const stream = streamRef.current;
    const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = async () => {
      stopMonitor();
      releaseMic();
      if (silentStopRef.current) {
        silentStopRef.current = false;
        setStatus("idle");
        setError("Belum terdengar suara. Ketuk mic lalu ucapkan kalimatnya.");
        return;
      }
      setStatus("processing");
      try {
        const transcript = await transcribeJapanese(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
        if (!aliveRef.current) return;
        if (!transcript) setError("Suara tidak terdengar jelas. Ketuk mic dan ucapkan lagi lebih dekat ke mikrofon.");
        else {
          onAnswer(transcript);
          setHeard(true);
        }
        setStatus("idle");
      } catch (err) {
        if (!aliveRef.current) return;
        setError(err instanceof Error ? err.message : "Gagal mengenali suara.");
        setStatus((err as { unavailable?: boolean }).unavailable ? "unavailable" : "idle");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    monitor(stream);
    maxTimerRef.current = setTimeout(() => stop(), MAX_RECORDING_MS);
  }

  function stop(noSpeech = false) {
    clearTimeout(maxTimerRef.current);
    stopMonitor();
    silentStopRef.current = noSpeech;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const matched = answer ? speechMatches(answer, [text, ...variants]) : false;
  const showVerdict = feedback && !!answer && status === "idle";

  return (
    <div className={styles.speakWrap}>
      <div className={styles.speakTarget}>
        <p className={styles.speakText} lang="ja">{text}</p>
        {hasKana(text) && <p className={styles.romaji}>{toRomaji(text)}</p>}
        <button type="button" className={styles.linkBtn} onClick={() => speak(text)}>
          <VolumeIcon size={16} /> Dengarkan contoh
        </button>
      </div>

      {status !== "unavailable" && (
        <button
          type="button"
          className={styles.micBtn}
          data-recording={status === "recording"}
          onClick={status === "recording" ? () => stop() : start}
          disabled={status === "processing"}
          aria-label={status === "recording" ? "Berhenti merekam" : "Mulai bicara"}
        >
          <span aria-hidden className={styles.micIcon}>{status === "recording" ? <StopIcon size={18} /> : <MicIcon size={18} />}</span>
          {status === "recording" ? (
            <>
              Mendengarkan…
              <span ref={levelRef} className={styles.micLevel} aria-hidden />
            </>
          ) : status === "processing" ? (
            "Memeriksa ucapan…"
          ) : answer ? (
            "Ketuk untuk coba lagi"
          ) : (
            "Ketuk lalu bicara"
          )}
        </button>
      )}
      {status === "recording" && <p className={styles.muted}>Rekaman berhenti sendiri saat kamu selesai bicara.</p>}

      {answer && status !== "recording" && (
        <p className={styles.transcript}>
          Terdengar: <span lang="ja">{answer}</span>
        </p>
      )}
      {showVerdict && (
        <p className={styles.speakVerdict} data-ok={matched} role="status">
          {matched ? (
            <>
              <CheckIcon size={16} strokeWidth={3} /> Pas! Ucapanmu sudah sesuai.
            </>
          ) : heard ? (
            "Belum pas. Dengarkan contohnya, lalu ketuk mic untuk mencoba lagi."
          ) : (
            "Belum pas. Ketuk mic untuk mencoba lagi."
          )}
        </p>
      )}
      {error && <p className={styles.errorText}>{error}</p>}

      {status === "unavailable" && !skipped && (
        <button type="button" className={styles.linkBtn} onClick={onSkip}>
          Lewati soal ini (tidak dinilai)
        </button>
      )}
      {skipped && <p className={styles.muted}>Soal ini dilewati dan tidak ikut dinilai.</p>}
    </div>
  );
}
