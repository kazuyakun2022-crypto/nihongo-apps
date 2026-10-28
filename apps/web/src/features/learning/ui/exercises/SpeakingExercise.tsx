"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeech } from "@/shared/lib/useSpeech";
import { hasKana, toRomaji } from "@/shared/lib/kana";
import styles from "./exercises.module.css";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MAX_RECORDING_MS = 15000;

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

/** Berbicara: dengarkan contoh, rekam ucapan, lalu transkripnya menjadi jawaban yang dinilai server. */
export function SpeakingExercise({
  text,
  answer,
  onAnswer,
  onSkip,
  skipped,
}: {
  text: string;
  answer: string | null;
  onAnswer: (transcript: string) => void;
  onSkip: () => void;
  skipped: boolean;
}) {
  const { speak } = useSpeech();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (typeof window !== "undefined" && (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")) setStatus("unavailable");
    return () => {
      clearTimeout(timerRef.current);
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.");
      setStatus("unavailable");
      return;
    }
    const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = async () => {
      setStatus("processing");
      try {
        const transcript = await transcribeJapanese(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
        if (!transcript) setError("Suara tidak terdengar jelas. Coba ucapkan lagi lebih dekat ke mikrofon.");
        else onAnswer(transcript);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal mengenali suara.");
        setStatus((err as { unavailable?: boolean }).unavailable ? "unavailable" : "idle");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
    timerRef.current = setTimeout(stop, MAX_RECORDING_MS);
  }

  function stop() {
    clearTimeout(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  return (
    <div className={styles.speakWrap}>
      <div className={styles.speakTarget}>
        <p className={styles.speakText} lang="ja">{text}</p>
        {hasKana(text) && <p className={styles.romaji}>{toRomaji(text)}</p>}
        <button type="button" className={styles.linkBtn} onClick={() => speak(text)}>
          <span aria-hidden>🔊</span> Dengarkan contoh
        </button>
      </div>

      {status !== "unavailable" && (
        <button
          type="button"
          className={styles.micBtn}
          data-recording={status === "recording"}
          onClick={status === "recording" ? stop : start}
          disabled={status === "processing"}
          aria-label={status === "recording" ? "Berhenti merekam" : "Mulai merekam"}
        >
          <span aria-hidden className={styles.micIcon}>{status === "recording" ? "■" : "🎤"}</span>
          {status === "recording" ? "Selesai bicara" : status === "processing" ? "Mendengarkan…" : answer ? "Rekam ulang" : "Tekan lalu bicara"}
        </button>
      )}

      {answer && status !== "recording" && (
        <p className={styles.transcript}>
          Terdengar: <span lang="ja">{answer}</span>
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
